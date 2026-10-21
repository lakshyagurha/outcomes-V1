"use client";
import { useStored } from "@/lib/store";
import { computeStage, scoreProgram } from "@/lib/rules";
import { usePrograms } from "@/components/programs-provider";
import Link from "next/link";

const GROUP_LABEL = { now: "Apply now", soon: "Apply in 2–3 months", later: "Not yet" } as const;

export function FitPanel({ slug }: { slug: string }) {
  const [answers, , loaded] = useStored("answers");
  const { getProgram } = usePrograms();
  const program = getProgram(slug);
  if (!loaded || !program) return null;
  if (!answers)
    return (
      <div className="mt-6 rounded-card bg-tint p-5 text-[15px]">
        <Link href="/diagnostic" className="font-medium text-accent">Take the 2-minute diagnostic</Link> to see how well you fit this program.
      </div>
    );
  const fit = scoreProgram(program, answers, computeStage(answers).stage);
  return (
    <div className="mt-6 rounded-card bg-tint p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">Your fit: {GROUP_LABEL[fit.group]}</p>
        <p className="tnum text-sm text-slate-600">{fit.score}/100</p>
      </div>
      <ul className="mt-3 space-y-2 text-[15px]">
        {fit.reasons.map((r) => (
          <li key={r.text}>
            <span className="font-medium">{r.kind === "strength" ? "Strong fit:" : "Gap:"}</span> {r.text}
            {r.action && <span className="block text-sm text-slate-600">To close it: {r.action}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
