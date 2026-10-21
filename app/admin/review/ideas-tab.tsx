import { getAdminSupabase } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/admin/submit-button";
import { IDEA_CATEGORIES, IDEA_GOAL, type IdeaRow, type IdeaSourceRow } from "@/lib/ideas/types";
import { growth, sizeLong } from "@/lib/ideas/format";
import { approveIdea, rejectIdea, saveIdea, bulkApprove, runSourceNow, estimateOne, estimateAll, addIdeaManually, addResearchReport, updateSource } from "./idea-actions";

const input = "h-9 w-full rounded-[3px] border border-line bg-white px-2 text-[14px] outline-none focus:border-accent";
const btn = "h-9 rounded-[3px] px-3 font-mono text-[11px] uppercase tracking-[0.08em]";
const MODE_TONE: Record<string, string> = { rewrite: "text-[#00873f]", link_only: "text-accent", disabled: "text-slate-400" };

export async function IdeasTab({ focus }: { focus?: string }) {
  const db = getAdminSupabase();
  const [{ data: drafts }, { count: published }, { data: sources }] = await Promise.all([
    db.from("ideas").select("*").eq("status", "draft").order("created_at", { ascending: false }).limit(100),
    db.from("ideas").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("idea_sources").select("*").order("id"),
  ]);
  // The draft just added or refilled goes first and is highlighted.
  const rows = ((drafts ?? []) as IdeaRow[]).sort((a, b) => Number(b.id === focus) - Number(a.id === focus));
  const srcById = new Map(((sources ?? []) as IdeaSourceRow[]).map((s) => [s.id, s]));
  const dupIds = rows.map((r) => r.duplicate_of).filter(Boolean) as string[];
  const { data: dups } = dupIds.length ? await db.from("ideas").select("id, title, status").in("id", dupIds) : { data: [] };
  const dupById = new Map((dups ?? []).map((d) => [d.id, d]));
  const pending = rows.filter((r) => r.market_status === "pending").length;
  const pct = Math.min(100, Math.round(((published ?? 0) / IDEA_GOAL) * 100));

  return (
    <div className="space-y-14">
      {/* Goal counter */}
      <div className="ticks border border-line bg-white p-5">
        <div className="flex items-end justify-between">
          <p><span className="label block">Published toward the starting goal</span>
            <span className="tnum mt-2 block text-[48px] leading-none tracking-[-0.05em]">{published ?? 0}<span className="text-xl tracking-normal text-slate-300">/{IDEA_GOAL}</span></span></p>
          <span className="tnum font-mono text-[12px] text-slate-500">{rows.length} drafts · {pending} need market data</span>
        </div>
        <div className="mt-4 h-1.5 bg-slate-100"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Add one idea by hand */}
      <section>
        <h2 className="mb-4 border-b border-ink pb-3 text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">00</span>Add an idea</h2>
        <form key={focus ?? "new"} action={addIdeaManually} className="ticks space-y-3 border border-line bg-white p-4">
          <label className="block"><span className="label">Paste the post, article excerpt or your note</span>
            <textarea name="text" required rows={5} placeholder="e.g. a tweet about a fast-growing startup, or a problem someone described"
              className="mt-1 w-full rounded-[3px] border border-line px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-accent" /></label>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <label><span className="label">Link to the original</span><input name="url" type="url" required placeholder="https://…" className={input} /></label>
            <label><span className="label">Signal (optional)</span><input name="source_score" placeholder="3835" className={input} /></label>
            <label><span className="label">Signal label</span><input name="source_score_label" placeholder="MRR (USD)" className={input} /></label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate-500">AI rewrites it as a problem in our words, checks duplicates and adds a market estimate. It lands as a draft below.</p>
            <SubmitButton pendingText="Adding… (~20s)" className={`${btn} h-10 shrink-0 bg-ink text-warm hover:bg-accent`}>Add idea</SubmitButton>
          </div>
        </form>
      </section>

      {/* Sources */}
      <section>
        <h2 className="mb-4 border-b border-ink pb-3 text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">01</span>Sources</h2>
        <ul className="divide-y divide-line border border-line bg-white">
          {((sources ?? []) as IdeaSourceRow[]).map((s) => (
            <li key={s.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
              <form action={updateSource} className="grid gap-2 sm:grid-cols-[180px_150px_1fr_auto] sm:items-center">
                <input type="hidden" name="id" value={s.id} />
                <span className="text-[15px]">{s.name}
                  <span className="block font-mono text-[11px] text-slate-500">{s.last_run_at ? `${new Date(s.last_run_at).toLocaleString("en-IN")} · ${s.last_status?.slice(0, 70) ?? ""}` : "never run"}</span>
                </span>
                <select name="collection_mode" defaultValue={s.collection_mode} className={`${input} font-mono text-[12px] ${MODE_TONE[s.collection_mode]}`}>
                  <option value="disabled">disabled</option><option value="link_only">link_only</option><option value="rewrite">rewrite</option>
                </select>
                <input name="terms_notes" defaultValue={s.terms_notes ?? ""} placeholder="Terms notes" className={input} />
                <SubmitButton pendingText="Saving…" className={`${btn} border border-line bg-white text-slate-600 hover:text-ink`}>Save</SubmitButton>
              </form>
              {s.slug !== "research-report" && (
                <form action={runSourceNow} className="flex items-center">
                  <input type="hidden" name="slug" value={s.slug} />
                  <SubmitButton pendingText="Starting…" className={`${btn} bg-ink text-warm hover:bg-accent disabled:opacity-40`}>{s.collection_mode === "disabled" ? "Disabled" : "Run now"}</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addResearchReport} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="url" type="url" required placeholder="Paste a published research report URL (Redseer, Bain, Inc42…)" className={`${input} h-11 flex-1 font-mono text-[13px]`} />
          <SubmitButton pendingText="Starting…" className={`${btn} h-11 bg-ink text-warm hover:bg-accent`}>Add report</SubmitButton>
        </form>
        <p className="mt-2 text-[13px] text-slate-500">Reports use the Research reports source&apos;s mode. Turn a source on only after its terms are checked (README → Idea Bank).</p>
      </section>

      {/* Drafts */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
          <h2 className="text-[26px] font-normal tracking-[-0.03em]"><span className="mr-3 font-mono text-[12px] text-accent">02</span>Drafts</h2>
          <div className="flex gap-2">
            <form action={estimateAll}><SubmitButton pendingText="Starting…" className={`${btn} border border-line bg-white text-slate-600 hover:text-ink`}>Fill empty with AI</SubmitButton></form>
            <form id="bulk" action={bulkApprove}><SubmitButton pendingText="Publishing…" className={`${btn} bg-accent text-warm hover:bg-accent-hover`}>Approve selected</SubmitButton></form>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="border border-dashed border-line bg-white px-6 py-10 text-center text-slate-600">No drafts. Run a source or add a report.</p>
        ) : (
          <ul className="space-y-5">
            {rows.map((i) => {
              const dup = i.duplicate_of ? dupById.get(i.duplicate_of) : null;
              const src = srcById.get(i.source_id);
              const f = `idea-${i.id}`;
              return (
                <li key={i.id} id={`idea-${i.id}`} className={`ticks scroll-mt-20 border bg-white ${i.id === focus ? "border-accent ring-2 ring-accent/20" : "border-line"}`}>
                  <form id={f} action={saveIdea} className="space-y-4 p-4">
                    <input type="hidden" name="id" value={i.id} />
                    <div className="flex items-start gap-3">
                      <input type="checkbox" name="ids" value={i.id} form="bulk" aria-label="Select for bulk approve" className="mt-2.5 h-4 w-4 accent-[#0562EF]" />
                      <div className="flex-1 space-y-1">
                        <input name="title" defaultValue={i.title} className={`${input} h-10 text-[16px]`} />
                        {i.id === focus && <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Just added · review below</p>}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="font-mono text-[11px] text-slate-500">Source: {src?.name}</span>
                          <label className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="sr-only">Source link</span>
                            <input name="source_url" type="url" defaultValue={i.source_url} className={`${input} h-8 min-w-[220px] flex-1 font-mono text-[12px]`} />
                          </label>
                          <a href={i.source_url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-accent hover:underline">Open ↗</a>
                        </div>
                      </div>
                    </div>
                    {dup && (
                      <p className="border-l-2 border-[#d08700] bg-paper px-3 py-2 text-[13px]">
                        <span className="mr-2 font-mono text-[11px] text-[#d08700]">POSSIBLE DUPLICATE · {Math.round((i.duplicate_similarity ?? 0) * 100)}%</span>
                        of “{dup.title}” ({dup.status}). Reject this one if it&apos;s the same problem.
                      </p>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="md:col-span-2"><span className="label">Summary</span><textarea name="summary" defaultValue={i.summary ?? ""} rows={2} className={`${input} h-auto py-2`} /></label>
                      <label><span className="label">Who has it</span><input name="who_has_it" defaultValue={i.who_has_it ?? ""} className={input} /></label>
                      <label><span className="label">Why it matters</span><input name="why_it_matters" defaultValue={i.why_it_matters ?? ""} className={input} /></label>
                      <div className="grid grid-cols-2 gap-3">
                        <label><span className="label">Category</span><select name="category" defaultValue={i.category} className={input}>{IDEA_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                        <label><span className="label">Path</span><select name="path" defaultValue={i.path} className={input}><option value="startup">startup</option><option value="small_business">small_business</option></select></label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label><span className="label">Source score</span><input name="source_score" defaultValue={i.source_score ?? ""} className={input} /></label>
                        <label><span className="label">Score label</span><input name="source_score_label" defaultValue={i.source_score_label ?? ""} className={input} /></label>
                      </div>
                    </div>

                    {/* Market: fields | evidence, side by side */}
                    <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                      <div className="grid grid-cols-2 gap-2 text-[13px]">
                        <label className="col-span-2"><span className="label">Market status</span>
                          <select name="market_status" defaultValue={i.market_status} className={input}><option value="ai_estimate">ai_estimate</option><option value="sourced">sourced</option><option value="not_found">not_found</option><option value="pending">pending</option></select></label>
                        <label className="col-span-2"><span className="label">Segment</span><input name="market_segment" defaultValue={i.market_segment ?? ""} className={input} /></label>
                        <label><span className="label">Size</span><input name="market_size_value" defaultValue={i.market_size_value ?? ""} className={input} /></label>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="label">Cur</span><select name="market_size_currency" defaultValue={i.market_size_currency ?? ""} className={input}><option value="" /><option>INR</option><option>USD</option></select></label>
                          <label><span className="label">Unit</span><input name="market_size_unit" defaultValue={i.market_size_unit ?? ""} className={input} /></label>
                        </div>
                        <label><span className="label">Geography</span><input name="market_geography" defaultValue={i.market_geography ?? ""} className={input} /></label>
                        <label><span className="label">Year</span><input name="market_size_year" defaultValue={i.market_size_year ?? ""} className={input} /></label>
                        <label><span className="label">Growth %</span><input name="growth_rate" defaultValue={i.growth_rate ?? ""} className={input} /></label>
                        <div className="grid grid-cols-2 gap-2">
                          <label><span className="label">Type</span><select name="growth_type" defaultValue={i.growth_type ?? ""} className={input}><option value="" /><option>CAGR</option><option>YoY</option></select></label>
                          <label><span className="label">Period</span><input name="growth_period" defaultValue={i.growth_period ?? ""} className={input} /></label>
                        </div>
                        <label><span className="label">Source name</span><input name="market_source_name" defaultValue={i.market_source_name ?? ""} className={input} /></label>
                        <label><span className="label">Source URL</span><input name="market_source_url" defaultValue={i.market_source_url ?? ""} className={input} /></label>
                      </div>
                      <div className="space-y-2 bg-paper p-3">
                        <p className="label">Evidence</p>
                        <label className="block"><span className="label">Snapshot: case study · earnings · competition (shown to students)</span>
                          <textarea name="market_insights" defaultValue={i.market_insights ?? ""} rows={6} placeholder="Case study: … Earnings: … Competition: …"
                            className="w-full rounded-[3px] border border-line bg-white px-3 py-2 text-[14px] leading-relaxed text-slate-700 outline-none focus:border-accent" /></label>
                        <label className="block"><span className="label">Exact sentence from a published source (admin only, optional)</span>
                          <textarea name="market_source_quote" defaultValue={i.market_source_quote ?? ""} rows={3} placeholder="Paste the sentence that states the figure"
                            className="w-full rounded-[3px] border-l-2 border-accent bg-white px-3 py-2 text-[14px] leading-relaxed text-slate-700 outline-none" /></label>
                        {i.market_status === "sourced" ? (
                          <>
                            <p className="tnum text-[15px]">{sizeLong(i) ?? "—"} <span className="text-[#00873f]">{growth(i) ?? ""}</span></p>
                            {i.market_source_url && <a href={i.market_source_url} target="_blank" rel="noopener noreferrer" className="block break-all font-mono text-[11px] text-accent hover:underline">{i.market_source_url} ↗</a>}
                            
                            <label className="flex items-center gap-2 pt-1 text-[13px]">
                              <input type="checkbox" name="market_verified" defaultChecked={!!i.market_verified_at} className="h-4 w-4 accent-[#0562EF]" />
                              Figure checked against quote{i.market_verified_by ? ` · ${i.market_verified_by}` : ""}
                            </label>
                          </>
                        ) : (
                          <p className="text-[13px] text-slate-500">{i.market_status === "ai_estimate" ? "AI estimate. Shown to students labelled “AI estimate”. Replace with a published figure (status: sourced) when you have one." : i.market_status === "not_found" ? "No figure. Students see “—”. Use “Fill with AI” to add an estimate." : "Empty. Click “Fill with AI”, or approving publishes it with “—”."}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                      <SubmitButton formAction={approveIdea} pendingText="Publishing…" className={`${btn} bg-accent text-warm hover:bg-accent-hover`}>Approve</SubmitButton>
                      <SubmitButton pendingText="Saving…" className={`${btn} border border-line bg-white text-slate-600 hover:text-ink`}>Save</SubmitButton>
                      <SubmitButton formAction={estimateOne} pendingText="Asking AI…" className={`${btn} border border-line bg-white text-slate-600 hover:text-ink`}>Fill with AI</SubmitButton>
                      <SubmitButton formAction={rejectIdea} pendingText="Rejecting…" className={`${btn} ml-auto text-slate-500 hover:text-[#d4442e]`}>Reject</SubmitButton>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
