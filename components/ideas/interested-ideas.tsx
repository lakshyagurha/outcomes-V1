"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useUser } from "@/lib/use-user";
import { PATH_LABEL, type IdeaPath, type MarketStatus } from "@/lib/ideas/types";
import { sizeShort } from "@/lib/ideas/format";
import { cn } from "@/lib/cn";

/** Same sheet as the program tracker, with stages for taking an idea from interest to a final pick. */
export type IdeaStage = "interested" | "researching" | "talking_to_users" | "validating" | "finalized" | "dropped";
const STAGES: IdeaStage[] = ["interested", "researching", "talking_to_users", "validating", "finalized", "dropped"];
const ACTIVE: IdeaStage[] = ["interested", "researching", "talking_to_users", "validating"];
const STAGE_LABEL: Record<IdeaStage, string> = {
  interested: "Interested", researching: "Researching", talking_to_users: "Talking to users", validating: "Validating", finalized: "Finalized", dropped: "Dropped",
};
/** One accent, varying weight, like the program tracker. Finalized gets the "live" green, dropped fades out. */
const STAGE_STYLE: Record<IdeaStage, string> = {
  interested: "border-line bg-white text-slate-600",
  researching: "border-accent/30 bg-tint text-accent",
  talking_to_users: "border-accent bg-accent text-warm",
  validating: "border-ink bg-ink text-warm",
  finalized: "border-live/50 bg-live/10 text-[#00873f]",
  dropped: "border-line bg-paper text-slate-400",
};
const BAR: Record<IdeaStage, string> = {
  interested: "bg-slate-200", researching: "bg-accent-soft", talking_to_users: "bg-accent", validating: "bg-ink", finalized: "bg-live", dropped: "bg-slate-100",
};
/** Users to speak to before an idea counts as validated (matches the diagnostic's "11+ conversations" bar). */
const USER_TARGET = 11;

interface Idea {
  title: string; category: string; path: IdeaPath; market_status: MarketStatus;
  market_size_value: number | null; market_size_currency: "INR" | "USD" | null; market_size_unit: string | null;
  market_geography: string | null; market_size_year: number | null; growth_rate: number | null; growth_type: "YoY" | "CAGR" | null; growth_period: string | null;
}
interface Row { idea_id: string; stage: IdeaStage; users_spoken: number; notes: string; created_at: string; updated_at: string; ideas: Idea | null }
type SortKey = "idea" | "stage" | "users" | "updated";

function nextAction(r: Row): { text: string; href?: string } {
  const open = `/ideas?open=${r.idea_id}`;
  switch (r.stage) {
    case "interested": return { text: "Read the problem and its original source", href: open };
    case "researching": return { text: "List 10 people who have this problem" };
    case "talking_to_users":
      return r.users_spoken >= USER_TARGET ? { text: "Enough conversations. Move to Validating" } : { text: `Talk to ${USER_TARGET - r.users_spoken} more people` };
    case "validating": return { text: "Test a simple offer: pre-orders, a waitlist or a pilot" };
    case "finalized": return { text: "Take the diagnostic and find programs", href: "/diagnostic" };
    case "dropped": return { text: "Note why, then pick the next idea", href: "/ideas" };
  }
}

const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));

