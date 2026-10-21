import Link from "next/link";
import { notFound } from "next/navigation";
import { getStory, STORIES } from "@/lib/stories";
import { Page } from "@/components/ui/page";
import { StoryView } from "@/components/stories/story-view";

export const generateStaticParams = () => STORIES.map((s) => ({ slug: s.slug }));
export function generateMetadata({ params }: { params: { slug: string } }) {
  const s = getStory(params.slug);
  return { title: s ? `${s.program.name} sample application · Outcomes` : "Application · Outcomes" };
}

export default function StoryPage({ params }: { params: { slug: string } }) {
  const story = getStory(params.slug);
  if (!story) notFound();
  return (
    <Page className="max-w-5xl">
      <Link href="/stories" className="mb-6 inline-block font-mono text-[12px] uppercase tracking-[0.08em] text-slate-500 hover:text-ink">← Applications that got in</Link>
      <StoryView story={story} />
    </Page>
  );
}
