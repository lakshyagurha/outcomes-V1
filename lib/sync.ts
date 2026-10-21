"use client";
/**
 * Mirrors local data to Supabase when the user is signed in.
 * Strategy (kept simple for the MVP): on sign-in, pull server data; anything the
 * server lacks is pushed from this device. After that, every local write is pushed.
 */
import { getSupabase } from "./supabase/client";
import { read, write } from "./store";
import { computeStage } from "./rules";
import type { CoachReview, SavedProgram } from "./types";

export async function syncOnSignIn(userId: string) {
  const sb = getSupabase();
  if (!sb) return;

  const [{ data: profileRow }, { data: savedRows }, { data: reviewRows }] = await Promise.all([
    sb.from("founder_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("saved_programs").select("*").eq("user_id", userId),
    sb.from("coach_reviews").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  // Profile + diagnostic answers
  if (profileRow) {
    if (profileRow.diagnostic && !read("answers")) write("answers", profileRow.diagnostic);
    if (!read("profile")) write("profile", {
      startup_name: profileRow.startup_name ?? "", problem: profileRow.problem ?? "", solution: profileRow.solution ?? "",
      users_spoken_to: profileRow.users_spoken_to ?? "", traction: profileRow.traction ?? "", team: profileRow.team ?? "", sector: profileRow.sector ?? "",
    });
  }
  await pushProfile();

  // Saved programs: union by slug, server wins on conflict
  const local = read("saved");
  const server: SavedProgram[] = (savedRows ?? []).map((r: Record<string, string | null>) => ({
    program_slug: r.program_id!, status: r.status as SavedProgram["status"], deadline: r.deadline, notes: r.notes ?? "", updated_at: r.updated_at!,
  }));
  const merged = [...server, ...local.filter((l) => !server.some((s) => s.program_slug === l.program_slug))];
  write("saved", merged);
  for (const s of local.filter((l) => !server.some((x) => x.program_slug === l.program_slug))) await pushSaved(s);

  // Coach reviews
  const serverReviews: CoachReview[] = (reviewRows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string, program_slug: r.program_id as string, question: r.question as string, draft: r.draft as string,
    result: r.result_json as CoachReview["result"], created_at: r.created_at as string,
  }));
  const localReviews = read("reviews");
  write("reviews", [...serverReviews, ...localReviews.filter((l) => !serverReviews.some((s) => s.id === l.id))]);
  for (const r of localReviews.filter((l) => !serverReviews.some((s) => s.id === l.id))) await pushReview(r);
}

async function currentUserId() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function pushProfile() {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return;
  const answers = read("answers");
  const p = read("profile");
  await sb.from("founder_profiles").upsert({
    user_id: uid,
    diagnostic: answers,
    stage: answers ? computeStage(answers).stage : null,
    ...(p ?? {}),
    updated_at: new Date().toISOString(),
  });
}

export async function pushSaved(s: SavedProgram) {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return;
  await sb.from("saved_programs").upsert(
    { user_id: uid, program_id: s.program_slug, status: s.status, deadline: s.deadline, notes: s.notes, updated_at: s.updated_at },
    { onConflict: "user_id,program_id" },
  );
}

export async function removeSaved(slug: string) {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return;
  await sb.from("saved_programs").delete().eq("user_id", uid).eq("program_id", slug);
}

export async function pushReview(r: CoachReview) {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return;
  await sb.from("coach_reviews").upsert({
    id: r.id, user_id: uid, program_id: r.program_slug, question: r.question, draft: r.draft, result_json: r.result, created_at: r.created_at,
  });
}
