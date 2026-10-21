"use client";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IDEA_CATEGORIES, PATH_LABEL, type IdeaPath, type PublicIdea } from "@/lib/ideas/types";
import { AI_ESTIMATE, growth, hasFigure, NOT_SOURCED, sizeForSort, sizeLong, sizeShort } from "@/lib/ideas/format";
import { setInterest } from "@/app/ideas/actions";
import { cn } from "@/lib/cn";

export interface SourceLogo { name: string; domain: string | null }

const SORTS = [
  { key: "score", label: "Score" },
  { key: "market", label: "Market size" },
  { key: "growth", label: "Growth" },
  { key: "newest", label: "Newest" },
  { key: "interest", label: "Most interested" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];
const INTEREST_MIN = 3;

const flip = (s: Set<string>, id: string, on: boolean) => {
  const n = new Set(s);
  if (on) n.add(id);
  else n.delete(id);
  return n;
};
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function IdeaBank({ ideas, interested, sourceStrip }: { ideas: PublicIdea[]; interested: string[]; sourceStrip?: SourceLogo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mine, setMine] = useState(() => new Set(interested));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, start] = useTransition();

  const q = params.get("q") ?? "";
  const cats = list(params.get("cat"));
  const path = (params.get("path") as IdeaPath | null) ?? null;
  const sort = (SORTS.some((s) => s.key === params.get("sort")) ? params.get("sort") : "score") as SortKey;
  const open = params.get("open");

  /** Every filter lives in the URL so a filtered view can be shared. */
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const toggleIn = (key: "cat", values: string[], v: string) =>
    update({ [key]: (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]).join(",") || null, open: null });

  const sources = useMemo(() => {
    const m = new Map<string, number>();
    ideas.forEach((i) => m.set(i.source_name, (m.get(i.source_name) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [ideas]);
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    ideas.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1));
    return m;
  }, [ideas]);

  const count = (i: PublicIdea) => counts[i.id] ?? i.interest_count;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = ideas.filter((i) =>
      (!cats.length || cats.includes(i.category)) &&
      (!path || i.path === path) &&
      (!needle || [i.title, i.summary, i.who_has_it, i.market_segment, i.category].some((t) => t?.toLowerCase().includes(needle))));
    const by: Record<SortKey, (i: PublicIdea) => number> = {
      score: (i) => i.source_score ?? -1,
      market: sizeForSort,
      growth: (i) => (hasFigure(i) ? i.growth_rate ?? -1 : -1),
      newest: (i) => (i.published_at ? Date.parse(i.published_at) : 0),
      interest: count,
    };
    return rows.sort((a, b) => by[sort](b) - by[sort](a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas, q, cats.join(), path, sort, counts]);

  const toggleInterest = (id: string) => {
    const on = !mine.has(id);
    const base = ideas.find((i) => i.id === id)?.interest_count ?? 0;
    setMine((s) => flip(s, id, on));
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? base) + (on ? 1 : -1)) }));
    start(async () => {
      const res = await setInterest(id, on);
      if (!res.ok) {
        setMine((s) => flip(s, id, !on));
        setCounts((c) => ({ ...c, [id]: base }));
      }
    });
  };

  const active = cats.length + (path ? 1 : 0) + (q ? 1 : 0);
  const clear = () => update({ q: null, cat: null, path: null, open: null });

  if (!ideas.length)
    return (
      <div className="ticks blueprint rounded-card border border-dashed border-line bg-white px-6 py-14 text-center">
        <p className="label mb-3">Being curated</p>
        <h3 className="text-2xl font-normal">The first problems are on their way</h3>
        <p className="mx-auto mt-2 max-w-md text-slate-600">We review every problem and its market figures by hand before it goes live. Check back soon.</p>
      </div>
    );

  const filters = (
    <div className="space-y-8">
      <FilterGroup title="Path">
        {(["startup", "small_business"] as const).map((p) => (
          <Check key={p} on={path === p} onClick={() => update({ path: path === p ? null : p, open: null })}>{PATH_LABEL[p]}</Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Category">
        {IDEA_CATEGORIES.filter((c) => catCounts.has(c)).map((c) => (
          <Check key={c} on={cats.includes(c)} count={catCounts.get(c)} onClick={() => toggleIn("cat", cats, c)}>{c}</Check>
        ))}
      </FilterGroup>
    </div>
  );

  return (
    <div>
      {/* At a glance: how many, and where they come from */}
      <div className="mb-8 grid gap-5 border-y border-line py-5 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
        <p className="text-[15px]"><span className="tnum text-[40px] leading-none tracking-[-0.04em]">{ideas.length}</span> <span className="text-slate-600">problems</span></p>
        <div>
          <p className="label mb-3">Drawn from trusted, well-researched sources</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {(sourceStrip ?? sources.map(([name]) => ({ name, domain: null }))).map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-[14px] text-slate-700">
                {s.domain ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=64`} alt="" width={20} height={20} className="h-5 w-5 rounded-[2px] grayscale" />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-[2px] border border-line bg-white text-slate-500" aria-hidden>
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1h5l3 3v7H1z M3 6h4M3 8.5h4" stroke="currentColor" strokeWidth="1.1" /></svg>
                  </span>
                )}
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="label mb-5 flex items-center justify-between">Filter by {active > 0 && <button onClick={clear} className="text-accent hover:underline">Clear</button>}</p>
          {filters}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search problems</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="m9.5 9.5 3 3" stroke="currentColor" strokeWidth="1.4" /></svg>
              <input type="search" defaultValue={q} placeholder="Search problems, people, markets"
                onChange={(e) => update({ q: e.target.value || null, open: null })}
                className="h-11 w-full rounded-[3px] border border-line bg-white pl-9 pr-3 text-[15px] outline-none focus:border-accent" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}
                className="h-11 flex-1 rounded-[3px] border border-line bg-white px-3 font-mono text-[12px] uppercase tracking-[0.08em] text-slate-600 lg:hidden">
                Filters{active > 0 ? ` · ${active}` : ""}
              </button>
              <label className="flex h-11 flex-1 items-center gap-2 rounded-[3px] border border-line bg-white px-3 sm:flex-none">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">Sort</span>
                <select value={sort} onChange={(e) => update({ sort: e.target.value === "score" ? null : e.target.value })}
                  className="flex-1 bg-transparent text-[14px] outline-none">
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-6 border border-line bg-white p-4 lg:hidden">
              {filters}
              <div className="mt-6 flex justify-between">
                {active > 0 ? <button onClick={clear} className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent">Clear all</button> : <span />}
                <button onClick={() => setFiltersOpen(false)} className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink">Show {shown.length} →</button>
              </div>
            </div>
          )}

          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500" aria-live="polite">
            {shown.length === ideas.length ? `Showing all ${shown.length}` : `${shown.length} of ${ideas.length}`}
          </p>

          {/* Column heads (desktop) */}
          <div className="hidden grid-cols-[1fr_64px_120px_120px_130px_20px] gap-4 border-b border-ink pb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500 md:grid">
            <span>Problem</span><span>Score</span><span>Market</span><span>Growth</span><span>Industry</span><span />
          </div>

          {shown.length === 0 ? (
            <div className="border-b border-line py-14 text-center">
              <p className="text-xl">No problems match these filters</p>
              <p className="mt-2 text-slate-600">Try fewer filters or a broader search.</p>
              <button onClick={clear} className="mt-5 font-mono text-[12px] uppercase tracking-[0.08em] text-accent hover:underline">Clear filters</button>
            </div>
          ) : (
            <ul>
              {shown.map((i) => (
                <IdeaItem key={i.id} idea={i} open={open === i.id} interested={mine.has(i.id)} count={count(i)}
                  onToggle={() => update({ open: open === i.id ? null : i.id })} onInterest={() => toggleInterest(i.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Dash() {
  return <abbr title={NOT_SOURCED} className="cursor-help text-slate-400 no-underline">—</abbr>;
}

function IdeaItem({ idea: i, open, interested, count, onToggle, onInterest }: {
  idea: PublicIdea; open: boolean; interested: boolean; count: number; onToggle: () => void; onInterest: () => void;
}) {
  const est = i.market_status === "ai_estimate";
  // AI estimates are marked with "~" and a tooltip wherever they appear.
  const size = sizeShort(i) && (est ? `~${sizeShort(i)}` : sizeShort(i));
  const grow = growth(i, false) && (est ? `~${growth(i, false)}` : growth(i, false));
  const panel = `idea-${i.id}`;
  return (
    <li className="border-b border-line">
      <button onClick={onToggle} aria-expanded={open} aria-controls={panel}
        className="grid w-full grid-cols-[1fr_20px] items-start gap-x-4 gap-y-2 py-4 text-left transition-colors hover:bg-white/60 md:grid-cols-[1fr_64px_120px_120px_130px_20px] md:items-center">
        <span className="min-w-0">
          <span className="block text-[17px] leading-snug tracking-[-0.01em]">{i.title}</span>
          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {PATH_LABEL[i.path]}<span className="md:hidden"> · {i.category}</span>
          </span>
        </span>
        <span className="col-start-2 row-start-1 mt-1 text-slate-400 md:col-start-6 md:mt-0" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 14 14" className={cn("transition-transform duration-300 ease-out", open && "rotate-45")}><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" /></svg>
        </span>
        {/* Mobile: compact stat line. Desktop: table columns. */}
        <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-slate-600 md:hidden">
          <span>Score {i.source_score ?? "—"}</span>
          <span>{size ?? <Dash />}</span>
          <span className={grow ? "text-[#00873f]" : ""}>{grow ?? <Dash />}</span>
        </span>
        <span className="tnum hidden text-[15px] md:col-start-2 md:row-start-1 md:block" title={i.source_score_label ?? undefined}>{i.source_score ?? <span className="text-slate-400">—</span>}</span>
        <span title={est ? AI_ESTIMATE : undefined} className="tnum hidden text-[15px] md:col-start-3 md:row-start-1 md:block">{size ?? <Dash />}</span>
        <span className="tnum hidden text-[15px] text-[#00873f] md:col-start-4 md:row-start-1 md:block">{grow ?? <Dash />}</span>
        <span className="hidden text-[14px] text-slate-600 md:col-start-5 md:row-start-1 md:block">{i.category}</span>
      </button>

      {open && (
        <div id={panel} className="ticks mb-5 grid gap-6 border border-line bg-white p-5 sm:p-6 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            {i.summary && <p className="text-[16px] leading-relaxed text-slate-700">{i.summary}</p>}
            <dl className="grid gap-4 sm:grid-cols-2">
              {i.who_has_it && <Field label="Who has it">{i.who_has_it}</Field>}
              {i.why_it_matters && <Field label="Why it matters">{i.why_it_matters}</Field>}
              {i.source_score != null && <Field label={i.source_score_label ?? "Source score"}>{i.source_score}</Field>}
            </dl>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button onClick={onInterest} aria-pressed={interested}
                className={cn("inline-flex h-11 items-center gap-2 rounded-[3px] px-4 text-[15px] font-medium transition-colors",
                  interested ? "border border-accent bg-tint text-accent" : "bg-accent text-warm hover:bg-accent-hover")}>
                {interested ? "✓ Interested" : "I'm interested"}
              </button>
              <a href={i.source_url} target="_blank" rel="noopener noreferrer"
                className="font-mono text-[12px] uppercase tracking-[0.08em] text-slate-600 hover:text-accent">Read the original ↗</a>
              {count >= INTEREST_MIN && <span className="font-mono text-[12px] text-slate-500">{count} students interested</span>}
            </div>
          </div>

          <div className="space-y-3 border-t border-line pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <p className="label">Market</p>
            {hasFigure(i) ? (
              <>
                {est && <p className="inline-flex items-center rounded-[2px] border border-line bg-paper px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-600" title={AI_ESTIMATE}>AI estimate</p>}
                {i.market_segment && <p className="text-[14px] text-slate-600">{i.market_segment}</p>}
                <p className="tnum text-[22px] leading-tight tracking-[-0.02em]">{sizeLong(i) ?? <Dash />}</p>
                <p className="tnum text-[15px] text-[#00873f]">{growth(i) ?? <Dash />}</p>
                {est ? (
                  <p className="text-[13px] text-slate-500">{AI_ESTIMATE}</p>
                ) : i.market_source_name && (
                  <p className="text-[13px] text-slate-500">Source:{" "}
                    {i.market_source_url ? <a href={i.market_source_url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 hover:text-accent">{i.market_source_name} ↗</a> : i.market_source_name}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[22px] text-slate-400"><Dash /> <span className="ml-1 text-[13px]">{NOT_SOURCED}</span></p>
            )}
            <p className="text-[12px] leading-relaxed text-slate-500">Market figures describe the wider segment and vary between sources. Treat them as direction, not precision.</p>
            <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">Deep research — coming soon</p>
          </div>

          {i.market_insights && <Snapshot text={i.market_insights} />}
        </div>
      )}
    </li>
  );
}

const SNAPSHOT_PARTS = ["Case study", "Earnings", "Competition"] as const;

/** Splits "Case study: … Earnings: … Competition: …" into parts; falls back to one block if the labels are missing. */
function splitSnapshot(text: string): { label: string; body: string }[] {
  const re = new RegExp(`(${SNAPSHOT_PARTS.join("|")})\\s*:`, "gi");
  const hits = Array.from(text.matchAll(re));
  if (hits.length < 2) return [{ label: "Snapshot", body: text.trim() }];
  return hits.map((m, k) => ({
    label: SNAPSHOT_PARTS.find((p) => p.toLowerCase() === m[1].toLowerCase()) ?? m[1],
    body: text.slice((m.index ?? 0) + m[0].length, hits[k + 1]?.index ?? text.length).trim(),
  }));
}

/** Full-width row under both columns, one card per part, side by side on wide screens. */
function Snapshot({ text }: { text: string }) {
  const parts = splitSnapshot(text);
  return (
    <div className="border-t border-line pt-5 md:col-span-2">
      <p className="label mb-3">Snapshot · AI-generated</p>
      <div className={cn("grid gap-3", parts.length === 3 ? "md:grid-cols-3" : parts.length === 2 ? "md:grid-cols-2" : "")}>
        {parts.map((p) => (
          <div key={p.label} className="rounded-[3px] border border-line bg-paper p-4">
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">{p.label}</p>
            <p className="text-[14px] leading-relaxed text-slate-700">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="label mb-1">{label}</dt><dd className="text-[15px]">{children}</dd></div>;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="mb-3 text-[15px]">{title}</legend><div className="space-y-1.5">{children}</div></fieldset>;
}

function Check({ on, count, onClick, children }: { on: boolean; count?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="checkbox" aria-checked={on} onClick={onClick} className="flex w-full items-center gap-2.5 py-1 text-left text-[14px]">
      <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-[2px] text-[9px]", on ? "bg-accent text-warm" : "border border-slate-300 bg-white")}>{on ? "✓" : ""}</span>
      <span className={cn("flex-1", on ? "text-ink" : "text-slate-600")}>{children}</span>
      {count != null && <span className="tnum font-mono text-[11px] text-slate-400">{count}</span>}
    </button>
  );
}

export function IdeaBankSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading problems">
      <div className="mb-8 h-14 animate-pulse border-y border-line" />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-3 lg:block">{Array.from({ length: 8 }, (_, k) => <div key={k} className="h-4 animate-pulse bg-slate-100" />)}</div>
        <div>
          <div className="mb-6 h-11 animate-pulse rounded-[3px] bg-slate-100" />
          {Array.from({ length: 6 }, (_, k) => (
            <div key={k} className="border-b border-line py-5"><div className="h-4 w-3/4 animate-pulse bg-slate-100" /><div className="mt-2 h-3 w-1/3 animate-pulse bg-slate-100" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
