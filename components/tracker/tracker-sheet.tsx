"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSaved } from "@/lib/use-saved";
import { useStored } from "@/lib/store";
import { usePrograms } from "@/components/programs-provider";
import { computeStage, scoreProgram, type FitGroup } from "@/lib/rules";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/labels";
import type { Program, SavedProgram, TrackerStatus } from "@/lib/types";
import { ProgramLogo } from "@/components/program/logo";
import { StatusChip } from "@/components/program/status-chip";
import { cn } from "@/lib/cn";

const STATUSES = Object.keys(STATUS_LABEL) as TrackerStatus[];
const ACTIVE: TrackerStatus[] = ["interested", "drafting", "submitted", "interview"];
const FIT_LABEL: Record<FitGroup, string> = { now: "Apply now", soon: "2–3 months", later: "Not yet" };

/** One accent, varying weight: no rainbow. Accepted gets the "live" green, rejected fades out. */
const STATUS_STYLE: Record<TrackerStatus, string> = {
  interested: "border-line bg-white text-slate-600",
  drafting: "border-accent/30 bg-tint text-accent",
  submitted: "border-accent bg-accent text-warm",
  interview: "border-ink bg-ink text-warm",
  accepted: "border-live/50 bg-live/10 text-[#00873f]",
  rejected: "border-line bg-paper text-slate-400",
};

const BAR: Record<TrackerStatus, string> = {
  interested: "bg-slate-200", drafting: "bg-accent-soft", submitted: "bg-accent", interview: "bg-ink", accepted: "bg-live", rejected: "bg-slate-100",
};

interface Row {
  saved: SavedProgram;
  program: Program;
  deadline: string | null;
  deadlineSource: "official" | "yours" | null;
  days: number | null;
  fit: FitGroup | null;
  bestScore: number | null;
  next: { text: string; href?: string; urgent?: boolean };
}

type SortKey = "deadline" | "program" | "status" | "fit" | "score";

const daysUntil = (date: string) => Math.ceil((new Date(date + "T23:59:59").getTime() - Date.now()) / 86_400_000);

function nextAction(r: Omit<Row, "next">): Row["next"] {
  const s = r.saved.status;
  const slug = r.program.slug;
  if (s === "accepted") return { text: "Accepted. Confirm onboarding details" };
  if (s === "rejected") return { text: "Ask for feedback, then aim for the next cohort" };
  if (s === "interview") return { text: "Prepare for the interview", href: `/programs/${slug}` };
  if (s === "submitted") return { text: r.days !== null && r.days >= 0 ? "Wait for results" : "Follow up on results" };
  if (r.program.status === "closed") return { text: "Closed. Watch for the next cohort" };
  if (r.days !== null && r.days < 0) return { text: "Deadline passed. Check the next cohort" };
  if (r.days !== null && r.days <= 7) return { text: `Submit within ${r.days === 0 ? "today" : `${r.days}d`}`, href: `/coach?program=${slug}`, urgent: true };
  if (s === "drafting") {
    if (r.bestScore === null) return { text: "Review your answers with the coach", href: `/coach?program=${slug}` };
    if (r.bestScore < 7) return { text: `Improve answers (best ${r.bestScore}/10)`, href: `/coach?program=${slug}` };
    return { text: "Answers are strong. Submit", href: r.program.application_link || undefined };
  }
  if (r.fit === "later") return { text: "Close the gaps before applying", href: `/programs/${slug}` };
  if (!r.deadline) return { text: "Add the deadline from the official site" };
  return { text: "Start drafting", href: `/coach?program=${slug}` };
}

