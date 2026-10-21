"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Shows the real steps being performed, briefly. Calls onDone when finished. */
export function WorkingSteps({ steps, onDone, stepMs = 550 }: { steps: string[]; onDone: () => void; stepMs?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) {
      const t = setTimeout(onDone, 150);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((n) => n + 1), stepMs);
    return () => clearTimeout(t);
  }, [i, steps.length, stepMs, onDone]);

  return (
    <div className="blueprint flex min-h-[calc(100dvh-56px)] items-center justify-center px-4" aria-live="polite">
      <div className="ticks w-full max-w-md border border-line bg-white" style={{ ["--tick-color" as string]: "#0562ef" }}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="label">Processing</span>
          <span className="tnum font-mono text-[11px] text-accent">{String(Math.min(i, steps.length)).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}</span>
        </div>
        <ul>
          {steps.map((s, n) => (
            <motion.li key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: n <= i ? 1 : 0.3, x: 0 }} transition={{ duration: 0.2, delay: n * 0.05 }}
              className="flex items-center gap-3 border-b border-line px-4 py-3.5 text-[15px] last:border-b-0">
              <span className="w-10 font-mono text-[11px]">
                {n < i ? <span className="text-accent">[ok]</span> : n === i ? <span className="animate-pulse text-ink">[··]</span> : <span className="text-slate-300">[  ]</span>}
              </span>
              <span className={n <= i ? "text-ink" : "text-slate-400"}>{s}</span>
            </motion.li>
          ))}
        </ul>
        <div className="h-[2px] bg-slate-100">
          <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(i / steps.length) * 100}%` }} transition={{ duration: 0.3, ease: "easeOut" }} />
        </div>
      </div>
    </div>
  );
}
