"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useStored } from "@/lib/store";
import { computeStage, matchPrograms, readiness } from "@/lib/rules";
import { usePrograms } from "@/components/programs-provider";
import { COLLEGE_NAME } from "@/lib/config";
import { STAGES } from "@/lib/types";
import { Page, EmptyState } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { StoryCards } from "@/components/stories/story-cards";
import { LinkButton } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { StageLadder } from "@/components/result/stage-ladder";
import { TickMeter } from "@/components/ui/tick-meter";
import { ProgramLogo } from "@/components/program/logo";

export default function DashboardPage() {
  const [answers, , loaded] = useStored("answers");
  const { programs: PROGRAMS } = usePrograms();
  const [profile] = useStored("profile");
  const [saved] = useStored("saved");
  const [reviews] = useStored("reviews");

  const stage = answers ? computeStage(answers).stage : null;
  const ready = useMemo(() => readiness({
    diagnosticDone: !!answers, answers, profile, savedCount: saved.length,
    bestCoachScore: reviews.length ? Math.max(...reviews.map((r) => r.result.overall)) : null,
  }), [answers, profile, saved, reviews]);
  const nowMatches = useMemo(() => (answers && stage ? matchPrograms(PROGRAMS, answers, stage).filter((m) => m.group === "now").slice(0, 3) : []), [answers, stage, PROGRAMS]);

  if (!loaded) return null;
  if (!answers || !stage)
    return <Page><EmptyState title="Start with your stage" body="Your dashboard fills in once you've taken the 2-minute diagnostic." action={<LinkButton href="/diagnostic">Start the diagnostic</LinkButton>} /></Page>;

  const nextItem = ready.items.find((i) => !i.done);

  return (
    <Page>
      <p className="label mb-4 flex items-center gap-2"><span className="h-px w-6 bg-accent" />Dashboard</p>
      <h1 className="text-[36px] font-normal leading-none sm:text-5xl">Your progress</h1>
      <p className="mt-2 text-slate-600">Stage: <span className="font-medium text-ink">{stage}</span>{STAGES[STAGES.indexOf(stage) + 1] ? ` · next is ${STAGES[STAGES.indexOf(stage) + 1]}` : ""}</p>

      {stage === "Exploring" && (
        <Link href="/ideas" className="ticks ticks-hover mt-8 flex items-center justify-between gap-4 border border-line bg-white p-5 transition-colors hover:border-ink/20">
          <span>
            <span className="label">Idea Bank</span>
            <span className="mt-1 block text-[19px] tracking-[-0.01em]">No idea yet? Start with problems worth solving</span>
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent">Browse →</span>
        </Link>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="label">Application readiness</p>
              <p className="mt-2 text-[72px] font-normal leading-none tracking-[-0.06em]"><CountUp to={ready.score} /><span className="text-2xl tracking-normal text-slate-300">/100</span></p>
            </div>
            <span className="tnum text-sm text-slate-500">{ready.items.filter((i) => i.done).length}/{ready.items.length} done</span>
          </div>
          <TickMeter value={ready.score} ticks={50} height={22} className="mt-5" />
          <ul className="mt-6 space-y-1">
            {ready.items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[2px] text-[10px] ${i.done ? "bg-accent text-warm" : "border border-slate-300"}`}>{i.done ? "✓" : ""}</span>
                  <span className={`flex-1 text-[15px] ${i.done ? "text-slate-400 line-through decoration-slate-300" : ""}`}>{i.label}</span>
                  <span className="tnum font-mono text-[11px] text-slate-400">+{String(i.points).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
          {nextItem && <LinkButton href={nextItem.href} className="mt-6 w-full">Next: {nextItem.label.toLowerCase()}</LinkButton>}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="label">Your stage</p>
            <p className="mb-5 mt-2 text-3xl font-normal tracking-[-0.03em]">{stage}</p>
            <StageLadder current={stage} />
            <Link href="/result" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">See what moves you forward →</Link>
          </Card>

          <Card className="p-5">
            <p className="label text-ink">Apply now</p>
            {nowMatches.length ? (
              <ul className="mt-3 space-y-2">
                {nowMatches.map((m) => (
                  <li key={m.program.slug}><Link href={`/programs/${m.program.slug}`} className="flex items-center gap-3 text-[15px] hover:text-accent"><ProgramLogo program={m.program} size={28} /><span className="flex-1 truncate">{m.program.name}</span><span className="tnum text-slate-400">{m.score}</span></Link></li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">No perfect fits yet. Your 2–3 month list is the place to start.</p>}
            <Link href="/matches" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">All matches →</Link>
          </Card>

          <Card className="blueprint p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg">Mock Interview</p>
              <span className="border border-line bg-white px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-500">Coming soon</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Practise the questions incubator panels actually ask, with feedback on each answer.</p>
          </Card>
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-normal tracking-[-0.03em]">Applications that got in</h2>
            <p className="mt-1 text-[15px] text-slate-600">Every question, a strong answer, and why it works. Samples for now; stories from {COLLEGE_NAME} seniors are coming.</p>
          </div>
          <Link href="/stories" className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent hover:underline">All →</Link>
        </div>
        <StoryCards />
      </section>
    </Page>
  );
}
