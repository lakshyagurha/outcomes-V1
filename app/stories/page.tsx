import { Page, PageHeader } from "@/components/ui/page";
import { StoryCards } from "@/components/stories/story-cards";

export const metadata = { title: "Applications that got in · Outcomes" };

export default function StoriesPage() {
  return (
    <Page>
      <PageHeader eyebrow="Applications that got in" title="See what a selected application looks like"
        sub="Every question the programme asks, a strong answer, and why it works. These are samples written by Outcomes; real stories from seniors are coming." />
      <StoryCards />
    </Page>
  );
}
