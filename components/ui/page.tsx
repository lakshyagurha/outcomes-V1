import { cn } from "@/lib/cn";

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-content px-4 pb-24 pt-8 sm:px-6 sm:pt-14", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-2xl">
      {eyebrow && <p className="label mb-4 flex items-center gap-2"><span className="h-px w-6 bg-accent" />{eyebrow}</p>}
      <h1 className="text-[34px] font-normal leading-[1.05] sm:text-5xl">{title}</h1>
      {sub && <p className="mt-4 max-w-xl text-[17px] text-slate-600">{sub}</p>}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="ticks blueprint rounded-card border border-dashed border-line bg-white px-6 py-14 text-center">
      <p className="label mb-3">Empty</p>
      <h3 className="text-2xl font-normal">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{body}</p>
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
