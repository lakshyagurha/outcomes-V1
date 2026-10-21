"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase, isAdmin } from "@/lib/supabase/admin";
import { applyChange, runIngest } from "@/lib/ingest/run";
import { runDiscovery } from "@/lib/ingest/discover";
import { STAGES, SECTORS } from "@/lib/types";
import { inBackground } from "@/lib/background";

async function requireAdmin() {
  const { data } = (await getServerSupabase()?.auth.getUser()) ?? { data: { user: null } };
  const email = data.user?.email;
  if (!isAdmin(email)) throw new Error("Not an admin");
  return email!;
}

const NUMBER_FIELDS = ["what_they_take.equity_percent", "eligibility.min_age", "eligibility.max_age"];
const BOOL_FIELDS = ["eligibility.requires_registered_company", "eligibility.requires_dpiit", "eligibility.women_led_only"];

/** Turns the admin's edited text back into the right type for the field. */
function parseValue(field: string, raw: string): unknown {
  const v = raw.trim();
  if (v === "" || v === "null") return null;
  if (NUMBER_FIELDS.includes(field)) { const n = Number(v); if (!Number.isFinite(n)) throw new Error("Expected a number"); return n; }
  if (BOOL_FIELDS.includes(field)) return v === "true" || v === "yes";
  if (field === "eligibility.states") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if ((field === "deadline" || field === "opens_at") && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Use YYYY-MM-DD");
  return v;
}

export async function approveProposal(form: FormData) {
  const email = await requireAdmin();
  const db = getAdminSupabase();
  const id = Number(form.get("id"));
  const { data: p } = await db.from("program_update_proposals").select("*").eq("id", id).eq("status", "pending").single();
  if (!p) return;
  const { data: program } = await db.from("programs").select("*").eq("id", p.program_id).single();
  const value = parseValue(p.field, String(form.get("value") ?? ""));
  await applyChange(program, p.field, value, p.source_url, p.quote, email, p.id);
  await db.from("program_update_proposals").update({ status: "approved", new_value: value, reviewed_by: email, reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidateTag("programs");
  revalidatePath("/admin/review");
}

export async function rejectProposal(form: FormData) {
  const email = await requireAdmin();
  await getAdminSupabase().from("program_update_proposals")
    .update({ status: "rejected", reviewed_by: email, reviewed_at: new Date().toISOString() }).eq("id", Number(form.get("id")));
  revalidatePath("/admin/review");
}

export async function runNow(form: FormData) {
  await requireAdmin();
  const only = String(form.get("only") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const summary = await runIngest({ only: only.length ? only : undefined, limit: only.length ? 50 : 10 });
  if (summary.autoApplied || summary.closed) revalidateTag("programs");
  console.log("ingest (manual)", summary);
  revalidatePath("/admin/review");
}

const list = (v: FormDataEntryValue | null) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Turns a discovered candidate into a tracked program, then fetches its page right away. */
export async function approveCandidate(form: FormData) {
  const email = await requireAdmin();
  const db = getAdminSupabase();
  const id = Number(form.get("id"));
  let slug = "";
  try {
    const { data: c } = await db.from("program_candidates").select("*").eq("id", id).maybeSingle();
    if (!c) throw new Error("That find no longer exists.");
    if (c.status !== "pending") throw new Error(`"${c.name}" was already ${c.status}.`);

    const name = String(form.get("name") || c.name).trim();
    const url = String(form.get("url") || c.url).trim();
    if (!/^https?:\/\//.test(url)) throw new Error("The official URL must start with http:// or https://");
    const type = String(form.get("type") || c.type || "incubator");
    const stages = list(form.get("stages")).filter((s) => (STAGES as readonly string[]).includes(s));
    const sectors = list(form.get("sectors")).filter((s) => (SECTORS as readonly string[]).includes(s));

    slug = slugify(name);
    const { data: clash } = await db.from("programs").select("id").eq("id", slug).maybeSingle();
    if (clash) slug = `${slug}-${id}`;

    const { error } = await db.from("programs").insert({
      id: slug, name, organisation: c.organisation ?? name, type, summary: c.summary ?? "",
      stages_accepted: stages.length ? stages : ["Idea", "Validating", "Building"],
      sectors, what_you_get: { money: null, mentorship: false, workspace: false, network: false },
      what_they_take: { kind: "unknown", equity_percent: null, notes: null },
      what_they_look_for: c.what_they_look_for?.length ? c.what_they_look_for : [],
      fit_signals: { technical_founder: null, min_team_size: null, full_time: false, student_only: false },
      application_link: url, red_flags: [], verified: false,
    });
    if (error) throw new Error(`Couldn't create the program: ${error.message}`);
    await db.from("program_sources").insert({ program_id: slug, url, kind: "official", tier: 1, cadence: "daily" });
    // A deadline seen during discovery still goes through normal field review.
    if (c.deadline) await db.from("program_update_proposals").insert({
      program_id: slug, field: "deadline", old_value: null, new_value: c.deadline, quote: c.quote, source_url: c.found_on, confidence: c.confidence,
    });
    await db.from("program_candidates").update({ status: "approved", program_id: slug, reviewed_by: email, reviewed_at: new Date().toISOString() }).eq("id", id);

    // First fetch (logo, details) happens after we respond, so adding feels instant. Failures retry on the daily run.
    const added = slug;
    inBackground(`first fetch ${added}`, async () => {
      await runIngest({ only: [added] });
      revalidateTag("programs");
    });
  } catch (e) {
    redirect(`/admin/review?error=${encodeURIComponent(e instanceof Error ? e.message : "Something went wrong")}`);
  }
  revalidateTag("programs");
  revalidatePath("/admin/review");
  redirect(`/admin/review?added=${encodeURIComponent(slug)}`);
}

export async function rejectCandidate(form: FormData) {
  const email = await requireAdmin();
  await getAdminSupabase().from("program_candidates")
    .update({ status: "rejected", reviewed_by: email, reviewed_at: new Date().toISOString() }).eq("id", Number(form.get("id")));
  revalidatePath("/admin/review");
}

export async function discoverNow(form: FormData) {
  await requireAdmin();
  const kind = String(form.get("kind") ?? "");
  const summary = await runDiscovery({ kinds: kind === "directory" || kind === "search" ? [kind] : undefined, limit: 6 });
  console.log("discovery (manual)", summary);
  revalidatePath("/admin/review");
}
