import { createHash } from "node:crypto";
import { generateJSON, isQuotaError } from "@/lib/ai";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { scrape, search } from "./firecrawl";
import { STAGES, SECTORS } from "@/lib/types";
import { domainOf, isSharedHost as isShared } from "./hosts";

/**
 * Discovery: finds programs we don't track yet.
 *  - directory sources: listing pages (Startup India, MeitY, BIRAC, Unstop…), re-read when they change
 *  - search sources: daily web + news searches limited to the past week
 * Every find is deduplicated against known programs and earlier finds, then queued as a
 * `program_candidates` row for an admin to approve. Nothing is published automatically.
 */

interface Found {
  name: string; organisation?: string; url: string; type?: string; summary?: string;
  stages_accepted?: string[]; sectors?: string[]; what_they_look_for?: string[];
  deadline?: string | null; quote?: string; confidence?: number;
}
export interface DiscoverySummary { sources: number; unchanged: number; found: number; queued: number; duplicates: number; errors: { source: string; error: string }[] }

const TYPES = ["grant", "incubator", "accelerator", "competition", "investor"];

const SYSTEM = `You find startup opportunities for college student founders and early-stage founders in India: incubators, pre-incubation, accelerators, grants, fellowships, government challenges, business-plan competitions, ideathons and hackathons with a startup track.

From the content provided, list each DISTINCT, SPECIFIC opportunity (a named program someone can apply to). Ignore news about funding rounds, generic articles, job posts, courses, events without an application, and anything not open to India-based founders.

Return ONLY JSON: {"opportunities":[{
  "name": string, "organisation": string,
  "url": string,              // the program's own page; must be a URL that appears in the content
  "type": "grant"|"incubator"|"accelerator"|"competition"|"investor",
  "summary": string,          // one plain sentence
  "stages_accepted": string[],// subset of ${JSON.stringify(STAGES)}
  "sectors": string[],        // subset of ${JSON.stringify(SECTORS)}; [] if any sector
  "what_they_look_for": string[], // 2-4 short criteria, only if stated
  "deadline": "YYYY-MM-DD" | null, // only if stated for the current call
  "quote": string,            // short exact text from the content proving it's an open opportunity
  "confidence": 0-1
}]}
If there are none, return {"opportunities":[]}. Never invent programs, URLs or dates.`;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function ask(content: string): Promise<Found[]> {
  const text = await generateJSON({ system: SYSTEM, user: content.slice(0, 40_000), fast: true, maxTokens: 4000 });
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
}

