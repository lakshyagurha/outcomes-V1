/**
 * Fields the pipeline is allowed to propose, with their risk level.
 * "high" fields always need an admin; "low" fields are applied automatically.
 */
export const FIELDS = {
  status: { risk: "high", label: "Application status" },
  deadline: { risk: "high", label: "Deadline" },
  opens_at: { risk: "high", label: "Applications open" },
  cohort_name: { risk: "high", label: "Cohort" },
  typical_timeline: { risk: "high", label: "Timeline" },
  "what_you_get.money": { risk: "high", label: "Money offered" },
  "what_they_take.kind": { risk: "high", label: "What they take" },
  "what_they_take.equity_percent": { risk: "high", label: "Equity %" },
  "eligibility.min_age": { risk: "high", label: "Minimum age" },
  "eligibility.max_age": { risk: "high", label: "Maximum age" },
  "eligibility.education": { risk: "high", label: "Education" },
  "eligibility.requires_registered_company": { risk: "high", label: "Needs a registered company" },
  "eligibility.requires_dpiit": { risk: "high", label: "Needs DPIIT recognition" },
  "eligibility.states": { risk: "high", label: "State restriction" },
  "eligibility.women_led_only": { risk: "high", label: "Women-led only" },
  poster_url: { risk: "low", label: "Poster" },
  logo_url: { risk: "low", label: "Logo" },
  brand_color: { risk: "low", label: "Brand colour" },
} as const;
export type FieldPath = keyof typeof FIELDS;

type Json = Record<string, unknown>;

/** Reads "a.b" from a program row. */
export function getField(row: Json, path: string): unknown {
  const [col, key] = path.split(".");
  if (!key) return row[col] ?? null;
  return ((row[col] as Json | null) ?? {})[key] ?? null;
}

/** Returns the column update needed to set "a.b" on a row. */
export function setField(row: Json, path: string, value: unknown): Json {
  const [col, key] = path.split(".");
  if (!key) return { [col]: value };
  return { [col]: { ...((row[col] as Json | null) ?? {}), [key]: value } };
}

export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
