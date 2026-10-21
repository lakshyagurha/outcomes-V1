import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase, isAdmin } from "@/lib/supabase/admin";
import { FIELDS } from "@/lib/ingest/fields";
import { Page, PageHeader, EmptyState } from "@/components/ui/page";
import { approveProposal, rejectProposal, runNow, approveCandidate, rejectCandidate, discoverNow } from "./actions";
import { STAGES, SECTORS } from "@/lib/types";
import { SubmitButton } from "@/components/admin/submit-button";
import { isSharedHost } from "@/lib/ingest/hosts";
import { IdeasTab } from "./ideas-tab";

function Tabs({ on }: { on: "programs" | "ideas" }) {
  const t = (key: "programs" | "ideas", href: string, label: string) => (
    <Link href={href} className={`relative px-3 py-2 font-mono text-[12px] uppercase tracking-[0.08em] ${on === key ? "text-ink" : "text-slate-500 hover:text-ink"}`}>
      {on === key && <span className="absolute inset-x-3 -bottom-[1px] h-[2px] bg-accent" />}{label}
    </Link>
  );
  return <nav className="mb-10 flex border-b border-line">{t("programs", "/admin/review", "Programs")}{t("ideas", "/admin/review?tab=ideas", "Ideas")}</nav>;
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Review updates · Outcomes" };

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));

