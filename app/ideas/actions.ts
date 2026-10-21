"use server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Marks or unmarks "I'm interested". RLS limits both to the signed-in user's own row. */
export async function setInterest(ideaId: string, on: boolean): Promise<{ ok: boolean }> {
  const sb = getServerSupabase();
  const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
  if (!sb || !data.user) return { ok: false };
  const q = on
    ? sb.from("idea_interests").upsert({ user_id: data.user.id, idea_id: ideaId }, { onConflict: "user_id,idea_id", ignoreDuplicates: true })
    : sb.from("idea_interests").delete().eq("user_id", data.user.id).eq("idea_id", ideaId);
  const { error } = await q;
  return { ok: !error };
}
