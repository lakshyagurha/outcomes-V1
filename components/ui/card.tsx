import { cn } from "@/lib/cn";
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ticks rounded-card border border-line bg-white", className)} {...props} />;
}
