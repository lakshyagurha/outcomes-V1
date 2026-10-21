"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase, isAdmin } from "@/lib/supabase/admin";
import { inBackground } from "@/lib/background";
import { addManualIdea, runIdeaCollection } from "@/lib/ideas/collect";
import { estimateMarket, runEstimates } from "@/lib/ideas/estimate";
import { IDEA_CATEGORIES, type IdeaRow } from "@/lib/ideas/types";

const TAB = "/admin/review?tab=ideas";


async function requireAdmin() {
  const { data } = (await getServerSupabase()?.auth.getUser()) ?? { data: { user: null } };
  if (!isAdmin(data.user?.email)) throw new Error("Not an admin");
  return data.user!.email!;
}

const fail = (msg: string): never => redirect(`${TAB}&error=${encodeURIComponent(msg)}`);
const text = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };
const numOrNull = (f: FormData, k: string) => {
  const v = text(f, k);
  if (v === null) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : fail(`${k} must be a number`);
};

const MARKET_FIELDS = ["market_segment", "market_size_value", "market_size_currency", "market_size_unit", "market_geography", "market_size_year", "growth_rate", "growth_type", "growth_period", "market_source_name", "market_source_url", "market_source_quote"] as const;

/** Reads the inline-edited fields. Changing any market field clears the "verified" tick. */
async function save(form: FormData, email: string): Promise<IdeaRow> {
  const db = getAdminSupabase();
  const id = String(form.get("id"));
  const { data: before } = await db.from("ideas").select("*").eq("id", id).single<IdeaRow>();
  if (!before) fail("Idea not found");
  const category = text(form, "category");
  if (category && !(IDEA_CATEGORIES as readonly string[]).includes(category)) fail("Unknown category");
  const patch: Partial<IdeaRow> = {
    title: text(form, "title") ?? before!.title,
    source_url: text(form, "source_url") ?? before!.source_url,
    summary: text(form, "summary"), who_has_it: text(form, "who_has_it"), why_it_matters: text(form, "why_it_matters"),
    category: (category ?? before!.category) as IdeaRow["category"],
    path: text(form, "path") === "small_business" ? "small_business" : "startup",
    source_score: numOrNull(form, "source_score"), source_score_label: text(form, "source_score_label"),
    market_segment: text(form, "market_segment"),
    market_size_value: numOrNull(form, "market_size_value"),
    market_size_currency: (text(form, "market_size_currency") as IdeaRow["market_size_currency"]) ?? null,
    market_size_unit: text(form, "market_size_unit"), market_geography: text(form, "market_geography"),
    market_size_year: numOrNull(form, "market_size_year"),
    growth_rate: numOrNull(form, "growth_rate"), growth_type: (text(form, "growth_type") as IdeaRow["growth_type"]) ?? null,
    growth_period: text(form, "growth_period"),
    market_source_name: text(form, "market_source_name"), market_source_url: text(form, "market_source_url"),
    market_source_quote: text(form, "market_source_quote"),
    market_insights: text(form, "market_insights"),
    market_status: (text(form, "market_status") as IdeaRow["market_status"]) ?? before!.market_status,
  };
  const marketChanged = MARKET_FIELDS.some((k) => String(patch[k] ?? "") !== String(before![k] ?? "")) || patch.market_status !== before!.market_status;
  const verified = form.get("market_verified") === "on";
  if (marketChanged && !verified) { patch.market_verified_at = null; patch.market_verified_by = null; }
  if (verified) { patch.market_verified_at = new Date().toISOString(); patch.market_verified_by = email; }
  const { data, error } = await db.from("ideas").update(patch).eq("id", id).select("*").single<IdeaRow>();
  if (error) fail(error.message);
  return data!;
}

const CLEAR_MARKET = {
  market_segment: null, market_size_value: null, market_size_currency: null, market_size_unit: null, market_geography: null, market_size_year: null,
  growth_rate: null, growth_type: null, growth_period: null, market_source_name: null, market_source_url: null, market_source_quote: null,
  market_verified_at: null, market_verified_by: null,
};

/**
 * What publishing does to the market fields. Approve never blocks:
 * - a complete figure (value, source, link, quote) is published, and the approval counts as the check;
 * - anything else is published as not_found ("—"), so no unproven number is ever shown.
 */
function publishPatch(i: IdeaRow, email: string) {
  const now = new Date().toISOString();
  const base = { status: "published", published_at: now, reviewed_by: email };
  const complete = i.market_status === "sourced" && i.market_size_value != null && i.market_source_url && i.market_source_name && i.market_source_quote;
  if (complete) return { ...base, market_verified_at: i.market_verified_at ?? now, market_verified_by: i.market_verified_by ?? email };
  if (i.market_status === "ai_estimate" && i.market_size_value != null) return base; // labelled "AI estimate" to students
  return { ...base, ...CLEAR_MARKET, market_status: "not_found" };
}

