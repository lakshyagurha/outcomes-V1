"use client";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStored } from "@/lib/store";
import { useSaved } from "@/lib/use-saved";
import { useUser } from "@/lib/use-user";
import { computeStage, matchPrograms, type FitGroup } from "@/lib/rules";
import { usePrograms } from "@/components/programs-provider";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/button";
import { WorkingSteps } from "@/components/working-steps";
import { ProgramCard } from "./program-card";

const GROUPS: { key: FitGroup; title: string; sub: string }[] = [
  { key: "now", title: "Apply now", sub: "You meet what they look for today." },
  { key: "soon", title: "Apply in 2–3 months", sub: "Close one gap and you'll be a strong applicant." },
  { key: "later", title: "Not yet: here's what to build first", sub: "Worth knowing about. Don't spend time applying yet." },
];

export function MatchesView() {
  const [answers, , loaded] = useStored("answers");
  const { programs: PROGRAMS } = usePrograms();
  const { isSaved, toggle, saved } = useSaved();
  const { user } = useUser();
  const [ready, setReady] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("outcomes.matched") === "1");
  const done = useCallback(() => { sessionStorage.setItem("outcomes.matched", "1"); setReady(true); }, []);

  const stage = answers ? computeStage(answers).stage : null;
  const all = useMemo(() => (answers && stage ? matchPrograms(PROGRAMS, answers, stage) : []), [answers, stage, PROGRAMS]);
  const results = all.filter((r) => !r.outgrown);
  const outgrownCount = all.length - results.length;

  if (!loaded) return null;
  if (!answers || !stage)
    return <Page><EmptyState title="Find your matches" body="Take the 2-minute diagnostic first, and we'll rank every program by how well it fits you." action={<LinkButton href="/diagnostic">Start the diagnostic</LinkButton>} /></Page>;

  if (!ready)
    return <WorkingSteps onDone={done} steps={[`Checking ${PROGRAMS.length} programs against your stage`, "Comparing your team to what they look for", "Ranking by fit"]} />;

  const nowCount = results.filter((r) => r.group === "now").length;
  const spoken = answers.usersSpoken === "0" ? "haven't spoken to users yet" : `have spoken to ${answers.usersSpoken} potential users`;

  return (
    <Page>
      <PageHeader eyebrow={`Your stage: ${stage}`} title={nowCount ? `${nowCount} programs fit you right now` : "Here's where you stand"}
        sub={<>Because you {spoken}{answers.sectors.length ? ` and work in ${answers.sectors.join(", ")}` : ""}, we&apos;ve ranked all {PROGRAMS.length} programs by fit.</>} />

      {!user && saved.length > 0 && (
        <div className="ticks mb-10 flex flex-col items-start justify-between gap-4 border border-accent/30 bg-tint p-5 sm:flex-row sm:items-center">
          <p className="text-[15px]">You&apos;ve saved {saved.length} program{saved.length > 1 ? "s" : ""}. Create a free account to keep them across devices.</p>
          <LinkButton href="/signin?next=/tracker" className="shrink-0">Save your matches</LinkButton>
        </div>
      )}

      {GROUPS.map((g, gi) => {
        const items = results.filter((r) => r.group === g.key);
        return (
          <section key={g.key} className="mb-16">
            <div className="mb-4">
              <div className="flex items-baseline justify-between border-b border-ink pb-3">
                <h2 className="text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">{String(gi + 1).padStart(2, "0")}</span>{g.title}</h2>
                <span className="tnum font-mono text-[12px] text-slate-500">{String(items.length).padStart(2, "0")} programs</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{g.sub}</p>
            </div>
            {items.length === 0 ? (
              <p className="blueprint border border-dashed border-line bg-white p-6 text-sm text-slate-600">
                {g.key === "now" ? "Nothing fits perfectly yet. That's normal at your stage. Start with the 2–3 month list and the steps on your result page." : "Nothing here."}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((fit, i) => (
                  <motion.div key={fit.program.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.04 + gi * 0.05 }}>
                    <ProgramCard index={i} fit={fit} saved={isSaved(fit.program.slug)} onToggleSave={() => toggle(fit.program.slug, fit.program.deadline)} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {outgrownCount > 0 && (
        <p className="mb-8 text-sm text-slate-500">We&apos;ve hidden {outgrownCount} program{outgrownCount > 1 ? "s" : ""} built for earlier-stage teams than yours.</p>
      )}

      <div className="ticks flex flex-col items-start justify-between gap-5 bg-ink p-6 text-warm sm:flex-row sm:items-center sm:p-8" style={{ ["--tick-color" as string]: "#9ec6f7" }}>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent-soft">Next step</p>
          <p className="mt-2 text-xl">Build your founder profile once. Reuse it in every application.</p>
        </div>
        <LinkButton href="/profile" className="shrink-0">Build my profile</LinkButton>
      </div>
    </Page>
  );
}
