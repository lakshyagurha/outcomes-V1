import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Common = { variant?: Variant; className?: string; children: React.ReactNode };

const base =
  "group relative inline-flex select-none items-center justify-center gap-3 rounded-[3px] h-12 text-[15px] font-medium transition-colors duration-300 ease-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40 disabled:pointer-events-none";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-warm pl-[3px] pr-5 hover:bg-accent-hover",
  secondary: "ticks ticks-hover bg-white text-ink border border-line px-5 hover:border-ink/20",
  ghost: "text-slate-600 px-3 hover:text-ink",
};

/** Primary buttons carry a white tile with an arrow that spins on hover. */
function Inner({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  if (variant !== "primary") return <>{children}</>;
  return (
    <>
      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[2px] bg-warm text-accent transition-transform duration-500 ease-cta group-hover:rotate-[360deg]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M1 7h11M7.5 2.5 12 7l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" /></svg>
      </span>
      <span className="flex-1 text-left">{children}</span>
    </>
  );
}

export function Button({ variant = "primary", className, children, ...props }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, styles[variant], className)} {...props}><Inner variant={variant}>{children}</Inner></button>;
}

export function LinkButton({ variant = "primary", className, href, children, ...props }: Common & { href: string; target?: string; rel?: string }) {
  return <Link href={href} className={cn(base, styles[variant], className)} {...props}><Inner variant={variant}>{children}</Inner></Link>;
}