export async function saveIdea(form: FormData) {
  await save(form, await requireAdmin());
  revalidatePath("/admin/review");
}

export async function approveIdea(form: FormData) {
  const email = await requireAdmin();
  const idea = await save(form, email);
  // The database constraint ideas_publish_requires_verified_market backs this up.
  const { error } = await getAdminSupabase().from("ideas").update(publishPatch(idea, email)).eq("id", idea.id);
  if (error) fail(error.message);
  revalidatePath("/admin/review"); revalidatePath("/ideas");
  redirect(`${TAB}&notice=${encodeURIComponent(`Published: ${idea.title}`)}`);
}

export async function rejectIdea(form: FormData) {
  const email = await requireAdmin();
  await getAdminSupabase().from("ideas").update({ status: "rejected", reviewed_by: email }).eq("id", String(form.get("id")));
  revalidatePath("/admin/review");
}

/** Publishes every selected draft that passes the rules; the rest stay as drafts and are reported. */
export async function bulkApprove(form: FormData) {
  const email = await requireAdmin();
  const ids = form.getAll("ids").map(String);
  if (!ids.length) fail("Select at least one idea");
  const db = getAdminSupabase();
  const { data } = await db.from("ideas").select("*").in("id", ids).eq("status", "draft");
  const rows = (data ?? []) as IdeaRow[];
  for (const i of rows) await db.from("ideas").update(publishPatch(i, email)).eq("id", i.id);
  revalidatePath("/admin/review"); revalidatePath("/ideas");
  redirect(`${TAB}&notice=${encodeURIComponent(`Published ${rows.length}.`)}`);
}

export async function estimateOne(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  try { await estimateMarket(id, { force: true }); }
  catch (e) { fail(`AI estimate failed: ${e instanceof Error ? e.message.slice(0, 200) : "unknown error"}`); }
  revalidatePath("/admin/review");
  redirect(`${TAB}&notice=${encodeURIComponent("AI market estimate and snapshot filled in. Edit anything before approving.")}&focus=${id}`);
}

export async function estimateAll() {
  await requireAdmin();
  inBackground("idea estimates", () => runEstimates({ limit: 50 }));
  redirect(`${TAB}&notice=${encodeURIComponent("Filling empty market data with AI in the background (about 10s per idea). Refresh in a minute or two.")}`);
}

export async function addIdeaManually(form: FormData) {
  await requireAdmin();
  const body = text(form, "text");
  const url = text(form, "url");
  if (!body || body.length < 20) fail("Paste the post or a few sentences describing the problem.");
  try { if (!url || !/^https?:$/.test(new URL(url).protocol)) throw 0; } catch { fail("Add the link to the original post (https://…)."); }
  const score = numOrNull(form, "source_score");
  let res: Awaited<ReturnType<typeof addManualIdea>>;
  try { res = await addManualIdea({ text: body!, url: url!, score, scoreLabel: text(form, "source_score_label") }); }
  catch (e) { fail(`Couldn't add it: ${e instanceof Error ? e.message.slice(0, 200) : "unknown error"}`); }
  if (!res!.ok) fail(res!.reason);
  revalidatePath("/admin/review");
  const r = res! as { id: string; duplicateOf: string | null };
  redirect(`${TAB}&notice=${encodeURIComponent(`Added as a draft${r.duplicateOf ? " (possible duplicate, see the warning)" : ""}. Review it below (highlighted).`)}&focus=${r.id}`);
}

export async function runSourceNow(form: FormData) {
  await requireAdmin();
  const slug = String(form.get("slug"));
  inBackground("idea collect", () => runIdeaCollection({ slugs: [slug] }));
  redirect(`${TAB}&notice=${encodeURIComponent(`Collecting from ${slug} in the background. New drafts appear here when it finishes.`)}`);
}

export async function addResearchReport(form: FormData) {
  await requireAdmin();
  const url = text(form, "url");
  try { if (!url || !/^https?:$/.test(new URL(url).protocol)) throw 0; } catch { fail("Paste a full report URL (https://…)"); }
  inBackground("idea report", () => runIdeaCollection({ slugs: ["research-report"], reportUrl: url! }));
  redirect(`${TAB}&notice=${encodeURIComponent("Reading the report in the background. Its problems appear as drafts when done.")}`);
}

/** Sets a source's mode and terms notes. Only after the terms have been checked (see README). */
export async function updateSource(form: FormData) {
  await requireAdmin();
  const mode = String(form.get("collection_mode"));
  if (!["rewrite", "link_only", "disabled"].includes(mode)) fail("Unknown mode");
  await getAdminSupabase().from("idea_sources").update({
    collection_mode: mode, terms_notes: text(form, "terms_notes"), terms_checked_at: mode === "disabled" ? undefined : new Date().toISOString(),
  }).eq("id", Number(form.get("id")));
  revalidatePath("/admin/review");
}
