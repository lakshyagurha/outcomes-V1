import { generateJSON } from "@/lib/ai";
import { IDEA_CATEGORIES, type CollectionMode, type IdeaCategory, type IdeaPath } from "./types";

/** One problem as found at a source, before rewriting. `text` is the source's own wording. */
export interface RawItem {
  key: string;             // stable id at the source (slug, product id, or normalised original title)
  url: string;             // link to the original
  text: string;            // source wording, used only as AI input and for the copy check; never stored
  score?: number | null;   // the source's own score, read by code (never by AI)
  scoreLabel?: string | null;
  industry?: string | null;
}

export interface Rewritten {
  title: string;
  summary: string | null;
  who_has_it: string | null;
  why_it_matters: string | null;
  category: IdeaCategory;
  path: IdeaPath;
  source_score: number | null;
  source_score_label: string | null;
}

const RULES = `Rules:
- Write everything in our own words. Never copy more than 5 consecutive words from the source.
- Do not invent facts, numbers, or scores. If the source doesn't give something, leave it null.
- Set is_problem=false for anything that isn't a real problem (ads, navigation text, duplicates), and skip those items.
- Never include market sizes, growth rates or other figures from your own knowledge.
- The summary may only restate what the source says, more plainly. Do not add causes, consequences or details the source doesn't state. If the source is just a one-line problem, write a one- or two-sentence plain restatement, no more.
- why_it_matters must name the source's signal (e.g. its score, or what the report found). If the source gives no signal, set it to null.`;

const SHAPE = `{
  "title": "the problem as a question, at most 15 words",
  "summary": "2–3 sentences, at most 60 words",
  "who_has_it": "one short phrase",
  "why_it_matters": "one sentence describing the signal",
  "category": "one value from the taxonomy",
  "path": "startup" or "small_business",
  "source_score": number or null,
  "source_score_label": string or null,
  "is_problem": true or false
}`;

const system = (mode: CollectionMode, extra: string) => `You turn problem statements from a research source into short entries for a list of problems worth solving, read by student founders in India.
Return ONLY JSON: {"items": [ { "ref": <the item's ref number>, ...fields } ]} where each item has exactly these fields:
${SHAPE}
Taxonomy for category: ${IDEA_CATEGORIES.join(", ")}.
path: "small_business" if a local or offline business with modest capital could solve it; otherwise "startup".
${mode === "link_only" ? "LINK-ONLY MODE: write only the title. Set summary, who_has_it and why_it_matters to null." : ""}
${extra}
${RULES}`;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9₹$%.\s]/g, " ").split(/\s+/).filter(Boolean);
const count = (s: string | null | undefined) => (s ? words(s).length : 0);

/** True if `out` shares a run of 6+ consecutive words with `source` (i.e. copies more than 5). */
export function copiesSource(out: string, source: string): boolean {
  const src = words(source);
  const grams = new Set<string>();
  for (let i = 0; i + 6 <= src.length; i++) grams.add(src.slice(i, i + 6).join(" "));
  const w = words(out);
  for (let i = 0; i + 6 <= w.length; i++) if (grams.has(w.slice(i, i + 6).join(" "))) return true;
  return false;
}

/**
 * Rewrites raw items in batches. Code (not the AI) enforces the limits, the copy rule,
 * the taxonomy and the scores: a score is kept only if the adapter read it from the source.
 */
export async function rewriteItems(items: RawItem[], mode: CollectionMode, extraInstructions = ""): Promise<{ raw: RawItem; out: Rewritten }[]> {
  const kept: { raw: RawItem; out: Rewritten }[] = [];
  for (let i = 0; i < items.length; i += 15) {
    const batch = items.slice(i, i + 15);
    const user = batch.map((it, k) => `### ref ${k}\n${it.industry ? `Industry at source: ${it.industry}\n` : ""}${it.score != null ? `Source score: ${it.score} (${it.scoreLabel ?? "score"})\n` : ""}${it.text.slice(0, 3000)}`).join("\n\n");
    const text = await generateJSON({ system: system(mode, extraInstructions), user, fast: true, maxTokens: 4000 });
    let parsed: { items?: Record<string, unknown>[] } = {};
    try { parsed = JSON.parse(text.replace(/^```json|```$/g, "").trim()); } catch { continue; }
    for (const o of parsed.items ?? []) {
      const raw = batch[Number(o.ref)];
      if (!raw || o.is_problem !== true) continue;
      const out = clean(o, raw, mode);
      if (out) kept.push({ raw, out });
    }
  }
  return kept;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function clean(o: Record<string, unknown>, raw: RawItem, mode: CollectionMode): Rewritten | null {
  let title = str(o.title);
  if (!title || count(title) > 15) return null;
  if (!title.endsWith("?")) title = `${title.replace(/[.!]+$/, "")}?`;
  const linkOnly = mode === "link_only";
  const summary = linkOnly ? null : str(o.summary);
  const who = linkOnly ? null : str(o.who_has_it);
  const why = linkOnly ? null : str(o.why_it_matters);
  if (summary && count(summary) > 60) return null;
  // Never more than 5 consecutive words from the source, in any field.
  if ([title, summary, who, why].some((f) => f && copiesSource(f, raw.text))) return null;
  const category = (IDEA_CATEGORIES as readonly string[]).includes(String(o.category)) ? (o.category as IdeaCategory) : "Other";
  const path: IdeaPath = o.path === "small_business" ? "small_business" : "startup";
  return {
    title, summary, who_has_it: who, why_it_matters: why, category, path,
    source_score: raw.score ?? null,
    source_score_label: raw.score != null ? raw.scoreLabel ?? null : null,
  };
}
