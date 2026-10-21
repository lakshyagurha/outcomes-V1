import { createHash } from "node:crypto";
import { generateJSON, isQuotaError } from "@/lib/ai";
import { scrape } from "@/lib/ingest/firecrawl";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { rewriteItems, type RawItem } from "./rewrite";
import { fetchTrustMrr } from "./trustmrr";
import { estimateMarket } from "./estimate";
import type { IdeaSourceRow } from "./types";

/** Above this trigram similarity, a new title is flagged as a likely duplicate (still inserted as a draft). */
export const DUPLICATE_THRESHOLD = 0.5;

const norm = (s: string) => s.toLowerCase().replace(/[*_`#>\[\]()]/g, "").replace(/\s+/g, " ").trim();
const keyOf = (s: string) => createHash("sha1").update(norm(s)).digest("hex").slice(0, 16);

const SPLIT = `You read a web page and list the distinct problem statements on it, exactly as written.
Return ONLY JSON: {"items":[{"source_title": "the problem's heading, copied exactly", "source_text": "the problem's own text on the page, copied exactly (heading plus any description), max 120 words", "score": number or null, "industry": string or null}]}
- Copy text exactly; do not paraphrase. It is used only to check our rewrite and is never published.
- score and industry only if the page shows them for that item (e.g. an "Itch Score" column); otherwise null.
- Skip navigation, ads, sign-up prompts, testimonials and anything that isn't a problem statement.`;

/** Lists the problems on a scraped page. Each item must appear on the page, so the model can't invent any. */
async function splitPage(markdown: string, url: string, scoreLabel: string | null, extra = ""): Promise<RawItem[]> {
  const page = norm(markdown);
  const out: RawItem[] = [];
  for (let i = 0; i < markdown.length; i += 30_000) {
    const text = await generateJSON({ system: SPLIT + extra, user: markdown.slice(i, i + 30_000), fast: true, maxTokens: 8000 });
    let parsed: { items?: { source_title?: string; source_text?: string; score?: number | null; industry?: string | null }[] } = {};
    try { parsed = JSON.parse(text.replace(/^```json|```$/g, "").trim()); } catch { continue; }
    for (const it of parsed.items ?? []) {
      const title = it.source_title?.trim();
      if (!title || !page.includes(norm(title))) continue; // not on the page → drop
      const score = typeof it.score === "number" && page.includes(String(it.score)) ? it.score : null;
      out.push({ key: keyOf(title), url, text: it.source_text?.trim() || title, score, scoreLabel: score != null ? scoreLabel : null, industry: it.industry ?? null });
    }
  }
  return out;
}

/** Per-source adapters: fetch raw items. Prompts specific to a source travel with it. */
const ADAPTERS: Record<string, (src: IdeaSourceRow, opts: { reportUrl?: string }) => Promise<{ items: RawItem[]; extra?: string }>> = {
  "fix-my-itch": async (src) => {
    const page = await scrape(src.homepage_url);
    return {
      items: await splitPage(page.markdown, src.homepage_url, "Itch Score"),
      extra: 'The signal is the Itch Score Razorpay gives the problem. why_it_matters: e.g. "Rated 82.8 on Razorpay\'s Itch Score." when a score is given; otherwise null.',
    };
  },
  ideabrowser: async (src) => {
    const page = await scrape(src.homepage_url);
    const extra = "\n- IdeaBrowser is a paid product: for each idea copy ONLY the core problem and why it matters. Never copy execution plans, market analysis, revenue models or the rest of the write-up.";
    return {
      items: await splitPage(page.markdown, src.homepage_url, null, extra),
      extra: "Use ONLY the core problem and why it matters. Do not describe solutions, business models, execution plans or market analysis.",
    };
  },
  trustmrr: async () => ({
    items: await fetchTrustMrr(),
    extra: 'Each item is a product with verified revenue. Write the PROBLEM it solves as a question (e.g. "Why do small B2B teams struggle to find high-intent prospects?"), not the product. Do not name the product. why_it_matters: say that a product solving this reports verified revenue; do not restate the figure.',
  }),
  // Public page only. Firecrawl fetches it logged out, so member-only data is never collected.
  "starter-story": async (src) => {
    const page = await scrape(src.homepage_url);
    return {
      items: await splitPage(page.markdown, src.homepage_url, null),
      extra: "Starter Story lists businesses and their revenue. Write the PROBLEM each business solves as a question, not the business. why_it_matters: say that a business solving this reports revenue on Starter Story; don't restate figures.",
    };
  },
  "research-report": async (_src, { reportUrl }) => {
    if (!reportUrl) return { items: [] }; // reports only run when an admin pastes a URL
    const page = await scrape(reportUrl);
    const extra = "\n- This is a published research report. List the problems and opportunities it describes, each with the passage that describes it.";
    return {
      items: (await splitPage(page.markdown, reportUrl, null, extra)).map((i) => ({ ...i, key: `${keyOf(reportUrl)}:${i.key}` })),
      extra: "This comes from a research report. why_it_matters should say what the report found, in our words.",
    };
  },
};

export interface CollectSummary { source: string; status: string; found: number; inserted: number; duplicates: number; skipped: number }

/**
 * Collects new drafts. Respects collection_mode: 'disabled' is skipped, 'link_only' keeps only a
 * rewritten title + link. Everything lands as status='draft', market_status='pending'. Nothing is published here.
 */
export async function runIdeaCollection({ slugs, reportUrl }: { slugs?: string[]; reportUrl?: string } = {}): Promise<CollectSummary[]> {
  const db = getAdminSupabase();
  const { data: sources } = await db.from("idea_sources").select("*");
  const results: CollectSummary[] = [];

  for (const src of (sources ?? []) as IdeaSourceRow[]) {
    if (slugs?.length && !slugs.includes(src.slug)) continue;
    const r: CollectSummary = { source: src.slug, status: "ok", found: 0, inserted: 0, duplicates: 0, skipped: 0 };
    results.push(r);
    if (src.collection_mode === "disabled") { r.status = "skipped: disabled"; continue; }
    const adapter = ADAPTERS[src.slug];
    if (!adapter) { r.status = "skipped: no adapter"; continue; }

    try {
      const { items, extra } = await adapter(src, { reportUrl });
      r.found = items.length;
      // Skip items we already have, before spending AI calls on them.
      const { data: existing } = await db.from("ideas").select("source_key").eq("source_id", src.id).in("source_key", items.map((i) => i.key).slice(0, 500));
      const seen = new Set((existing ?? []).map((e) => e.source_key));
      const fresh = items.filter((i) => !seen.has(i.key));
      r.skipped = items.length - fresh.length;

      for (const { raw, out } of await rewriteItems(fresh, src.collection_mode, extra)) {
        const { data: similar } = await db.rpc("similar_ideas", { q: out.title, threshold: DUPLICATE_THRESHOLD });
        const dup = (similar as { id: string; similarity: number }[] | null)?.[0];
        const { data: row, error } = await db.from("ideas").insert({
          ...out, source_id: src.id, source_url: raw.url, source_key: raw.key,
          status: "draft", market_status: "pending",
          duplicate_of: dup?.id ?? null, duplicate_similarity: dup?.similarity ?? null,
        }).select("id").single();
        if (error) { if (error.code !== "23505") throw error; continue; }
        r.inserted++;
        // Fill market fields + snapshot with an AI estimate so drafts are never empty. Failures leave it 'pending'.
        try { await estimateMarket(row!.id); } catch (e) { if (isQuotaError(e)) throw e; }
        if (dup) r.duplicates++;
      }
    } catch (e) {
      r.status = `error: ${e instanceof Error ? e.message.slice(0, 200) : "failed"}`;
      if (isQuotaError(e)) r.status = "stopped: AI quota reached; the rest runs next time";
      if (e instanceof Error && /\b402\b|insufficient credits/i.test(e.message)) r.status = "error: Firecrawl out of credits";
    }
    await db.from("idea_sources").update({ last_run_at: new Date().toISOString(), last_status: `${r.status} · ${r.inserted} new, ${r.duplicates} possible duplicates` }).eq("id", src.id);
  }
  return results;
}

export type ManualResult = { ok: true; id: string; duplicateOf: string | null } | { ok: false; reason: string };

/**
 * An idea an admin spotted elsewhere (a tweet, an article). Same pipeline as collection:
 * rewrite in our words, duplicate check, draft + AI estimate. The signal (e.g. MRR) is typed by the admin, never by the AI.
 */
export async function addManualIdea({ text, url, score, scoreLabel }: { text: string; url: string; score: number | null; scoreLabel: string | null }): Promise<ManualResult> {
  const db = getAdminSupabase();
  const { data: src } = await db.from("idea_sources").select("*").eq("slug", "manual").single<IdeaSourceRow>();
  if (!src) return { ok: false, reason: "The 'manual' source is missing (migration 0014)." };

  const raw: RawItem = { key: keyOf(url || text), url, text, score, scoreLabel: score != null ? scoreLabel : null };
  const extra = "This was pasted by an admin from a social post or article. If it describes a product or startup, write the PROBLEM it solves as a question, not the product, and don't name it. why_it_matters: describe the signal in the post (e.g. revenue or growth) in words.";
  const [hit] = await rewriteItems([raw], "rewrite", extra);
  if (!hit) return { ok: false, reason: "The AI didn't find a clear problem in that text, or its rewrite broke the rules. Add a sentence describing the problem and try again." };

  const { data: similar } = await db.rpc("similar_ideas", { q: hit.out.title, threshold: DUPLICATE_THRESHOLD });
  const dup = (similar as { id: string; similarity: number }[] | null)?.[0];
  const { data: row, error } = await db.from("ideas").insert({
    ...hit.out, source_id: src.id, source_url: url, source_key: raw.key,
    status: "draft", market_status: "pending",
    duplicate_of: dup?.id ?? null, duplicate_similarity: dup?.similarity ?? null,
  }).select("id").single();
  if (error) return { ok: false, reason: error.code === "23505" ? "This link was already added." : error.message };
  try { await estimateMarket(row.id); } catch { /* stays 'pending'; "Fill with AI" can retry */ }
  return { ok: true, id: row.id, duplicateOf: dup?.id ?? null };
}
