"use client";
import Link from "next/link";
import type { FitResult } from "@/lib/rules";
import { Badge, VerifyBadge } from "@/components/ui/badge";
import { TickMeter } from "@/components/ui/tick-meter";
import { TYPE_LABEL } from "@/lib/labels";
import { Poster } from "@/components/program/poster";
import { StatusChip } from "@/components/program/status-chip";
import { ProgramLogo } from "@/components/program/logo";
import { brandOf } from "@/lib/brand";

export function ProgramCard({ fit, saved, onToggleSave, index }: { fit: FitResult; saved: boolean; onToggleSave: () => void; index: number }) {
  const p = fit.program;
  const strengths = fit.reasons.filter((r) => r.kind === "strength").slice(0, 2);
  const gap = fit.reasons.find((r) => r.kind === "gap");
  return (
    <article className="ticks ticks-hover group relative flex h-full flex-col border border-line bg-white transition-colors duration-300 hover:border-ink/20">
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: brandOf(p.brand_color) }} />
      <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="tnum font-mono text-[11px] text-slate-400">{String(index + 1).padStart(2, "0")}</span>
          <Badge>{TYPE_LABEL[p.type]}</Badge>
        </div>
        {p.status && p.status !== "unknown" ? <StatusChip program={p} /> : <VerifyBadge verified={p.verified} />}
      </div>
      <Link href={`/programs/${p.slug}`} tabIndex={-1} aria-hidden className="block border-b border-line">
        <Poster program={p} className="aspect-[2.6/1]" />
      </Link>

      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <ProgramLogo program={p} size={44} />
          <div className="min-w-0 flex-1">
            <Link href={`/programs/${p.slug}`} className="block text-[20px] leading-tight tracking-[-0.02em] transition-colors group-hover:text-accent">{p.name}</Link>
            <p className="mt-1 text-sm text-slate-500">{p.organisation}</p>
          </div>
          <div className="text-right">
            <span className="tnum text-[32px] leading-none tracking-[-0.04em]">{fit.score}</span>
            <p className="label mt-1">Fit</p>
          </div>
        </div>
        <TickMeter value={fit.score} ticks={50} height={8} className="mt-4" />
      </div>

      <ul className="mt-5 space-y-2.5 px-5 text-[15px]">
        {strengths.map((r) => (
          <li key={r.text} className="grid grid-cols-[18px_1fr]"><span className="font-mono text-accent">+</span><span>{r.text}</span></li>
        ))}
        {gap && (
          <li className="mt-1 border-l-2 border-accent bg-tint px-3 py-2.5">
            <p><span className="label mr-1.5 text-ink">Gap</span>{gap.text}</p>
            {gap.action && <p className="mt-1 text-sm text-slate-600"><span className="font-mono text-accent">→ </span>{gap.action}</p>}
          </li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line px-5 py-3 mt-5">
        <Link href={`/programs/${p.slug}`} className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent hover:underline">Breakdown →</Link>
        <button onClick={onToggleSave} aria-pressed={saved}
          className={`h-8 rounded-[2px] border px-3 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${saved ? "border-accent bg-accent text-warm" : "border-line text-slate-600 hover:border-ink/30 hover:text-ink"}`}>
          {saved ? "Saved ✓" : "+ Save"}
        </button>
      </div>
    </article>
  );
}
