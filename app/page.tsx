import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { COLLEGE_NAME } from "@/lib/config";
import { getPrograms } from "@/lib/programs";
import { STAGES } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/labels";
import { ProgramLogo } from "@/components/program/logo";

/** What evidence each stage requires. Mirrors lib/rules.ts in plain words. */
const LADDER: Record<(typeof STAGES)[number], string> = {
  Exploring: "No specific problem yet",
  Idea: "A problem, not yet tested",
  Validating: "Talking to real users",
  Building: "Prototype + 11 or more user conversations",
  "Early Revenue": "Someone has paid you",
  Scaling: "Recurring revenue, 100+ active users",
};

export default async function Home() {
  const PROGRAMS = await getPrograms();
  const counts = PROGRAMS.reduce<Record<string, number>>((acc, p) => ((acc[p.type] = (acc[p.type] ?? 0) + 1), acc), {});
  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="blueprint relative border-b border-line">
        <div className="mx-auto grid max-w-content gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2.5 border border-line bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-600">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" /><span className="relative h-2 w-2 rounded-full bg-live" /></span>
              {PROGRAMS.length} programs indexed · for {COLLEGE_NAME}
            </p>
            <h1 className="mt-8 text-[44px] font-normal leading-[0.98] tracking-[-0.045em] sm:text-[72px]">
              Know what to apply to, <span className="text-accent">and get in.</span>
            </h1>
            <p className="mt-6 max-w-[30em] text-[17px] leading-relaxed text-slate-600">
              Ten questions about what you&apos;ve <em className="not-italic text-ink">actually done</em> so far. We&apos;ll tell you your honest stage, and which incubators, grants and accelerators fit you right now.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <LinkButton href="/diagnostic" className="min-w-[260px]">Find my stage</LinkButton>
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-slate-500">≈ 2 min · SSB email sign-in</span>
            </div>
          </div>

          {/* Stage ladder specimen */}
          <div className="ticks relative self-start border border-line bg-white" style={{ ["--tick-color" as string]: "#0562ef" }}>
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="label">Fig. 01 — The stage ladder</span>
              <span className="label text-accent">Evidence based</span>
            </div>
            <ol>
              {STAGES.map((s, i) => (
                <li key={s} className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 transition-colors hover:bg-tint">
                  <span className="font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[15px] leading-tight">{s}</p>
                    <p className="mt-0.5 text-[13px] text-slate-500">{LADDER[s]}</p>
                  </div>
                  <span className="flex gap-[2px]" aria-hidden>
                    {Array.from({ length: 6 }, (_, t) => (
                      <span key={t} className={`h-4 w-[3px] rounded-[1.5px] transition-colors duration-300 ${t <= i ? "bg-accent" : "bg-slate-100 group-hover:bg-accent-soft"}`} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Program ticker — real names from data/programs.json */}
      <section className="border-b border-line bg-white py-4" aria-label="Programs we cover">
        <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-10 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.08em] text-slate-500 hover:[animation-play-state:paused]">
          {[...PROGRAMS, ...PROGRAMS].map((p, i) => (
            <span key={i} className="flex items-center gap-3"><ProgramLogo program={p} size={26} />{p.name}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <p className="label mb-4 flex items-center gap-2"><span className="h-px w-6 bg-accent" />How it works</p>
        <h2 className="max-w-2xl text-[32px] font-normal leading-[1.05] sm:text-[44px]">Finding programs is easy. Getting in is the hard part.</h2>
        <div className="mt-12 grid border-l border-t border-line sm:grid-cols-3">
          {[
            ["01", "Your honest stage", "Measured by evidence: user conversations, product, revenue. Not by how you'd describe yourself."],
            ["02", "Programs that fit", "Ranked by fit, with a plain reason for each one, and a concrete fix for every gap."],
            ["03", "Sharper applications", "A coach that critiques your own draft against what that program looks for. It never writes it for you."],
          ].map(([n, t, b]) => (
            <div key={n} className="group relative border-b border-r border-line bg-white p-6 transition-colors hover:bg-ink hover:text-warm sm:p-8">
              <span className="font-mono text-[11px] text-accent">{n}</span>
              <h3 className="mt-10 text-xl font-normal">{t}</h3>
              <p className="mt-2 text-[15px] text-slate-600 transition-colors group-hover:text-warm/70">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Index */}
      <section className="border-t border-line bg-ink text-warm">
        <div className="blueprint-dark">
          <div className="mx-auto grid max-w-content gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-warm/50">The index</p>
              <h2 className="mt-4 text-[32px] font-normal leading-[1.05] sm:text-[44px]">One standard card for every program.</h2>
              <p className="mt-4 max-w-md text-warm/60">What you get, what they take, what they look for, and the red flags. Anything we haven&apos;t confirmed is marked, never guessed.</p>
              <Link href="/diagnostic" className="mt-8 inline-block font-mono text-[12px] uppercase tracking-[0.08em] text-accent-soft hover:text-warm">Start the diagnostic →</Link>
            </div>
            <dl className="grid grid-cols-2 border-l border-t border-white/10 sm:grid-cols-3">
              {Object.entries(counts).map(([type, n]) => (
                <div key={type} className="border-b border-r border-white/10 p-5">
                  <dd className="tnum text-5xl font-normal tracking-[-0.04em]">{String(n).padStart(2, "0")}</dd>
                  <dt className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-warm/50">{TYPE_LABEL[type as keyof typeof TYPE_LABEL]}s</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-content flex-col gap-2 px-4 py-10 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <span>Outcomes — built for student founders</span>
        <span>For @ssb.scaler.com students · No fake numbers</span>
      </footer>
    </div>
  );
}
