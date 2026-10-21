import { Suspense } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { PUBLIC_IDEA_COLUMNS, type PublicIdea } from "@/lib/ideas/types";
import { Page, PageHeader } from "@/components/ui/page";
import { IdeaBank, IdeaBankSkeleton } from "@/components/ideas/idea-bank";

export const dynamic = "force-dynamic";
export const metadata = { title: "Idea Bank · Outcomes" };

export default async function IdeasPage() {
  const sb = getServerSupabase();
  const { data: auth } = (await sb?.auth.getUser()) ?? { data: { user: null } };
  // RLS returns published rows only, and the column grant hides admin-only fields.
  const [{ data: rows }, { data: mine }] = await Promise.all([
    sb ? sb.from("ideas").select(PUBLIC_IDEA_COLUMNS).eq("status", "published") : Promise.resolve({ data: [] }),
    sb && auth.user ? sb.from("idea_interests").select("idea_id").eq("user_id", auth.user.id) : Promise.resolve({ data: [] }),
  ]);
  // idea_sources is admin-only in the database; the server reads just the display names.
  const { data: sources } = await getAdminSupabase().from("idea_sources").select("id, name, homepage_url");
  const sourceName = new Map((sources ?? []).map((s) => [s.id, s.name as string]));
  const ideas: PublicIdea[] = ((rows ?? []) as Omit<PublicIdea, "source_name">[]).map((r) => ({ ...r, source_name: sourceName.get(r.source_id) ?? "Unknown source" }));

  // Logo strip: only sources that actually have published problems. Research reports have no single domain.
  const used = new Set(ideas.map((i) => i.source_id));
  const strip = (sources ?? []).filter((s) => used.has(s.id)).map((s) => {
    let domain: string | null = null;
    try { domain = s.homepage_url.includes("example.invalid") ? null : new URL(s.homepage_url).hostname; } catch {}
    return { name: s.name === "Research reports" ? "Published research reports" : s.name, domain };
  });

  return (
    <Page>
      <PageHeader eyebrow="Idea Bank" title="Problems worth solving"
        sub="Real problems found by credible sources, each linked to the original and sized by the market it sits in. Pick one that bothers you." />
      <Suspense fallback={<IdeaBankSkeleton />}>
        <IdeaBank sourceStrip={strip} ideas={ideas} interested={(mine ?? []).map((m) => m.idea_id as string)} />
      </Suspense>
      <p className="mt-16 border-t border-line pt-5 text-[13px] text-slate-500">
        Problems are summarised from the sources linked. Market figures are from the sources cited. All rights belong to the original publishers.
      </p>
    </Page>
  );
}
