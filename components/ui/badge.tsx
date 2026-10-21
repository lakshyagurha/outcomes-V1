import { cn } from "@/lib/cn";
export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
        tone === "accent" ? "border-accent/30 bg-tint text-accent" : "border-line bg-paper text-slate-600",
        className,
      )}
      {...props}
    />
  );
}

export function VerifyBadge({ verified }: { verified: boolean }) {
  if (verified) return null;
  return (
    <span title="We haven't confirmed this program's dates and amounts yet. Check the official site before applying."
      className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d08700]" /> Details being verified
    </span>
  );
}