export default async function ReviewPage({ searchParams }: { searchParams: { added?: string; error?: string; tab?: string; notice?: string; focus?: string } }) {
  const { data } = (await getServerSupabase()?.auth.getUser()) ?? { data: { user: null } };
  if (!isAdmin(data.user?.email)) notFound();

  if (searchParams.tab === "ideas")
    return (
      <Page className="max-w-4xl">
        <PageHeader eyebrow="Admin" title="Review ideas" sub="AI drafts, you publish. No idea goes live, and no market figure is shown, without a click here." />
        <Tabs on="ideas" />
        {searchParams.error && <p role="alert" className="mb-8 border-l-2 border-[#d4442e] bg-white p-4 text-[15px]"><span className="mr-2 font-mono text-[12px] text-[#d4442e]">ERROR</span>{searchParams.error}</p>}
        {searchParams.notice && <p role="status" className="mb-8 border-l-2 border-live bg-white p-4 text-[15px]"><span className="mr-2 font-mono text-[12px] text-[#00873f]">✓ DONE</span>{searchParams.notice}</p>}
        <IdeasTab focus={searchParams.focus} />
      </Page>
    );

  const db = getAdminSupabase();
  const [{ data: proposals }, { data: programs }, { data: sources }, { data: candidates }, { data: discovery }] = await Promise.all([
    db.from("program_update_proposals").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(100),
    db.from("programs").select("id, name"),
    db.from("program_sources").select("program_id, url, last_fetched_at, last_status").order("last_fetched_at", { ascending: false, nullsFirst: false }),
    db.from("program_candidates").select("*").eq("status", "pending").order("confidence", { ascending: false }).limit(60),
    db.from("discovery_sources").select("id, kind, label, last_run_at, last_status").order("kind"),
  ]);
  const name = new Map((programs ?? []).map((p) => [p.id, p.name]));
  const failing = (sources ?? []).filter((s) => s.last_status?.startsWith("error"));

  return (
    <Page className="max-w-4xl">
      <PageHeader eyebrow="Admin" title="Review updates" sub="AI proposes, you approve. Nothing about money, deadlines or eligibility goes live without a click here." />
      <Tabs on="programs" />

      {searchParams.added && (
        <div role="status" className="ticks mb-8 flex flex-wrap items-center justify-between gap-3 border border-live/40 bg-white p-4">
          <p className="text-[15px]"><span className="mr-2 font-mono text-[12px] text-[#00873f]">✓ ADDED</span>
            {name.get(searchParams.added) ?? searchParams.added} is now in Outcomes and on the daily watch list.
            <span className="mt-1 block text-sm text-slate-500">Fetching its logo and details in the background. They appear in about 30 seconds.</span>
          </p>
          <Link href={`/programs/${searchParams.added}`} className="font-mono text-[12px] uppercase tracking-[0.08em] text-accent hover:underline">View program →</Link>
        </div>
      )}
      {searchParams.error && (
        <p role="alert" className="mb-8 border-l-2 border-[#d4442e] bg-white p-4 text-[15px]"><span className="mr-2 font-mono text-[12px] text-[#d4442e]">ERROR</span>{searchParams.error}</p>
      )}

      <form action={runNow} className="ticks mb-10 flex flex-col gap-3 border border-line bg-white p-4 sm:flex-row sm:items-center">
        <input name="only" placeholder="Program ids, comma-separated (blank = next 10 sources)" className="h-11 flex-1 rounded-[3px] border border-line px-3 font-mono text-[13px] outline-none focus:border-accent" />
        <SubmitButton pendingText="Running… (can take minutes)" className="h-11 rounded-[3px] bg-ink px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-warm hover:bg-accent">Run pipeline now</SubmitButton>
      </form>

      {failing.length > 0 && (
        <div className="mb-10 border-l-2 border-[#d4442e] bg-white p-4 text-sm">
          <p className="label mb-2 text-ink">{failing.length} sources failing</p>
          <ul className="space-y-1 font-mono text-[12px] text-slate-600">{failing.map((s) => <li key={s.url}>{s.program_id} · {s.last_status}</li>)}</ul>
        </div>
      )}

      {/* Discovery */}
      <section className="mb-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
          <h2 className="text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">01</span>New programs found</h2>
          <form action={discoverNow} className="flex gap-2">
            <select name="kind" className="h-9 rounded-[3px] border border-line bg-white px-2 font-mono text-[12px]">
              <option value="search">Search sweeps</option><option value="directory">Directories</option><option value="">Both</option>
            </select>
            <SubmitButton pendingText="Searching…" className="h-9 rounded-[3px] bg-ink px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-warm hover:bg-accent">Discover now</SubmitButton>
          </form>
        </div>
        <details className="mb-5 text-sm">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">{discovery?.length ?? 0} discovery sources · status</summary>
          <ul className="mt-2 divide-y divide-line border border-line bg-white font-mono text-[12px]">
            {(discovery ?? []).map((d) => (
              <li key={d.id} className="flex justify-between gap-3 px-3 py-2">
                <span><span className="text-slate-400">{d.kind}</span> · {d.label}</span>
                <span className={d.last_status?.startsWith("error") ? "text-[#d4442e]" : "text-slate-500"}>{d.last_run_at ? `${new Date(d.last_run_at).toLocaleDateString("en-IN")} · ${d.last_status?.slice(0, 60)}` : "never run"}</span>
              </li>
            ))}
          </ul>
        </details>
        {!candidates?.length ? (
          <p className="blueprint border border-dashed border-line bg-white p-6 text-sm text-slate-600">No new programs waiting. Discovery runs daily (searches) and weekly (directories).</p>
        ) : (
          <ul className="space-y-4">
            {candidates.map((c) => (
              <li key={c.id} className="ticks border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">New · {c.type ?? "type?"} · {Math.round(c.confidence * 100)}%</span>
                  <a href={c.found_on} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-slate-500 hover:text-accent">found on {new URL(c.found_on).hostname.replace("www.", "")} ↗</a>
                </div>
                <div className="px-5 pt-4">
                  <p className="text-[19px] tracking-[-0.02em]">{c.name}</p>
                  {c.organisation && <p className="text-sm text-slate-500">{c.organisation}</p>}
                  {c.summary && <p className="mt-2 text-[15px] text-slate-700">{c.summary}</p>}
                  {c.quote && <blockquote className="mt-3 border-l-2 border-accent bg-tint px-3 py-2 text-[14px] text-slate-700">&ldquo;{c.quote}&rdquo;</blockquote>}
                  {isSharedHost(c.url) && (
                    <p className="mt-3 border-l-2 border-[#d08700] bg-[#d08700]/5 px-3 py-2 text-[13px] text-slate-700">
                      This link is a post on {new URL(c.url).hostname.replace("www.", "")}, not the program&apos;s own site. Paste the official URL below for the right logo and daily tracking.
                    </p>
                  )}
                  {c.deadline && <p className="mt-2 font-mono text-[12px] text-slate-600">Deadline seen: {c.deadline} (goes to field review after approval)</p>}
                </div>
                <form action={approveCandidate} className="grid gap-2 px-5 py-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} aria-label="Name" className="h-10 rounded-[3px] border border-line px-3 text-[14px] outline-none focus:border-accent" />
                  <input name="url" defaultValue={c.url} aria-label="Official URL" className="h-10 rounded-[3px] border border-line px-3 font-mono text-[12px] outline-none focus:border-accent" />
                  <select name="type" defaultValue={c.type ?? "incubator"} aria-label="Type" className="h-10 rounded-[3px] border border-line bg-white px-2 text-[14px]">
                    {["grant", "incubator", "accelerator", "competition", "investor"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input name="stages" defaultValue={c.stages_accepted?.join(", ")} placeholder={STAGES.join(", ")} aria-label="Stages" className="h-10 rounded-[3px] border border-line px-3 text-[13px] outline-none focus:border-accent" />
                  <input name="sectors" defaultValue={c.sectors?.join(", ")} placeholder={`Any sector, or e.g. ${SECTORS.slice(0, 3).join(", ")}`} aria-label="Sectors" className="h-10 rounded-[3px] border border-line px-3 text-[13px] outline-none focus:border-accent sm:col-span-2" />
                  <div className="flex gap-2 sm:col-span-2">
                    <SubmitButton pendingText="Adding…" className="h-10 flex-1 rounded-[3px] bg-accent px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-warm hover:bg-accent-hover">Add to Outcomes</SubmitButton>
                    <SubmitButton formAction={rejectCandidate} pendingText="…" className="h-10 rounded-[3px] border border-line px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-slate-600 hover:text-ink">Not relevant</SubmitButton>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mb-4 flex items-baseline justify-between border-b border-ink pb-3">
        <h2 className="text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">02</span>Updates to known programs</h2>
      </div>
      <p className="label mb-4 text-ink">{String(proposals?.length ?? 0).padStart(2, "0")} pending proposals</p>
      {!proposals?.length ? (
        <EmptyState title="All caught up" body="When the pipeline spots a change on a program's official page, it shows up here with the exact quote it came from." />
      ) : (
        <ul className="space-y-4">
          {proposals.map((p) => (
            <li key={p.id} className="ticks border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-2.5">
                <Link href={`/programs/${p.program_id}`} className="text-[15px] hover:text-accent">{name.get(p.program_id) ?? p.program_id}</Link>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {FIELDS[p.field as keyof typeof FIELDS]?.label ?? p.field} · {Math.round(p.confidence * 100)}% confident
                  {p.flags?.length ? <span className="ml-2 text-[#d08700]">⚑ {p.flags.join(", ")}</span> : null}
                </span>
              </div>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <div><p className="label mb-1">Current</p><p className="text-slate-500 line-through decoration-slate-300">{show(p.old_value)}</p></div>
                <div><p className="label mb-1 text-accent">Proposed</p><p>{show(p.new_value)}</p></div>
              </div>
              {p.quote && (
                <blockquote className="mx-5 border-l-2 border-accent bg-tint px-3 py-2 text-[14px] text-slate-700">
                  &ldquo;{p.quote}&rdquo;
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-mono text-[11px] text-accent hover:underline">{p.source_url} ↗</a>
                </blockquote>
              )}
              <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row">
                <form action={approveProposal} className="flex flex-1 gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="value" defaultValue={Array.isArray(p.new_value) ? p.new_value.join(", ") : show(p.new_value) === "—" ? "" : String(p.new_value)}
                    aria-label="Value to publish" className="h-10 flex-1 rounded-[3px] border border-line px-3 text-[14px] outline-none focus:border-accent" />
                  <SubmitButton pendingText="Publishing…" className="h-10 rounded-[3px] bg-accent px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-warm hover:bg-accent-hover">Approve</SubmitButton>
                </form>
                <form action={rejectProposal}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton pendingText="…" className="h-10 w-full rounded-[3px] border border-line px-4 font-mono text-[12px] uppercase tracking-[0.08em] text-slate-600 hover:border-ink/30 hover:text-ink">Reject</SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
