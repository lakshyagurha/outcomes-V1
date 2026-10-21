"use client";
import { useSaved } from "@/lib/use-saved";
import { Page, PageHeader, EmptyState } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/button";
import { TrackerSheet } from "@/components/tracker/tracker-sheet";
import { InterestedIdeas } from "@/components/ideas/interested-ideas";

export default function TrackerPage() {
  const { saved, loaded } = useSaved();
  if (!loaded) return null;
  return (
    <Page>
      <PageHeader eyebrow="Tracker" title="Your applications"
        sub="Every program you're applying to in one sheet: live status, deadlines, and the one thing to do next." />
      {saved.length === 0 ? (
        <EmptyState title="Nothing tracked yet" body="Save programs from your matches and track each one from Interested to Accepted." action={<LinkButton href="/matches">Browse my matches</LinkButton>} />
      ) : (
        <TrackerSheet />
      )}
      <InterestedIdeas />
    </Page>
  );
}
