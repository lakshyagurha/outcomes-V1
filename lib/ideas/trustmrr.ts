import type { RawItem } from "./rewrite";

/**
 * TrustMRR official API (https://trustmrr.com/docs/api). Bearer key from TRUSTMRR_API_KEY.
 * Standard plan: 10 requests/min, so pages are spaced ≥6.5s apart and we honour X-RateLimit-* headers.
 * NOTE: TrustMRR's terms (§9) require prior written permission to use API data in a customer-facing product.
 * The source stays 'disabled' until that permission exists.
 */
const BASE = "https://trustmrr.com/api/v1";
const PAGES = Number(process.env.TRUSTMRR_PAGES ?? 2);
const GAP_MS = 6500;

interface Startup {
  slug: string; description?: string | null; category?: string | null; targetAudience?: string | null;
  revenue?: { mrr?: number | null; last30Days?: number | null } | null;
}

export async function fetchTrustMrr(): Promise<RawItem[]> {
  const key = process.env.TRUSTMRR_API_KEY;
  if (!key) throw new Error("TRUSTMRR_API_KEY is not set");
  const out: RawItem[] = [];
  for (let page = 1; page <= PAGES; page++) {
    if (page > 1) await new Promise((r) => setTimeout(r, GAP_MS));
    const res = await fetch(`${BASE}/startups?page=${page}&limit=50`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 429) {
      const reset = Number(res.headers.get("X-RateLimit-Reset"));
      throw new Error(`TrustMRR rate limit reached${reset ? `; resets at ${new Date(reset * (reset < 1e12 ? 1000 : 1)).toISOString()}` : ""}`);
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`TrustMRR ${res.status}: ${body?.error ?? "request failed"}`);
    for (const s of (body?.data ?? []) as Startup[]) {
      const cents = s.revenue?.mrr ?? null;
      if (!s.slug || !s.description || !cents) continue; // revenue is the signal; skip products without it
      out.push({
        key: s.slug,
        url: `https://trustmrr.com/startup/${s.slug}`,
        text: [s.description, s.category && `Category: ${s.category}`, s.targetAudience && `Audience: ${s.targetAudience}`].filter(Boolean).join("\n"),
        score: Math.round(cents / 100), // API returns USD cents
        scoreLabel: "Verified MRR (USD)",
        industry: s.category ?? null,
      });
    }
    if (!body?.meta?.hasMore) break;
  }
  return out;
}
