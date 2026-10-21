"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * A meter drawn as discrete vertical ticks that fill in blue, one by one.
 * Used for progress, scores and readiness.
 */
export function TickMeter({ value, max = 100, ticks = 40, height = 16, dark, className }: {
  value: number; max?: number; ticks?: number; height?: number; dark?: boolean; className?: string;
}) {
  const filled = Math.round((Math.max(0, Math.min(value, max)) / max) * ticks);
  return (
    <div className={cn("flex w-full items-end gap-[2px]", className)} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {Array.from({ length: ticks }, (_, i) => (
        <motion.span
          key={i}
          className={cn("flex-1 rounded-[1.5px]", i < filled ? "bg-accent" : dark ? "bg-white/15" : "bg-slate-100")}
          style={{ height }}
          initial={i < filled ? { scaleY: 0.3, opacity: 0.4 } : false}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: i * 0.012, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
