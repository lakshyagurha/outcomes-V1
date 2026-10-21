"use client";
import { useSaved } from "@/lib/use-saved";
import { Button, LinkButton } from "@/components/ui/button";

/** Sticky bottom bar on mobile; one primary action (save), the rest secondary. */
export function ProgramActions({ slug, link, deadline }: { slug: string; link: string; deadline: string | null }) {
  const { isSaved, toggle, loaded } = useSaved();
  const saved = loaded && isSaved(slug);
  return (
    <div className="sticky bottom-0 -mx-4 mt-10 flex gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      {saved ? (
        <LinkButton href={`/coach?program=${slug}`} className="flex-1 sm:flex-none">Review my application</LinkButton>
      ) : (
        <Button onClick={() => toggle(slug, deadline)} className="flex-1 sm:flex-none">Save to tracker</Button>
      )}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-5 text-[15px] font-medium hover:border-slate-300">
          Official site ↗
        </a>
      ) : (
        <span className="inline-flex h-12 items-center px-2 text-sm text-slate-500">Ask your E-cell for the link</span>
      )}
    </div>
  );
}
