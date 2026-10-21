import { STAGES, type Stage } from "@/lib/types";
import { cn } from "@/lib/cn";

export function StageLadder({ current, dark }: { current: Stage; dark?: boolean }) {
  const idx = STAGES.indexOf(current);
  return (
    <ol className="grid grid-cols-6 gap-[3px]">
      {STAGES.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={cn("h-2 rounded-[1px]", i < idx ? "bg-accent" : i === idx ? "bg-accent shadow-[0_0_0_3px_rgba(5,98,239,0.25)]" : dark ? "bg-white/12" : "bg-slate-100")} />
          <p className={cn("mt-2 hidden truncate font-mono text-[10px] uppercase tracking-[0.06em] sm:block",
            i === idx ? (dark ? "text-warm" : "text-ink") : dark ? "text-warm/35" : "text-slate-400")}>{s}</p>
        </li>
      ))}
    </ol>
  );
}
