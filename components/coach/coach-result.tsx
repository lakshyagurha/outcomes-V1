"use client";
import { motion } from "framer-motion";
import type { CoachResult } from "@/lib/types";
import { CountUp } from "@/components/ui/count-up";
import { ScoreBar } from "@/components/ui/score-bar";
import { Card } from "@/components/ui/card";
import { HighlightedDraft } from "./highlighted-draft";

const fade = (d: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, delay: d } });

export function CoachResultView({ result, draft, programName }: { result: CoachResult; draft: string; programName: string }) {
  return (
    <div className="space-y-5">
      {result.strongest_line && (
        <motion.div {...fade(0)} className="ticks bg-ink p-5 text-warm sm:p-7" style={{ ["--tick-color" as string]: "#9ec6f7" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent-soft">+ Your strongest line</p>
          <p className="mt-3 text-[22px] leading-snug tracking-[-0.02em]">&ldquo;{result.strongest_line}&rdquo;</p>
          <p className="mt-3 text-sm text-warm/50">Keep this. Build the rest of your answer up to this level.</p>
        </motion.div>
      )}

      <motion.div {...fade(0.08)}>
        <Card className="grid gap-6 p-5 sm:grid-cols-[160px_1fr] sm:p-6">
          <div>
            <p className="label">Overall</p>
            <p className="mt-2 text-6xl font-normal tracking-[-0.05em]"><CountUp to={result.overall} /><span className="text-2xl text-slate-300">/10</span></p>
            <p className="mt-1 text-xs text-slate-400">for {programName}</p>
          </div>
          <div className="space-y-4">
            <ScoreBar label="Specificity" value={result.scores.specificity} />
            <ScoreBar label="Evidence" value={result.scores.evidence} />
            <ScoreBar label="Clarity" value={result.scores.clarity} />
            <ScoreBar label="Fit to program" value={result.scores.fit_to_program} />
          </div>
        </Card>
      </motion.div>

      <motion.section {...fade(0.16)}>
        <h3 className="label mb-3 text-ink">{result.vague_phrases.length ? `${result.vague_phrases.length} phrases to sharpen` : "Your draft"}</h3>
        <HighlightedDraft draft={draft} phrases={result.vague_phrases} />
      </motion.section>

      {result.missing.length > 0 && (
        <motion.section {...fade(0.22)}>
          <h3 className="label mb-3 text-ink">What a reviewer will look for that&apos;s missing</h3>
          <ul className="space-y-2">{result.missing.map((m) => <li key={m} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{m}</li>)}</ul>
        </motion.section>
      )}

      {result.follow_up_questions.length > 0 && (
        <motion.section {...fade(0.28)}>
          <h3 className="label mb-3 text-ink">Answer these, then revise</h3>
          <ol className="space-y-2">
            {result.follow_up_questions.map((q, i) => (
              <li key={q} className="flex gap-3 rounded-xl border border-line p-3"><span className="tnum font-medium text-accent">{i + 1}</span>{q}</li>
            ))}
          </ol>
        </motion.section>
      )}
    </div>
  );
}
