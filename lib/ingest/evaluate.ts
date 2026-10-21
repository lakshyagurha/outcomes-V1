import type { Extracted } from "./extract";

/** Deterministic checks on an extracted value. Returns flags; "drop" means don't propose it. */
export function evaluate(e: Extracted, today = new Date().toISOString().slice(0, 10)): { drop: boolean; flags: string[] } {
  const flags: string[] = [];
  const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

  if (e.field === "deadline" || e.field === "opens_at") {
    if (!isDate(e.value)) return { drop: true, flags: ["bad_date"] };
    if (e.field === "deadline" && (e.value as string) < today) return { drop: true, flags: ["past_deadline"] };
    const days = (Date.parse(e.value as string) - Date.parse(today)) / 86_400_000;
    if (days > 400) flags.push("far_future_date");
  }
  if (e.field === "what_they_take.equity_percent") {
    const n = Number(e.value);
    if (!Number.isFinite(n) || n < 0 || n > 50) return { drop: true, flags: ["implausible_equity"] };
  }
  if (e.field.startsWith("eligibility.") && e.field.endsWith("_age")) {
    const n = Number(e.value);
    if (!Number.isFinite(n) || n < 10 || n > 80) return { drop: true, flags: ["implausible_age"] };
  }
  if (e.confidence < 0.6) flags.push("low_confidence");
  return { drop: false, flags };
}