export function InterestedIdeas() {
  const { user, loaded } = useUser();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | IdeaStage>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "stage", dir: 1 });

  useEffect(() => {
    const sb = getSupabase();
    if (!loaded) return;
    if (!sb || !user) return setRows([]);
    sb.from("idea_interests")
      .select("idea_id, stage, users_spoken, notes, created_at, updated_at, ideas(title, category, path, market_status, market_size_value, market_size_currency, market_size_unit, market_geography, market_size_year, growth_rate, growth_type, growth_period)")
      .eq("user_id", user.id)
      .then(({ data }: { data: Row[] | null }) => setRows((data ?? []).filter((r) => r.ideas)));
  }, [user, loaded]);

  /** Optimistic update; the row is the user's own, so RLS allows it. */
  const update = async (id: string, patch: Partial<Pick<Row, "stage" | "users_spoken" | "notes">>) => {
    const sb = getSupabase();
    if (!sb || !user) return;
    const updated_at = new Date().toISOString();
    setRows((rs) => rs?.map((r) => (r.idea_id === id ? { ...r, ...patch, updated_at } : r)) ?? null);
    await sb.from("idea_interests").update({ ...patch, updated_at }).eq("user_id", user.id).eq("idea_id", id);
  };
  const remove = async (id: string) => {
    const sb = getSupabase();
    if (!sb || !user) return;
    setRows((r) => r?.filter((x) => x.idea_id !== id) ?? null);
    await sb.from("idea_interests").delete().eq("user_id", user.id).eq("idea_id", id);
  };

  const all = useMemo(() => rows ?? [], [rows]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<IdeaStage, number>;
    all.forEach((r) => c[r.stage]++);
    return c;
  }, [all]);
  const visible = useMemo(() => {
    const list = all.filter((r) => filter === "all" || (filter === "active" ? ACTIVE.includes(r.stage) : r.stage === filter));
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "idea": return r.ideas!.title.toLowerCase();
        case "stage": return STAGES.indexOf(r.stage);
        case "users": return -r.users_spoken;
        case "updated": return -Date.parse(r.updated_at);
      }
    };
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [all, filter, sort]);

  const header = (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-ink pb-3">
      <h2 className="text-[26px] font-normal tracking-[-0.03em]">Your ideas</h2>
      <Link href="/ideas" className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent hover:underline">Idea Bank →</Link>
    </div>
  );

  if (rows === null)
    return <section className="mt-14">{header}<div className="space-y-2">{[0, 1, 2].map((k) => <div key={k} className="h-12 animate-pulse bg-slate-100" />)}</div></section>;
  if (!all.length)
    return (
      <section className="mt-14">{header}
        <p className="py-6 text-slate-600">No ideas tracked yet. Mark &ldquo;I&apos;m interested&rdquo; on any problem in the <Link href="/ideas" className="text-accent hover:underline">Idea Bank</Link> to research it here.</p>
      </section>
    );

  const active = all.filter((r) => ACTIVE.includes(r.stage));
  const spoken = all.reduce((n, r) => n + r.users_spoken, 0);
  const lead = [...active].sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage) || b.users_spoken - a.users_spoken)[0];

  function exportCsv() {
    const head = ["Problem", "Category", "Path", "Market", "Stage", "Users spoken to", "Next step", "Notes", "Added", "Updated"];
    const body = visible.map((r) => [
      r.ideas!.title, r.ideas!.category, PATH_LABEL[r.ideas!.path], sizeShort(r.ideas!) ?? "", STAGE_LABEL[r.stage], r.users_spoken,
      nextAction(r).text, r.notes, r.created_at.slice(0, 10), r.updated_at.slice(0, 10),
    ]);
    const csv = [head, ...body].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); // BOM so Excel reads ₹ correctly
    const a = Object.assign(document.createElement("a"), { href: url, download: `outcomes-ideas-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const th = (key: SortKey | null, label: string, className?: string) => (
    <th scope="col" className={cn("whitespace-nowrap border-b border-r border-line bg-paper px-3 py-2.5 text-left font-mono text-[10.5px] font-normal uppercase tracking-[0.08em] text-slate-500 last:border-r-0", className)}>
      {key ? (
        <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex items-center gap-1 hover:text-ink">
          {label}<span className={cn("text-accent", sort.key !== key && "opacity-0")}>{sort.dir === 1 ? "↑" : "↓"}</span>
        </button>
      ) : label}
    </th>
  );
  const td = "border-b border-r border-line px-3 py-2 align-middle last:border-r-0";

  return (
    <section className="mt-14">
      {header}

      {/* Summary */}
      <div className="grid grid-cols-2 border-l border-t border-line bg-white sm:grid-cols-4">
        {[
          ["Active", String(active.length).padStart(2, "0"), `${all.length} tracked`],
          ["Researching+", String(counts.researching + counts.talking_to_users + counts.validating).padStart(2, "0"), "Past first interest"],
          ["Users spoken to", String(spoken).padStart(2, "0"), lead ? `Leading: ${lead.ideas!.title}` : "Start conversations"],
          ["Finalized", String(counts.finalized).padStart(2, "0"), counts.finalized ? "Ready to build" : `${counts.dropped} dropped`],
        ].map(([label, value, sub]) => (
          <div key={label} className="border-b border-r border-line p-4">
            <p className="label">{label}</p>
            <p className="tnum mt-2 text-[34px] leading-none tracking-[-0.04em]">{value}</p>
            <p className="mt-1.5 truncate text-[13px] text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      <div className="mt-4 flex h-2 gap-[2px]" aria-hidden>
        {STAGES.filter((s) => counts[s]).map((s) => (
          <span key={s} title={`${STAGE_LABEL[s]}: ${counts[s]}`} className={cn("rounded-[1px]", BAR[s])} style={{ flex: counts[s] }} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filter by stage">
          {(["all", "active", ...STAGES] as const).map((f) => {
            const n = f === "all" ? all.length : f === "active" ? active.length : counts[f];
            if (f !== "all" && f !== "active" && !n) return null;
            return (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={cn("shrink-0 rounded-[3px] border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                  filter === f ? "border-ink bg-ink text-warm" : "border-line bg-white text-slate-600 hover:text-ink")}>
                {f === "all" ? "All" : f === "active" ? "Active" : STAGE_LABEL[f]} <span className="tnum opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="ticks h-9 shrink-0 border border-line bg-white px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-600 hover:text-ink">↓ Export to Excel</button>
          <Link href="/ideas" className="grid h-9 shrink-0 place-items-center rounded-[3px] bg-accent px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-warm hover:bg-accent-hover">+ Add ideas</Link>
        </div>
      </div>

      {/* Sheet */}
      <div className="mt-3 overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[1080px] border-collapse text-[14px]">
          <thead>
            <tr>
              {th(null, "#", "w-10 text-center")}
              {th("idea", "Problem", "sticky left-0 z-10 min-w-[300px] shadow-[1px_0_0_#0b10151a]")}
              {th(null, "Market")}
              {th("stage", "Stage")}
              {th("users", "Users spoken to", "text-right")}
              {th(null, "Next step", "min-w-[230px]")}
              {th(null, "Notes", "min-w-[220px]")}
              {th("updated", "Updated")}
              {th(null, "")}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const next = nextAction(r);
              const size = sizeShort(r.ideas!);
              const est = r.ideas!.market_status === "ai_estimate";
              return (
                <tr key={r.idea_id} className={cn("group transition-colors hover:bg-tint/60", r.stage === "dropped" && "text-slate-400")}>
                  <td className={cn(td, "tnum text-center font-mono text-[11px] text-slate-400")}>{String(i + 1).padStart(2, "0")}</td>
                  <td className={cn(td, "sticky left-0 z-10 bg-white shadow-[1px_0_0_#0b10151a] group-hover:bg-[#f7f9ff]")}>
                    <Link href={`/ideas?open=${r.idea_id}`} className="block max-w-[340px] truncate font-medium hover:text-accent" title={r.ideas!.title}>{r.ideas!.title}</Link>
                    <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">{r.ideas!.category} · {PATH_LABEL[r.ideas!.path]}</p>
                  </td>
                  <td className={cn(td, "tnum whitespace-nowrap text-[13px]")} title={est ? "AI estimate" : undefined}>
                    {size ? `${est ? "~" : ""}${size}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={td}>
                    <select value={r.stage} aria-label={`Stage for ${r.ideas!.title}`} onChange={(e) => update(r.idea_id, { stage: e.target.value as IdeaStage })}
                      className={cn("h-8 cursor-pointer rounded-[2px] border px-2 font-mono text-[11px] uppercase tracking-[0.06em] outline-none focus:ring-2 focus:ring-accent/30", STAGE_STYLE[r.stage])}>
                      {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className={cn(td, "text-right")}>
                    <div className="inline-flex items-center gap-1">
                      <button aria-label="One fewer" onClick={() => update(r.idea_id, { users_spoken: Math.max(0, r.users_spoken - 1) })}
                        className="grid h-7 w-7 place-items-center rounded-[2px] border border-line text-slate-500 hover:text-ink">−</button>
                      <span className={cn("tnum w-10 text-center font-mono text-[13px]", r.users_spoken >= USER_TARGET && "text-[#00873f]")}>{r.users_spoken}/{USER_TARGET}</span>
                      <button aria-label="One more" onClick={() => update(r.idea_id, { users_spoken: r.users_spoken + 1 })}
                        className="grid h-7 w-7 place-items-center rounded-[2px] border border-line text-slate-500 hover:text-ink">+</button>
                    </div>
                  </td>
                  <td className={cn(td, "text-[13px]")}>
                    {next.href ? <Link href={next.href} className="text-ink hover:underline">→ {next.text}</Link> : <span className="text-slate-600">{next.text}</span>}
                  </td>
                  <td className={td}>
                    <input defaultValue={r.notes} placeholder="What did you learn?" aria-label={`Notes for ${r.ideas!.title}`}
                      onBlur={(e) => e.target.value !== r.notes && update(r.idea_id, { notes: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="h-8 w-full rounded-[2px] border border-transparent bg-transparent px-1 text-[13px] outline-none placeholder:text-slate-300 hover:border-line focus:border-accent" />
                  </td>
                  <td className={cn(td, "tnum whitespace-nowrap font-mono text-[12px] text-slate-500")}>{daysAgo(r.updated_at) === 0 ? "Today" : `${daysAgo(r.updated_at)}d ago`}</td>
                  <td className={cn(td, "whitespace-nowrap")}>
                    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.06em]">
                      <Link href={`/ideas?open=${r.idea_id}`} className="text-accent hover:underline">Open ↗</Link>
                      <button onClick={() => remove(r.idea_id)} className="text-slate-300 hover:text-ink" aria-label={`Remove ${r.ideas!.title}`}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-[14px] text-slate-500">No ideas at this stage.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400">
        Scroll sideways on small screens · Aim for {USER_TARGET}+ conversations before validating · Changes save automatically
      </p>
    </section>
  );
}
