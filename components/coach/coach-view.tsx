"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStored } from "@/lib/store";
import { pushReview } from "@/lib/sync";
import { usePrograms } from "@/components/programs-provider";
import { COMMON_QUESTIONS } from "@/lib/coach-prompt";
import { computeStage, matchPrograms } from "@/lib/rules";
import type { CoachResult, CoachReview } from "@/lib/types";
import { Page, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkingSteps } from "@/components/working-steps";
import { CoachResultView } from "./coach-result";

const field = "w-full rounded-xl border border-line bg-white px-4 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const CUSTOM = "__custom";

export function CoachView() {
  const params = useSearchParams();
  const [answers] = useStored("answers");
  const { programs: PROGRAMS, getProgram } = usePrograms();
  const [saved] = useStored("saved");
  const [profile] = useStored("profile");
  const [reviews, setReviews] = useStored("reviews");

  const [programSlug, setProgramSlug] = useState(params.get("program") ?? "");
  const [questionChoice, setQuestionChoice] = useState(COMMON_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"edit" | "working" | "result">("edit");
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(false);

  // Saved programs first, then best matches.
  const options = useMemo(() => {
    const savedSlugs = saved.map((s) => s.program_slug);
    const ranked = answers ? matchPrograms(PROGRAMS, answers, computeStage(answers).stage).filter((r) => !r.outgrown).map((r) => r.program) : PROGRAMS;
    return [...ranked.filter((p) => savedSlugs.includes(p.slug)), ...ranked.filter((p) => !savedSlugs.includes(p.slug))];
  }, [saved, answers, PROGRAMS]);
  useEffect(() => { if (!programSlug && options[0]) setProgramSlug(options[0].slug); }, [options, programSlug]);

  const program = getProgram(programSlug);
  const question = questionChoice === CUSTOM ? customQuestion.trim() : questionChoice;
  const profilePrefill = questionChoice === "What problem are you solving?" ? profile?.problem
    : questionChoice === "What traction do you have?" ? profile?.traction
    : questionChoice === "Why is your team the right one to solve this?" ? profile?.team
    : questionChoice === "What have you built so far?" ? profile?.solution : undefined;

  async function review() {
    setError("");
    setPhase("working");
    const started = Date.now();
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ programSlug, question, draft }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      // Let the step list finish so the reveal doesn't flash.
      await new Promise((r) => setTimeout(r, Math.max(0, 1200 - (Date.now() - started))));
      const r: CoachReview = { id: crypto.randomUUID(), program_slug: programSlug, question, draft, result: data.result, created_at: new Date().toISOString() };
      setReviews([r, ...reviews]);
      pushReview(r).catch(() => {});
      setResult(data.result);
      setFresh(true);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("edit");
    }
  }

  const previous = reviews.filter((r) => r.program_slug === programSlug && r.question === question);

  if (phase === "working")
    return <WorkingSteps stepMs={700} onDone={() => {}} steps={["Reading your draft", `Checking it against what ${program?.name ?? "the program"} looks for`, "Finding vague phrases and missing evidence"]} />;

  if (phase === "result" && result && program)
    return (
      <Page className="max-w-2xl">
        <PageHeader eyebrow={program.name} title={question} sub="What's working first, then what to sharpen." />
        <CoachResultView result={result} draft={draft} programName={program.name} />
        {fresh && previous.length > 1 && (
          <p className="mt-6 text-sm text-slate-600">
            Last time you scored <span className="tnum font-medium">{previous[1].result.overall}/10</span> on this question.
            {result.overall > previous[1].result.overall ? " You've improved." : ""}
          </p>
        )}
        <Button className="mt-8 w-full sm:w-auto" onClick={() => setPhase("edit")}>Revise my answer</Button>
      </Page>
    );

  return (
    <Page className="max-w-2xl">
      <PageHeader title="Application Coach" sub="Paste your draft answer and get a critique against what this specific program looks for." />
      <div className="mb-6 rounded-card bg-tint p-4 text-[15px]">
        <span className="font-medium">We critique; we don&apos;t rewrite.</span> Reviewers can spot AI-written answers. We help you sharpen your own.
      </div>

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="program" className="mb-2 block font-medium">Program</label>
          <select id="program" value={programSlug} onChange={(e) => setProgramSlug(e.target.value)} className={`${field} h-12`}>
            {options.map((p) => <option key={p.slug} value={p.slug}>{saved.some((s) => s.program_slug === p.slug) ? "★ " : ""}{p.name}</option>)}
          </select>
          {program && <p className="mt-2 text-sm text-slate-500">They look for: {program.what_they_look_for.join(" · ")}</p>}
        </div>
        <div>
          <label htmlFor="question" className="mb-2 block font-medium">Question</label>
          <select id="question" value={questionChoice} onChange={(e) => setQuestionChoice(e.target.value)} className={`${field} h-12`}>
            {COMMON_QUESTIONS.map((q) => <option key={q}>{q}</option>)}
            <option value={CUSTOM}>Another question…</option>
          </select>
          {questionChoice === CUSTOM && (
            <input value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} placeholder="Paste the question from the application form" className={`${field} mt-2 h-12`} />
          )}
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="draft" className="font-medium">Your draft</label>
            {profilePrefill && !draft && (
              <button onClick={() => setDraft(profilePrefill)} className="text-sm text-accent hover:underline">Start from my profile</button>
            )}
          </div>
          <textarea id="draft" rows={9} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write it in your own words, the way you'd explain it to a senior." className={`${field} resize-y py-3 leading-relaxed`} />
          <p className="tnum mt-1 text-right text-xs text-slate-400">{draft.length}/4000</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <Button className="w-full" disabled={!program || !question || draft.trim().length < 40 || draft.length > 4000} onClick={review}>
          Review my answer
        </Button>
        {draft.trim().length > 0 && draft.trim().length < 40 && <p className="-mt-2 text-center text-xs text-slate-400">Write a few sentences so there&apos;s something to review.</p>}
      </Card>

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-medium">Past reviews</h2>
          <ul className="divide-y divide-line rounded-card border border-line">
            {reviews.slice(0, 8).map((r) => (
              <li key={r.id}>
                <button className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => { setProgramSlug(r.program_slug); setQuestionChoice(COMMON_QUESTIONS.includes(r.question) ? r.question : CUSTOM); setCustomQuestion(r.question); setDraft(r.draft); setResult(r.result); setFresh(false); setPhase("result"); }}>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px]">{r.question}</span>
                    <span className="block truncate text-sm text-slate-500">{getProgram(r.program_slug)?.name}</span>
                  </span>
                  <span className="tnum shrink-0 font-medium">{r.result.overall}/10</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
