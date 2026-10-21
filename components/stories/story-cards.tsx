import Link from "next/link";
import { STORIES } from "@/lib/stories";
import { StoryMark } from "./story-view";

/** Card grid used on the dashboard and /stories. */
export function StoryCards() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {STORIES.map((s) => {
        const best = s.sections[0].answers[0];
        return (
          <li key={s.slug}>
            <Link href={`/stories/${s.slug}`} className="ticks ticks-hover relative flex h-full flex-col overflow-hidden border border-line bg-white p-5 transition-colors hover:border-ink/20">
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: s.program.brand }} />
              <div className="flex items-center gap-3">
                <StoryMark story={s} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{s.program.name}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#00873f]">✓ {s.outcome}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-[15px] leading-snug">{s.idea}</p>
              <p className="mt-3 line-clamp-2 border-l-2 border-line pl-3 text-[13px] italic text-slate-500">“{best.a}”</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="rounded-[2px] border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-500">Sample</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Read the application →</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
