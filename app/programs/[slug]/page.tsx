import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgram, getPrograms } from "@/lib/programs";
import { TYPE_LABEL } from "@/lib/labels";
import { Badge, VerifyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { FitPanel } from "@/components/program/fit-panel";
import { ProgramActions } from "@/components/program/program-actions";
import type { Program } from "@/lib/types";
import { Poster } from "@/components/program/poster";
import { StatusChip } from "@/components/program/status-chip";
import { FieldSource } from "@/components/program/field-source";
import { ProgramLogo } from "@/components/program/logo";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPrograms()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getProgram(params.slug);
  return { title: p ? `${p.name} · Outcomes` : "Program · Outcomes" };
}

const UNKNOWN = <span className="text-slate-400">Being verified</span>;

function takeLabel(p: Program) {
  const t = p.what_they_take;
  if (t.kind === "none") return "Nothing. No equity or fees.";
  if (t.kind === "equity") return t.equity_percent !== null ? `${t.equity_percent}% equity` : "Equity (exact % being verified)";
  if (t.kind === "fees") return "Fees";
  return null;
}

export default async function ProgramPage({ params }: { params: { slug: string } }) {
  const p = await getProgram(params.slug);
  if (!p) notFound();
  const gets = [p.what_you_get.mentorship && "Mentorship", p.what_you_get.workspace && "Workspace", p.what_you_get.network && "Network"].filter(Boolean) as string[];

  return (
    <Page className="max-w-3xl">
      <Link href="/matches" className="text-sm text-slate-500 hover:text-ink">← All matches</Link>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge>{TYPE_LABEL[p.type]}</Badge>
        <StatusChip program={p} />
        <VerifyBadge verified={p.verified} />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <ProgramLogo program={p} size={64} />
        <div className="min-w-0">
          <h1 className="text-[34px] font-normal leading-[1.05] sm:text-5xl">{p.name}</h1>
          <p className="mt-1 text-slate-500">{p.organisation}</p>
        </div>
      </div>
      <p className="mt-4 text-lg text-slate-700">{p.summary}</p>
      <Poster program={p} className="ticks mt-8 aspect-[2.2/1] border border-line" />

      <FitPanel slug={p.slug} />

      <Card className="mt-6 divide-y divide-line">
        <Row label="Stages they accept">{p.stages_accepted.join(", ")}</Row>
        <Row label="Sectors">{p.sectors.length ? p.sectors.join(", ") : "Any sector"}</Row>
        <Row label="What you get">
          <div>{p.what_you_get.money ?? <span className="text-slate-400">No direct funding listed</span>}</div>
          <FieldSource program={p} field="what_you_get.money" />
          {gets.length > 0 && <div className="mt-1 text-slate-600">{gets.join(" · ")}</div>}
        </Row>
        <Row label="What they take">
          {takeLabel(p) ?? UNKNOWN}
          {p.what_they_take.notes && <div className="mt-1 text-sm text-slate-500">{p.what_they_take.notes}</div>}
          <FieldSource program={p} field="what_they_take.equity_percent" />
        </Row>
        <Row label="Typical timeline">{p.typical_timeline ?? UNKNOWN}<FieldSource program={p} field="typical_timeline" /></Row>
        {p.cohort_name && <Row label="Cohort">{p.cohort_name}<FieldSource program={p} field="cohort_name" /></Row>}
        <Row label="Next deadline">{p.deadline ? new Date(p.deadline).toLocaleDateString("en-IN", { dateStyle: "medium" }) : UNKNOWN}<FieldSource program={p} field="deadline" /></Row>
        {eligibilityText(p) && <Row label="Eligibility">{eligibilityText(p)}</Row>}
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-medium">What they look for</h2>
        <ul className="mt-3 space-y-2">
          {p.what_they_look_for.map((c) => (
            <li key={c} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{c}</li>
          ))}
        </ul>
      </section>

      {p.red_flags.length > 0 && (
        <section className="mt-8 rounded-card border border-line bg-slate-50 p-5">
          <h2 className="font-medium">Before you apply</h2>
          <ul className="mt-2 space-y-1.5 text-[15px] text-slate-700">{p.red_flags.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}

      <p className="mt-6 text-xs text-slate-400">
        {p.verified && p.last_checked ? `Last checked ${p.last_checked}.` : "We haven't verified this program's details yet. Always confirm dates and terms on the official site."}
      </p>

      <ProgramActions slug={p.slug} link={p.application_link} deadline={p.deadline} />
    </Page>
  );
}

function eligibilityText(p: Program) {
  const e = p.eligibility ?? {};
  const parts = [
    e.min_age || e.max_age ? `Age ${e.min_age ?? "any"}–${e.max_age ?? "any"}` : null,
    e.education && e.education !== "any" ? (e.education === "student" ? "Current students" : "Graduates") : null,
    e.requires_registered_company ? "Registered company required" : null,
    e.requires_dpiit ? "DPIIT recognition required" : null,
    e.states?.length ? `Only ${e.states.join(", ")}` : null,
    e.women_led_only ? "Women-led startups only" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}