export async function runDiscovery(opts: { kinds?: ("directory" | "search")[]; ids?: number[]; limit?: number } = {}): Promise<DiscoverySummary> {
  const db = getAdminSupabase();
  const summary: DiscoverySummary = { sources: 0, unchanged: 0, found: 0, queued: 0, duplicates: 0, errors: [] };

  // What we already know, for deduplication.
  const [{ data: programs }, { data: candidates }] = await Promise.all([
    db.from("programs").select("id, name, application_link"),
    db.from("program_candidates").select("dedupe_key, url, name"),
  ]);
  const knownDomains = new Set((programs ?? []).map((p) => domainOf(p.application_link)).filter((d) => d && !isShared(d)));
  const knownNames = new Set([...(programs ?? []).map((p) => norm(p.name)), ...(candidates ?? []).map((c) => norm(c.name))]);
  const knownKeys = new Set((candidates ?? []).map((c) => c.dedupe_key));
  const knownUrls = new Set([...(programs ?? []).map((p) => p.application_link), ...(candidates ?? []).map((c) => c.url)].map((u) => u?.replace(/\/$/, "")));

  let q = db.from("discovery_sources").select("*").eq("active", true).order("last_run_at", { ascending: true, nullsFirst: true });
  if (opts.ids?.length) q = q.in("id", opts.ids);
  else if (opts.kinds?.length) q = q.in("kind", opts.kinds);
  const { data: sources, error } = await q.limit(opts.limit ?? 30);
  if (error) throw error;

  for (const src of sources ?? []) {
    summary.sources++;
    try {
      let content: string;
      let allowedUrls: Set<string>;
      let newHash: string | null = null;
      if (src.kind === "directory") {
        const page = await scrape(src.target);
        const hash = createHash("sha256").update(page.markdown).digest("hex");
        await db.from("discovery_sources").update({ last_run_at: new Date().toISOString(), last_status: "ok" }).eq("id", src.id);
        if (hash === src.last_hash) { summary.unchanged++; continue; }
        content = `Listing page: ${src.target}\n\n${page.markdown}`;
        allowedUrls = new Set((page.markdown.match(/https?:\/\/[^\s)\]"'>]+/g) ?? []).map((u) => u.replace(/[.,]$/, "")));
        allowedUrls.add(src.target);
        newHash = hash;
      } else {
        const hits = await search(src.target);
        await db.from("discovery_sources").update({ last_run_at: new Date().toISOString(), last_status: `ok (${hits.length} results)` }).eq("id", src.id);
        if (!hits.length) continue;
        content = hits.map((h, i) => `[${i + 1}] ${h.title}\nURL: ${h.url}\n${h.description}`).join("\n\n");
        allowedUrls = new Set(hits.map((h) => h.url));
      }

      const found = await ask(content);
      summary.found += found.length;
      for (const f of found) {
        const url = String(f.url ?? "").replace(/[.,]$/, "");
        const quote = String(f.quote ?? "");
        // Evidence checks: the URL and the quote must both come from what we actually fetched.
        if (!f.name || !url || !Array.from(allowedUrls).some((u) => u.replace(/\/$/, "") === url.replace(/\/$/, ""))) continue;
        if (quote && !norm(content).includes(norm(quote))) continue;
        if ((f.confidence ?? 0) < 0.5) continue;
        // Stale: the evidence only mentions past years (e.g. "deadline June 9, 2025").
        const years = (quote.match(/\b20\d{2}\b/g) ?? []).map(Number);
        if (years.length && Math.max(...years) < new Date().getFullYear()) continue;

        const domain = domainOf(url);
        const key = `${isShared(domain) ? url.replace(/\/$/, "") : domain}|${norm(f.name)}`;
        // Name match also catches variants like "Startup India Seed Fund Scheme (SISFS)" vs "Startup India Seed Fund Scheme".
        const n = norm(f.name.replace(/\([^)]*\)/g, ""));
        const nameClash = knownNames.has(n) || Array.from(knownNames).some((k) => norm(k.replace(/\([^)]*\)/g, "")) === n);
        if (knownKeys.has(key) || nameClash || knownUrls.has(url.replace(/\/$/, "")) || (!isShared(domain) && knownDomains.has(domain))) {
          summary.duplicates++;
          continue;
        }

        const deadline = typeof f.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f.deadline) && f.deadline >= new Date().toISOString().slice(0, 10) ? f.deadline : null;
        const { error: insErr } = await db.from("program_candidates").insert({
          dedupe_key: key, name: f.name.slice(0, 160), organisation: f.organisation?.slice(0, 160) ?? null, url,
          type: TYPES.includes(String(f.type)) ? f.type : null, summary: f.summary?.slice(0, 400) ?? null,
          stages_accepted: (f.stages_accepted ?? []).filter((s) => (STAGES as readonly string[]).includes(s)),
          sectors: (f.sectors ?? []).filter((s) => (SECTORS as readonly string[]).includes(s)),
          what_they_look_for: (f.what_they_look_for ?? []).slice(0, 5).map(String),
          deadline, quote: quote || null, confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0)),
          discovery_source_id: src.id, found_on: src.kind === "directory" ? src.target : url,
        });
        if (insErr) { if (insErr.code === "23505") summary.duplicates++; else throw insErr; continue; }
        knownKeys.add(key); knownNames.add(norm(f.name)); knownUrls.add(url.replace(/\/$/, ""));
        summary.queued++;
      }
      if (newHash) await db.from("discovery_sources").update({ last_hash: newHash }).eq("id", src.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push({ source: src.label, error: message.slice(0, 300) });
      await db.from("discovery_sources").update({ last_status: `error: ${message.slice(0, 200)}` }).eq("id", src.id);
      if (isQuotaError(err)) break; // AI quota gone: stop, the rest will run next time
    }
  }
  return summary;
}