export function TrackerSheet() {
  const { saved, loaded, update, toggle } = useSaved();
  const { getProgram } = usePrograms();
  const [answers] = useStored("answers");
  const [reviews] = useStored("reviews");
  const [filter, setFilter] = useState<"all" | "active" | TrackerStatus>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "deadline", dir: 1 });

  const rows = useMemo<Row[]>(() => {
    const stage = answers ? computeStage(answers).stage : null;
    return saved.flatMap((s) => {
      const program = getProgram(s.program_slug);
      if (!program) return [];
      // Your own date wins; otherwise the program's official (pipeline-verified) deadline.
      const deadline = s.deadline ?? program.deadline ?? null;
      const deadlineSource = s.deadline ? "yours" : program.deadline ? "official" : null;
      const scores = reviews.filter((r) => r.program_slug === program.slug).map((r) => r.result.overall);
      const base = {
        saved: s, program, deadline, deadlineSource,
        days: deadline ? daysUntil(deadline) : null,
        fit: answers && stage ? scoreProgram(program, answers, stage).group : null,
        bestScore: scores.length ? Math.max(...scores) : null,
      } as Omit<Row, "next">;
      return [{ ...base, next: nextAction(base) }];
    });
  }, [saved, getProgram, answers, reviews]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<TrackerStatus, number>;
    rows.forEach((r) => c[r.saved.status]++);
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const list = rows.filter((r) => filter === "all" || (filter === "active" ? ACTIVE.includes(r.saved.status) : r.saved.status === filter));
    const val = (r: Row): string | number => {
      switch (sort.key) {
        case "deadline": return r.days ?? 99_999;
        case "program": return r.program.name.toLowerCase();
        case "status": return STATUSES.indexOf(r.saved.status);
        case "fit": return r.fit ? ["now", "soon", "later"].indexOf(r.fit) : 9;
        case "score": return -(r.bestScore ?? -1);
      }
    };
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, filter, sort]);

  if (!loaded) return null;

  const active = rows.filter((r) => ACTIVE.includes(r.saved.status));
  const upcoming = active.filter((r) => r.days !== null && r.days >= 0).sort((a, b) => a.days! - b.days!)[0];
  const dueThisWeek = active.filter((r) => r.days !== null && r.days >= 0 && r.days <= 7 && r.saved.status !== "submitted").length;

  function exportCsv() {
    const head = ["Program", "Organisation", "Type", "Program status", "Deadline", "Deadline source", "Days left", "My status", "Fit", "Best coach score", "Next action", "Notes", "Official link"];
    const body = visible.map((r) => [
      r.program.name, r.program.organisation, TYPE_LABEL[r.program.type], r.program.status ?? "unknown",
      r.deadline ?? "", r.deadlineSource ?? "", r.days ?? "", STATUS_LABEL[r.saved.status], r.fit ? FIT_LABEL[r.fit] : "",
      r.bestScore ?? "", r.next.text, r.saved.notes, r.program.application_link,
    ]);
    const csv = [head, ...body].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); // BOM so Excel reads ₹ and – correctly
    const a = Object.assign(document.createElement("a"), { href: url, download: `outcomes-tracker-${new Date().toISOString().slice(0, 10)}.csv` });
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
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 border-l border-t border-line bg-white sm:grid-cols-4">
        {[
          ["Active", String(active.length).padStart(2, "0"), `${rows.length} tracked`],
          ["Due this week", String(dueThisWeek).padStart(2, "0"), dueThisWeek ? "Not yet submitted" : "Nothing urgent"],
          ["Next deadline", upcoming ? `${upcoming.days}d` : "—", upcoming ? upcoming.program.name : "Add deadlines below"],
          ["Submitted+", String(counts.submitted + counts.interview + counts.accepted).padStart(2, "0"), `${counts.accepted} accepted`],
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
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <span key={s} title={`${STATUS_LABEL[s]}: ${counts[s]}`} className={cn("rounded-[1px]", BAR[s])} style={{ flex: counts[s] }} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filter by status">
          {(["all", "active", ...STATUSES] as const).map((f) => {
            const n = f === "all" ? rows.length : f === "active" ? active.length : counts[f];
            if (f !== "all" && f !== "active" && !n) return null;
            return (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={cn("shrink-0 rounded-[3px] border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                  filter === f ? "border-ink bg-ink text-warm" : "border-line bg-white text-slate-600 hover:text-ink")}>
                {f === "all" ? "All" : f === "active" ? "Active" : STATUS_LABEL[f]} <span className="tnum opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="ticks h-9 shrink-0 border border-line bg-white px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-600 hover:text-ink">↓ Export to Excel</button>
          <Link href="/matches" className="grid h-9 shrink-0 place-items-center rounded-[3px] bg-accent px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-warm hover:bg-accent-hover">+ Add programs</Link>
        </div>
      </div>

      {/* Sheet */}
      <div className="mt-3 overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[1180px] border-collapse text-[14px]">
          <thead>
            <tr>
              {th(null, "#", "w-10 text-center")}
              {th("program", "Program", "sticky left-0 z-10 min-w-[260px] shadow-[1px_0_0_#0b10151a]")}
              {th(null, "Program status")}
              {th("deadline", "Deadline")}
              {th("deadline", "Days left", "text-right")}
              {th("status", "My status")}
              {th("fit", "Fit")}
              {th("score", "Coach")}
              {th(null, "Next action", "min-w-[220px]")}
              {th(null, "Notes", "min-w-[200px]")}
              {th(null, "")}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const urgent = r.days !== null && r.days >= 0 && r.days <= 7 && ACTIVE.includes(r.saved.status) && r.saved.status !== "submitted";
              return (
                <tr key={r.program.slug} className={cn("group transition-colors hover:bg-tint/60", r.saved.status === "rejected" && "text-slate-400")}>
                  <td className={cn(td, "tnum text-center font-mono text-[11px] text-slate-400")}>{String(i + 1).padStart(2, "0")}</td>
                  <td className={cn(td, "sticky left-0 z-10 bg-white shadow-[1px_0_0_#0b10151a] group-hover:bg-[#f7f9ff]")}>
                    <div className="flex items-center gap-3">
                      <ProgramLogo program={r.program} size={32} />
                      <div className="min-w-0">
                        <Link href={`/programs/${r.program.slug}`} className="block truncate font-medium hover:text-accent">{r.program.name}</Link>
                        <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-slate-400">{TYPE_LABEL[r.program.type]} · {r.program.organisation}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{r.program.status && r.program.status !== "unknown" ? <StatusChip program={r.program} /> : <span className="font-mono text-[11px] text-slate-400">Unconfirmed</span>}</td>
                  <td className={td}>
                    <input type="date" value={r.deadline ?? ""} aria-label={`Deadline for ${r.program.name}`}
                      onChange={(e) => update(r.program.slug, { deadline: e.target.value || null })}
                      className="tnum h-8 w-[136px] rounded-[2px] border border-transparent bg-transparent px-1 font-mono text-[12px] outline-none hover:border-line focus:border-accent" />
                    <p className="px-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-slate-400">
                      {r.deadlineSource === "official" ? <span className="text-[#00873f]">✓ Official</span> : r.deadlineSource === "yours" ? "Your entry" : "Not set"}
                    </p>
                  </td>
                  <td className={cn(td, "tnum text-right font-mono text-[13px]", urgent ? "font-medium text-accent" : r.days !== null && r.days < 0 ? "text-slate-400" : "")}>
                    {r.days === null ? "—" : r.days < 0 ? "Passed" : r.days === 0 ? "Today" : `${r.days}d`}
                  </td>
                  <td className={td}>
                    <select value={r.saved.status} aria-label={`My status for ${r.program.name}`}
                      onChange={(e) => update(r.program.slug, { status: e.target.value as TrackerStatus })}
                      className={cn("h-8 cursor-pointer rounded-[2px] border px-2 font-mono text-[11px] uppercase tracking-[0.06em] outline-none focus:ring-2 focus:ring-accent/30", STATUS_STYLE[r.saved.status])}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className={cn(td, "whitespace-nowrap text-[13px]")}>
                    {r.fit ? <span className={cn(r.fit === "now" ? "text-accent" : "text-slate-500")}>{r.fit === "now" && "● "}{FIT_LABEL[r.fit]}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={cn(td, "tnum font-mono text-[13px]")}>
                    {r.bestScore !== null ? <span className={r.bestScore >= 7 ? "text-accent" : ""}>{r.bestScore}/10</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className={cn(td, "text-[13px]")}>
                    {r.next.href ? (
                      <Link href={r.next.href} target={r.next.href.startsWith("http") ? "_blank" : undefined} className={cn("hover:underline", r.next.urgent ? "font-medium text-accent" : "text-ink")}>→ {r.next.text}</Link>
                    ) : <span className="text-slate-600">{r.next.text}</span>}
                  </td>
                  <td className={td}>
                    <input defaultValue={r.saved.notes} placeholder="Add a note…" aria-label={`Notes for ${r.program.name}`}
                      onBlur={(e) => e.target.value !== r.saved.notes && update(r.program.slug, { notes: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="h-8 w-full rounded-[2px] border border-transparent bg-transparent px-1 text-[13px] outline-none placeholder:text-slate-300 hover:border-line focus:border-accent" />
                  </td>
                  <td className={cn(td, "whitespace-nowrap")}>
                    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.06em]">
                      {r.program.application_link && <a href={r.program.application_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Apply ↗</a>}
                      <button onClick={() => toggle(r.program.slug)} className="text-slate-300 hover:text-ink" aria-label={`Remove ${r.program.name}`}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr><td colSpan={11} className="px-3 py-10 text-center text-[14px] text-slate-500">No programs with this status.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400">
        Scroll sideways on small screens · Your own deadline overrides the official one · Changes save automatically
      </p>
    </div>
  );
}
