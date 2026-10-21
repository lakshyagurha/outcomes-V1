import { generateJSON } from "@/lib/ai";
import { FIELDS, type FieldPath } from "./fields";

const MAX_CHARS = 40_000;

export interface Extracted { field: FieldPath; value: unknown; quote: string; confidence: number }

const SCHEMA = `{
  "status": "open" | "rolling" | "closed" | "upcoming",
  "deadline": "YYYY-MM-DD",            // next application deadline
  "opens_at": "YYYY-MM-DD",            // when applications open, if not yet open
  "cohort_name": string,               // e.g. "Winter 2027 batch"
  "typical_timeline": string,          // e.g. "12-week programme, results ~4 weeks after deadline"
  "what_you_get.money": string,        // the source's own wording, e.g. "Grant of up to ₹20 lakh"
  "what_they_take.kind": "equity" | "fees" | "none",
  "what_they_take.equity_percent": number,
  "eligibility.min_age": number,
  "eligibility.max_age": number,
  "eligibility.education": "student" | "graduate" | "any",
  "eligibility.requires_registered_company": boolean,
  "eligibility.requires_dpiit": boolean,
  "eligibility.states": string[],      // Indian states, only if restricted
  "eligibility.women_led_only": boolean
}`;

function prompt(programName: string, url: string, today: string) {
  return `You extract facts about the startup program "${programName}" from its web page (${url}). Today is ${today}.

Return ONLY a JSON object: keys are field names from this schema, each value is {"value": ..., "quote": "...", "confidence": 0-1}.
${SCHEMA}

Strict rules:
- Include a field ONLY if the page states it explicitly. Never infer, estimate or use outside knowledge. Omit anything not on the page.
- "quote" must be copied EXACTLY from the page (a short sentence or phrase that proves the value).
- Dates must refer to the CURRENT or NEXT cohort. If only past dates appear, omit them.
- "status" is "open" only if the page says applications are open now; "rolling" only if it says rolling/anytime.
- Confidence: 0.9+ when stated plainly, 0.6–0.8 when the wording is ambiguous, lower otherwise.`;
}

const norm = (s: string) => s.toLowerCase().replace(/[*_`#>\[\]()]/g, "").replace(/\s+/g, " ").trim();

/** Asks Claude for the fields on a page, keeping only values backed by a verbatim quote. */
export async function extractFields(programName: string, url: string, markdown: string): Promise<Extracted[]> {
  const page = markdown.slice(0, MAX_CHARS);
  const today = new Date().toISOString().slice(0, 10);
  const text = await generateJSON({ system: prompt(programName, url, today), user: `<page>\n${page}\n</page>`, fast: true });
  const raw = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, { value?: unknown; quote?: unknown; confidence?: unknown }>;
  const haystack = norm(page);

  const out: Extracted[] = [];
  for (const [field, v] of Object.entries(raw)) {
    if (!(field in FIELDS) || field === "poster_url" || field === "logo_url" || field === "brand_color" || !v || v.value === undefined || v.value === null) continue;
    const quote = typeof v.quote === "string" ? v.quote : "";
    if (!quote || !haystack.includes(norm(quote))) continue; // no verbatim evidence → drop
    out.push({ field: field as FieldPath, value: v.value, quote, confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)) });
  }
  return out;
}
