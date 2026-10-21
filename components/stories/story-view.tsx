"use client";
import Link from "next/link";
import { useState } from "react";
import type { Story } from "@/lib/stories";
import { cn } from "@/lib/cn";

const count = (s: string) => ({ words: s.trim().split(/\s+/).filter(Boolean).length, chars: s.length });
const anchor = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Programme mark: its favicon on a white tile, with the brand colour as a thin strip (same pattern as program cards). */
export function StoryMark({ story, size = 44 }: { story: Story; size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-[4px] border border-line bg-white" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- favicons come from each programme's domain */}
      <img src={`https://www.google.com/s2/favicons?domain=${story.program.domain}&sz=128`} alt={`${story.program.name} logo`} className="h-[62%] w-[62%] object-contain" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: story.program.brand }} />
    </span>
  );
}

export function StoryView({ story }: { story: Story }) {
  const [notes, setNotes] = useState(true);
  const total = story.sections.reduce((n, s) => n + s.answers.length, 0);
  let qn = 0;

  return (
    <div>
      {/* Sample notice: always first, so nobody mistakes this for a real application */}
      <div role="note" className="mb-6 border-l-2 border-[#d08700] bg-white p-4 text-[14px] leading-relaxed text-slate-700">
        <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#d08700]">Sample application</span>
        Written by Outcomes to show what a strong application looks like. The founders are fictional, and this isn&apos;t a real application
        or affiliated with {story.program.name}. {story.questionsNote}
      </div>

      {/* Header */}
      <header className="ticks relative overflow-hidden border border-line bg-white p-5 sm:p-7">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: story.program.brand }} />
        <div className="flex flex-wrap items-start gap-4">
          <StoryMark story={story} size={56} />
          <div className="min-w-0 flex-1">
            <p className="label">{story.program.name}</p>
            <h1 className="mt-1 text-[30px] font-normal leading-tight tracking-[-0.03em] sm:text-[38px]">{story.idea}</h1>
            <p className="mt-3 text-[15px] text-slate-600">{story.founder.names} · {story.founder.line}</p>
          </div>
          <span className="rounded-[2px] border border-live/50 bg-live/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#00873f]">✓ {story.outcome}</span>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <div><dt className="label mb-1">Stage when applying</dt><dd className="text-[15px]">{story.founder.stage}</dd></div>
          <div><dt className="label mb-1">What the programme gives</dt><dd className="text-[15px]">{story.deal}</dd></div>
          <div><dt className="label mb-1">The form</dt><dd className="text-[15px]">{story.sections.length} sections · {total} questions</dd></div>
        </dl>
      </header>

      {/* How it went */}
      <section className="mt-10">
        <h2 className="mb-4 text-[22px] font-normal tracking-[-0.02em]">How it went</h2>
        <ol className="grid gap-px overflow-hidden border border-line bg-line sm:grid-flow-col sm:auto-cols-fr">
          {story.steps.map((s, k) => (
            <li key={s.label} className="bg-white p-4">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px]", k === story.steps.length - 1 ? "bg-live text-white" : "bg-ink text-warm")}>{k + 1}</span>
                {s.label} · {s.when}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-700">{s.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The application */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
          <h2 className="text-[26px] font-normal tracking-[-0.03em]">The application</h2>
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-600">
            <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} className="h-4 w-4 accent-[#0562EF]" />
            Show “why this works”
          </label>
        </div>

        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          {/* Section index */}
          <nav aria-label="Form sections" className="hidden lg:block">
            <ol className="sticky top-24 space-y-1">
              {story.sections.map((s, k) => (
                <li key={s.title}>
                  <a href={`#${anchor(s.title)}`} className="flex items-baseline gap-2 py-1 text-[14px] text-slate-600 hover:text-ink">
                    <span className="tnum font-mono text-[11px] text-accent">{String(k + 1).padStart(2, "0")}</span>{s.title}
                    <span className="ml-auto tnum font-mono text-[11px] text-slate-400">{s.answers.length}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-10">
            {story.sections.map((s, k) => (
              <div key={s.title} id={anchor(s.title)} className="scroll-mt-24">
                <h3 className="mb-4 flex items-baseline gap-3 text-[20px] font-normal tracking-[-0.02em]">
                  <span className="font-mono text-[12px] text-accent">{String(k + 1).padStart(2, "0")}</span>{s.title}
                </h3>
                <ol className="space-y-4">
                  {s.answers.map((a) => {
                    qn++;
                    const c = count(a.a);
                    return (
                      <li key={a.q} className={cn("grid gap-3", notes && "md:grid-cols-[1fr_260px]")}>
                        <div className="ticks border border-line bg-white p-4">
                          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[15px] font-medium leading-snug">
                            <span className="tnum font-mono text-[11px] font-normal text-slate-400">Q{qn}</span>
                            {a.q}
                            {a.required && <span className="text-accent" aria-label="required">*</span>}
                          </p>
                          {a.limit && <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-500">Limit: {a.limit}</p>}
                          {/* Read-only "filled field" so it looks like the form, not a blog post */}
                          <div className="mt-3 rounded-[3px] border border-line bg-paper px-3 py-2.5 text-[15px] leading-relaxed text-ink">{a.a}</div>
                          <p className="mt-1.5 text-right font-mono text-[10.5px] text-slate-400">{a.limit?.includes("character") ? `${c.chars} characters` : `${c.words} words`}</p>
                        </div>
                        {notes && (
                          <aside className="border-l-2 border-accent bg-tint px-4 py-3 text-[14px] leading-relaxed text-slate-700">
                            <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">Why this works</p>
                            {a.why}
                          </aside>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lessons + next steps */}
      <section className="mt-12 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="ticks border border-line bg-white p-5">
          <h2 className="mb-3 text-[20px] font-normal tracking-[-0.02em]">What they&apos;d do differently</h2>
          <ul className="space-y-2">
            {story.differently.map((d) => <li key={d} className="flex gap-3 text-[15px] leading-relaxed"><span className="text-accent">→</span>{d}</li>)}
          </ul>
        </div>
        <div className="ticks flex flex-col justify-between gap-4 border border-line bg-white p-5">
          <div>
            <h2 className="text-[20px] font-normal tracking-[-0.02em]">Your turn</h2>
            <p className="mt-1 text-[14px] text-slate-600">Write your own answers and get feedback before you apply.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={story.program.programSlug ? `/coach?program=${story.program.programSlug}` : "/coach"} className="grid h-11 place-items-center rounded-[3px] bg-accent font-medium text-warm hover:bg-accent-hover">Draft my answers in Coach</Link>
            {story.program.programSlug
              ? <Link href={`/programs/${story.program.programSlug}`} className="grid h-11 place-items-center rounded-[3px] border border-line text-[15px] hover:border-ink/20">See {story.program.short} on Outcomes</Link>
              : <a href={story.program.site} target="_blank" rel="noopener noreferrer" className="grid h-11 place-items-center rounded-[3px] border border-line text-[15px] hover:border-ink/20">{story.program.name} website ↗</a>}
          </div>
        </div>
      </section>

      <p className="mt-8 text-[13px] text-slate-500">
        Questions paraphrased from public sources:{" "}
        {story.sources.map((s, k) => <span key={s.url}>{k > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 hover:text-accent">{s.label} ↗</a></span>)}.
        Programme names and logos belong to their owners.
      </p>
    </div>
  );
}
