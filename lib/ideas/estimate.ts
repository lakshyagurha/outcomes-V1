import { generateJSON, isQuotaError } from "@/lib/ai";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { IdeaRow } from "./types";

/**
 * AI market estimate + snapshot for an idea (product decision, 2026-10-21).
 * Stored as market_status='ai_estimate' and always labelled "AI estimate" to students.
 * Never overwrites a figure an admin entered from a published source.
 */
const SYSTEM = `You help student founders in India size up a problem worth solving.
Given a problem, return ONLY JSON:
{
  "market_segment": "the market this problem sits in, e.g. 'Indian invoicing software market'",
  "market_size_value": number,
  "market_size_currency": "INR" or "USD",
  "market_size_unit": "Cr" | "Lakh Cr" | "Mn" | "Bn" | "Tn",
  "market_geography": "India" or "Global",
  "market_size_year": year the size refers to,
  "growth_rate": number (percent),
  "growth_type": "CAGR" or "YoY",
  "growth_period": "e.g. 2024–2029" (for CAGR) or null,
  "insights": "80–120 words, plain text in three short parts: 'Case study:' one real company or business type solving this and what they did; 'Earnings:' what people or businesses typically earn doing this (ranges, India where possible); 'Competition:' 2–4 named players or alternatives and the gap left open."
}
Rules:
- Prefer India figures; use Global only if the segment is clearly global.
- Give your best estimate of commonly reported figures. Round sensibly; don't fake precision.
- Name real companies only if you're confident they exist. Never invent quotes or sources.`;

const UNITS = ["Cr", "Lakh Cr", "Mn", "Bn", "Tn"];
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function estimateMarket(ideaId: string, { force = false } = {}): Promise<"estimated" | "skipped"> {
  const db = getAdminSupabase();
  const { data: idea } = await db.from("ideas").select("*").eq("id", ideaId).single<IdeaRow & { market_insights: string | null }>();
  if (!idea) return "skipped";
  const sourced = idea.market_status === "sourced"; // a published figure always wins: only the snapshot is added
  if (sourced && idea.market_insights && !force) return "skipped";
  if (!sourced && !force && idea.market_status === "ai_estimate" && idea.market_insights) return "skipped";

  const text = await generateJSON({
    system: SYSTEM, fast: true, maxTokens: 900,
    user: `Problem: ${idea.title}\nSummary: ${idea.summary ?? "—"}\nWho has it: ${idea.who_has_it ?? "—"}\nCategory: ${idea.category}\nPath: ${idea.path}`,
  });
  let o: Record<string, unknown>;
  try { o = JSON.parse(text.replace(/^```json|```$/g, "").trim()); } catch { throw new Error("AI returned invalid JSON"); }

  if (sourced) {
    await db.from("ideas").update({ market_insights: str(o.insights) }).eq("id", ideaId);
    return "estimated";
  }
  const value = num(o.market_size_value);
  const currency = o.market_size_currency === "INR" || o.market_size_currency === "USD" ? o.market_size_currency : null;
  const unit = UNITS.includes(String(o.market_size_unit)) ? String(o.market_size_unit) : null;
  if (value == null || !currency || !unit || !str(o.market_segment)) throw new Error("AI estimate was incomplete");

  await db.from("ideas").update({
    market_status: "ai_estimate",
    market_segment: str(o.market_segment), market_size_value: value, market_size_currency: currency, market_size_unit: unit,
    market_geography: str(o.market_geography) ?? "India", market_size_year: num(o.market_size_year),
    growth_rate: num(o.growth_rate), growth_type: o.growth_type === "CAGR" || o.growth_type === "YoY" ? o.growth_type : null,
    growth_period: str(o.growth_period),
    market_source_name: "AI estimate", market_source_url: null, market_source_quote: null,
    market_verified_at: null, market_verified_by: null,
    market_insights: str(o.insights),
  }).eq("id", ideaId);
  return "estimated";
}

/** Fills every idea that has no published figure yet. Stops early when the AI quota runs out. */
export async function runEstimates({ limit = 50, force = false } = {}) {
  const db = getAdminSupabase();
  let q = db.from("ideas").select("id").neq("status", "rejected").order("created_at").limit(limit);
  if (!force) q = q.or("market_insights.is.null,market_size_value.is.null");
  const { data } = await q;
  const summary = { estimated: 0, skipped: 0, failed: 0, stopped: false };
  for (const { id } of data ?? []) {
    try { summary[await estimateMarket(id, { force })]++; }
    catch (e) { if (isQuotaError(e)) { summary.stopped = true; break; } summary.failed++; }
  }
  return summary;
}
