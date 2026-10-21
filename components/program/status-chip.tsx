import type { Program } from "@/lib/types";
import { cn } from "@/lib/cn";

function daysUntil(date: string) {
  return Math.ceil((new Date(date + "T23:59:59").getTime() - Date.now()) / 86_400_000);
}

/** Open · closes in N days / Rolling / Upcoming / Closed. Renders nothing when status is unknown. */
export function StatusChip({ program, className }: { program: Program; className?: string }) {
  const s = program.status ?? "unknown";
  if (s === "unknown") return null;
  let label: string = s;
  let tone = "border-line text-slate-600";
  if (s === "open") {
    const d = program.deadline ? daysUntil(program.deadline) : null;
    label = d !== null && d >= 0 ? `Open · ${d === 0 ? "closes today" : `closes in ${d}d`}` : "Open";
    tone = d !== null && d <= 7 ? "border-accent bg-accent text-warm" : "border-live/40 text-[#00873f]";
  } else if (s === "rolling") { label = "Rolling"; tone = "border-live/40 text-[#00873f]"; }
  else if (s === "upcoming") label = program.opens_at ? `Opens ${new Date(program.opens_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Upcoming";
  else if (s === "closed") { label = "Closed"; tone = "border-line text-slate-400"; }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]", tone, className)}>
      {(s === "open" || s === "rolling") && <span className="h-1.5 w-1.5 rounded-full bg-live" />}
      {label}
    </span>
  );
}
