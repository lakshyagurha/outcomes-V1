"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QUESTIONS } from "./questions";
import { write } from "@/lib/store";
import type { DiagnosticAnswers } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { TickMeter } from "@/components/ui/tick-meter";
import { Logo } from "@/components/site-header";

const MAX_SECTORS = 3;

export function DiagnosticFlow() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({ sectors: [] });
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  const visible = useMemo(() => QUESTIONS.filter((q) => !q.skipIf?.(answers)), [answers]);
  const q = visible[index];
  const isLast = index === visible.length - 1;

  function finish(final: Partial<DiagnosticAnswers>) {
    const complete = { ...final } as Record<string, unknown>;
    for (const sq of QUESTIONS) if (sq.skipIf?.(final)) complete[sq.key] = sq.skipValue;
    write("answers", complete as unknown as DiagnosticAnswers);
    router.push("/result");
  }

  function choose(value: string) {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    setDir(1);
    if (isLast) return finish(next);
    setTimeout(() => setIndex((i) => i + 1), 160); // let the selection register visually
  }

  function toggleSector(value: string) {
    const cur = (answers.sectors ?? []) as string[];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : cur.length < MAX_SECTORS ? [...cur, value] : cur;
    setAnswers({ ...answers, sectors: next as DiagnosticAnswers["sectors"] });
  }

  function back() {
    if (index === 0) return router.push("/");
    setDir(-1);
    setIndex((i) => i - 1);
  }

  // Keyboard: press A, B, C… to answer.
  useEffect(() => {
    if (q.multi) return;
    const onKey = (e: KeyboardEvent) => {
      const i = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && i >= 0 && i < q.options.length) choose(q.options[i].value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = ((index + 1) / visible.length) * 100;
  const selected = answers[q.key];

  return (
    <div className="blueprint min-h-dvh">
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-10 pt-5 sm:px-6">
      <div className="flex items-center justify-between">
        <button onClick={back} className="-ml-2 px-2 py-1 font-mono text-[12px] uppercase tracking-[0.08em] text-slate-500 hover:text-ink">← Back</button>
        <Logo />
        <Link href="/" className="px-2 py-1 font-mono text-[12px] uppercase tracking-[0.08em] text-slate-500 hover:text-ink">Exit</Link>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <TickMeter value={progress} ticks={visible.length * 4} height={10} />
        <span className="tnum shrink-0 font-mono text-[12px] text-slate-500">{String(index + 1).padStart(2, "0")}/{String(visible.length).padStart(2, "0")}</span>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.section
          key={q.key}
          custom={dir}
          initial={{ opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-1 flex-col pt-10 sm:pt-16"
        >
          <p className="label mb-4 text-accent">Question {String(index + 1).padStart(2, "0")}</p>
          <h1 className="text-[30px] font-normal leading-[1.08] sm:text-[40px]">{q.title}</h1>
          {q.hint && <p className="mt-2 text-slate-500">{q.hint}</p>}

          {q.multi ? (
            <>
              <div className="mt-8 flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = (answers.sectors as string[]).includes(o.value);
                  return (
                    <button key={o.value} onClick={() => toggleSector(o.value)} aria-pressed={on}
                      className={cn("h-10 rounded-[3px] border px-3.5 text-[14px] transition-colors duration-150",
                        on ? "border-accent bg-accent text-warm" : "border-line bg-white hover:border-ink/30")}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-10">
                <Button className="w-full" disabled={!answers.sectors?.length} onClick={() => { setDir(1); if (isLast) finish(answers); else setIndex((i) => i + 1); }}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-8 grid gap-3">
              {q.options.map((o, i) => {
                const on = selected === o.value;
                return (
                  <button key={o.value} onClick={() => choose(o.value)}
                    className={cn("group ticks-hover ticks flex min-h-[60px] items-center gap-4 border px-4 text-left text-[16px] transition-colors duration-200 ease-out active:scale-[0.995]",
                      on ? "border-accent bg-accent text-warm" : "border-line bg-white hover:border-ink/25")}>
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-[2px] border font-mono text-[12px] transition-colors",
                      on ? "border-warm/40 text-warm" : "border-line text-slate-500 group-hover:border-accent group-hover:text-accent")}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{o.label}</span>
                    <span className={cn("font-mono text-[12px] transition-opacity", on ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>→</span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.section>
      </AnimatePresence>
      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
        <span className="hidden sm:inline">Press A–E to answer · </span>Private to your account
      </p>
    </div>
    </div>
  );
}
