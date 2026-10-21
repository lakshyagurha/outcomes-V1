"use client";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useStored } from "@/lib/store";
import { computeStage, nextSteps, STAGE_COPY } from "@/lib/rules";
import { STAGES } from "@/lib/types";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Page } from "@/components/ui/page";
import { WorkingSteps } from "@/components/working-steps";
import { StageLadder } from "./stage-ladder";

export function StageReveal() {
  const [answers, , loaded] = useStored("answers");
  const [revealed, setRevealed] = useState(false);
  const done = useCallback(() => setRevealed(true), []);

  if (!loaded) return null;
  if (!answers)
    return (
      <Page>
        <EmptyState title="No diagnostic yet" body="Answer 10 quick questions to see your honest stage." action={<LinkButton href="/diagnostic">Start the diagnostic</LinkButton>} />
      </Page>
    );

  const { stage, because } = computeStage(answers);
  const copy = STAGE_COPY[stage];
  const steps = nextSteps(answers, stage);
  const next = STAGES[STAGES.indexOf(stage) + 1];

  if (!revealed)
    return <WorkingSteps onDone={done} steps={["Reading your answers", "Weighing the evidence: users, product, revenue", "Placing you on the stage ladder"]} />;

  const idx = STAGES.indexOf(stage);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="ticks relative overflow-hidden rounded-[4px] bg-ink text-warm" style={{ ["--tick-color" as string]: "#9ec6f7" }}>
        <div className="blueprint-dark p-6 sm:p-10">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-warm/50">
            <span>Diagnosis</span>
            <span className="tnum">Stage {String(idx + 1).padStart(2, "0")} of 06</span>
          </div>
          <span aria-hidden className="pointer-events-none absolute -right-4 -top-10 select-none font-mono text-[200px] leading-none text-white/[0.04] sm:text-[280px]">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <p className="mt-10 font-mono text-[12px] uppercase tracking-[0.08em] text-accent-soft">You are at</p>
          <motion.h1 initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-[56px] font-normal leading-[0.95] tracking-[-0.05em] sm:text-[96px]">
            {stage}
          </motion.h1>
          <div className="mt-8"><StageLadder current={stage} dark /></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <p className="text-[16px] text-warm/85">{because}</p>
            <p className="text-[15px] text-warm/55">{copy.meaning}</p>
          </div>
          <p className="mt-8 border-t border-white/10 pt-6 text-[17px]">{copy.encouragement}</p>
        </div>
      </motion.div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.25 }} className="mt-12">
        <p className="label mb-3 flex items-center gap-2"><span className="h-px w-6 bg-accent" />Next moves</p>
        <h2 className="text-[28px] font-normal leading-tight sm:text-[34px]">{next ? <>3 things that will move you to <span className="text-accent">{next}</span></> : "3 things to focus on next"}</h2>
        <ol className="mt-6 border-t border-line">
          {steps.map((s, i) => (
            <li key={s} className="grid grid-cols-[48px_1fr] gap-2 border-b border-line py-5">
              <span className="tnum font-mono text-[13px] text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[16px]">{s}</span>
            </li>
          ))}
        </ol>
        <LinkButton href="/matches" className="mt-10 w-full sm:w-auto sm:min-w-[300px]">See programs that fit you</LinkButton>
        <p className="mt-4 text-sm text-slate-500">We only count evidence. If something&apos;s changed, <a href="/diagnostic" className="text-ink underline decoration-accent underline-offset-4">retake the diagnostic</a>.</p>
      </motion.section>
    </div>
  );
}
