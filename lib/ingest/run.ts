import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { scrape } from "./firecrawl";
import { extractFields } from "./extract";
import { evaluate } from "./evaluate";
import { FIELDS, getField, sameValue, setField } from "./fields";
import { isQuotaError } from "@/lib/ai";
import { isSharedHost } from "./hosts";

type Row = Record<string, unknown> & { id: string; name: string; field_meta: Record<string, unknown> };
export interface IngestSummary { checked: number; unchanged: number; proposals: number; autoApplied: number; closed: number; errors: { url: string; error: string }[] }

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One pass of the pipeline: auto-close expired programs, then for each source
 * fetch → skip if unchanged → snapshot → auto-apply low-risk fields → propose high-risk ones.
 */
export async function runIngest(opts: { only?: string[]; limit?: number } = {}): Promise<IngestSummary> {
  const db = getAdminSupabase();
  const summary: IngestSummary = { checked: 0, unchanged: 0, proposals: 0, autoApplied: 0, closed: 0, errors: [] };

  // 1. Deadlines that have passed close the program. Deterministic, so no review needed.
  const { data: expired } = await db.from("programs").select("id, status, deadline").in("status", ["open", "upcoming"]).lt("deadline", today());
  for (const p of expired ?? []) {
    await db.from("programs").update({ status: "closed" }).eq("id", p.id);
    await db.from("program_changes").insert({ program_id: p.id, field: "status", old_value: p.status, new_value: "closed", changed_by: "system" });
    summary.closed++;
  }

  // 2. Sources
  let q = db.from("program_sources").select("*").eq("active", true).order("last_fetched_at", { ascending: true, nullsFirst: true });
  if (opts.only?.length) q = q.in("program_id", opts.only);
  else q = q.eq("cadence", "daily");
  const { data: sources, error } = await q.limit(opts.limit ?? 50);
  if (error) throw error;

  let quotaHit = false; // once the AI quota is gone, keep refreshing branding but skip extraction
  for (const src of sources ?? []) {
    summary.checked++;
    try {
      const page = await scrape(src.url);
      const hash = createHash("sha256").update(page.markdown).digest("hex");
      await db.from("program_sources").update({ last_fetched_at: new Date().toISOString(), last_status: String(page.statusCode ?? "ok") }).eq("id", src.id);
      const { data: program } = await db.from("programs").select("*").eq("id", src.program_id).single<Row>();
      if (!program) continue;

      // Low-risk branding from the official site, refreshed on every fetch (even if the text didn't change).
      // Skipped on aggregator/social pages, whose branding belongs to the host, not the program.
      if (src.tier === 1 && !isSharedHost(src.url)) {
        if (page.logo && page.logo !== program.logo_url) { await applyChange(program, "logo_url", page.logo, src.url, null, "system", null); summary.autoApplied++; }
        if (page.brandColor && page.brandColor !== program.brand_color) { await applyChange(program, "brand_color", page.brandColor, src.url, null, "system", null); summary.autoApplied++; }
      }

      if (hash === src.last_hash) { summary.unchanged++; continue; }
      if (quotaHit) { summary.errors.push({ url: src.url, error: "skipped extraction: AI quota exhausted" }); continue; }
      await db.from("program_snapshots").insert({ source_id: src.id, content_hash: hash, markdown: page.markdown, og_image: page.ogImage });

      // Low-risk: the official page's share image becomes the poster.
      if (page.ogImage && page.ogImage !== program.poster_url && src.tier === 1 && !isSharedHost(src.url)) {
        await applyChange(program, "poster_url", page.ogImage, src.url, null, "system", null, { poster_source_url: src.url });
        summary.autoApplied++;
      }

      // High-risk: AI extraction → proposals for a human.
      for (const e of await extractFields(program.name, src.url, page.markdown)) {
        const { drop, flags } = evaluate(e);
        if (drop || sameValue(getField(program, e.field), e.value)) continue;

        const { data: pending } = await db.from("program_update_proposals")
          .select("id, new_value").eq("program_id", program.id).eq("field", e.field).eq("status", "pending");
        if (pending?.some((p) => sameValue(p.new_value, e.value))) continue;
        if (pending?.length) await db.from("program_update_proposals").update({ status: "superseded" }).in("id", pending.map((p) => p.id));

        await db.from("program_update_proposals").insert({
          program_id: program.id, source_id: src.id, field: e.field,
          old_value: getField(program, e.field), new_value: e.value,
          quote: e.quote, source_url: src.url, confidence: e.confidence, flags,
        });
        summary.proposals++;
      }

      // Only mark the page as processed once extraction succeeded, so failures retry next run.
      await db.from("program_sources").update({ last_hash: hash }).eq("id", src.id);
    } catch (err) {
      if (isQuotaError(err)) quotaHit = true;
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push({ url: src.url, error: message });
      await db.from("program_sources").update({ last_status: `error: ${message.slice(0, 200)}` }).eq("id", src.id);
    }
  }

  // 3. Keep 30 days of snapshots.
  await db.from("program_snapshots").delete().lt("fetched_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
  return summary;
}

/** Writes a field to a program, records per-field verification and logs the change. */
export async function applyChange(
  program: Row, field: string, value: unknown, sourceUrl: string, quote: string | null,
  changedBy: string, proposalId: number | null, extra: Record<string, unknown> = {},
) {
  const db = getAdminSupabase();
  const fieldMeta = { ...(program.field_meta ?? {}), [field]: { verified: true, source_url: sourceUrl, checked_at: today(), quote } };
  const update = {
    ...setField(program, field, value), ...extra, field_meta: fieldMeta, updated_at: new Date().toISOString(),
    // Program-level badge: verified once a human has approved at least one high-risk fact.
    ...(field in FIELDS && FIELDS[field as keyof typeof FIELDS].risk === "high" ? { verified: true, last_checked: today() } : {}),
  };
  const { error } = await db.from("programs").update(update).eq("id", program.id);
  if (error) throw error;
  await db.from("program_changes").insert({
    program_id: program.id, field, old_value: getField(program, field), new_value: value, source_url: sourceUrl, changed_by: changedBy, proposal_id: proposalId,
  });
  Object.assign(program, update);
}
