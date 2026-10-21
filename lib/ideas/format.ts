import type { PublicIdea } from "./types";

type Market = Pick<PublicIdea, "market_status" | "market_size_value" | "market_size_currency" | "market_size_unit" | "market_geography" | "market_size_year" | "growth_rate" | "growth_type" | "growth_period">;

const sym = (c: string | null) => (c === "INR" ? "₹" : c === "USD" ? "$" : "");
const num = (v: number, c: string | null) => v.toLocaleString(c === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 1 });

/** "₹12,400 Cr" — the short figure for list rows. null when not sourced. */
export function sizeShort(m: Market): string | null {
  if (!hasFigure(m) || m.market_size_value == null) return null;
  return `${sym(m.market_size_currency)}${num(m.market_size_value, m.market_size_currency)}${m.market_size_unit ? ` ${m.market_size_unit}` : ""}`;
}

/** "₹12,400 Cr · India · 2025" */
export function sizeLong(m: Market): string | null {
  const s = sizeShort(m);
  if (!s) return null;
  return [s, m.market_geography, m.market_size_year].filter(Boolean).join(" · ");
}

/** "+18% CAGR (2024–29)". The growth type is shown exactly as the source states it. */
export function growth(m: Market, withPeriod = true): string | null {
  if (!hasFigure(m) || m.growth_rate == null) return null;
  const sign = m.growth_rate > 0 ? "+" : "";
  const period = withPeriod && m.growth_period ? ` (${m.growth_period.replace(/(\d{4})\s*[–-]\s*\d{2}(\d{2})/, "$1–$2")})` : "";
  return `${sign}${num(m.growth_rate, null)}%${m.growth_type ? ` ${m.growth_type}` : ""}${period}`;
}

/** Market size in one currency for sorting only (rough FX, never displayed). */
export function sizeForSort(m: Market): number {
  if (!hasFigure(m) || m.market_size_value == null) return -1;
  const unit = (m.market_size_unit ?? "").toLowerCase();
  const mult = unit.startsWith("lakh cr") ? 1e12 : unit.startsWith("cr") ? 1e7 : unit.startsWith("lakh") ? 1e5 : unit.startsWith("bn") || unit === "b" ? 1e9 : unit.startsWith("mn") || unit === "m" ? 1e6 : unit.startsWith("tn") ? 1e12 : 1;
  return m.market_size_value * mult * (m.market_size_currency === "USD" ? 84 : 1);
}

export const NOT_SOURCED = "Not yet sourced";
export const AI_ESTIMATE = "AI estimate: not from a published source. Treat as a rough guide.";

/** Figures are shown when entered from a published source, or as a labelled AI estimate. */
export function hasFigure(m: Pick<Market, "market_status">) {
  return m.market_status === "sourced" || m.market_status === "ai_estimate";
}
