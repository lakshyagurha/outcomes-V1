export interface Scraped { markdown: string; ogImage: string | null; statusCode: number | null; logo: string | null; brandColor: string | null }

/** Fetches a page as clean markdown via Firecrawl's REST API. */
export async function scrape(url: string): Promise<Scraped> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "branding"], onlyMainContent: true, maxAge: 0 }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(`Firecrawl ${res.status}: ${body?.error ?? "scrape failed"}`);
  const meta = body.data?.metadata ?? {};
  const og = meta.ogImage ?? meta["og:image"] ?? null;
  const branding = body.data?.branding ?? {};
  const color = branding.colors?.primary ?? branding.colors?.accent ?? null;
  return {
    logo: branding.logo ?? branding.images?.logo ?? branding.images?.favicon ?? meta.favicon ?? null,
    brandColor: typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null,
    markdown: String(body.data?.markdown ?? ""),
    ogImage: Array.isArray(og) ? og[0] ?? null : og,
    statusCode: meta.statusCode ?? null,
  };
}

export interface SearchHit { url: string; title: string; description: string }

/** Web + news search via Firecrawl. `recent` limits results to the past week. */
export async function search(query: string, { limit = 8, recent = true, includeDomains }: { limit?: number; recent?: boolean; includeDomains?: string[] } = {}): Promise<SearchHit[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not set");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, sources: ["web", "news"], ...(recent ? { tbs: "qdr:w" } : {}), ...(includeDomains?.length ? { includeDomains } : {}) }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(`Firecrawl search ${res.status}: ${body?.error ?? "failed"}`);
  const rows = [...(body.data?.web ?? []), ...(body.data?.news ?? [])] as Record<string, string>[];
  return rows
    .map((r) => ({ url: r.url, title: r.title ?? "", description: r.description ?? r.snippet ?? "" }))
    .filter((r) => r.url);
}
