"use client";
import { useMemo, useState } from "react";
import type { CoachResult } from "@/lib/types";

type Segment = { text: string; vague?: number };

function segment(draft: string, phrases: CoachResult["vague_phrases"]): Segment[] {
  const ranges = phrases
    .map((p, i) => ({ i, start: draft.indexOf(p.phrase), end: draft.indexOf(p.phrase) + p.phrase.length }))
    .filter((r) => r.start >= 0)
    .sort((a, b) => a.start - b.start)
    .filter((r, idx, arr) => idx === 0 || r.start >= arr[idx - 1].end); // drop overlaps
  const out: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) out.push({ text: draft.slice(cursor, r.start) });
    out.push({ text: draft.slice(r.start, r.end), vague: r.i });
    cursor = r.end;
  }
  if (cursor < draft.length) out.push({ text: draft.slice(cursor) });
  return out;
}

export function HighlightedDraft({ draft, phrases }: { draft: string; phrases: CoachResult["vague_phrases"] }) {
  const segments = useMemo(() => segment(draft, phrases), [draft, phrases]);
  const [active, setActive] = useState<number | null>(phrases.length ? 0 : null);
  return (
    <div>
      <p className="whitespace-pre-wrap ticks border border-line bg-white p-5 text-[16px] leading-[1.75]">
        {segments.map((s, i) =>
          s.vague === undefined ? <span key={i}>{s.text}</span> : (
            <button key={i} onClick={() => setActive(s.vague!)}
              className={`px-0.5 text-left underline decoration-accent decoration-[1.5px] underline-offset-[5px] decoration-dashed transition-colors ${active === s.vague ? "bg-accent/15" : "bg-tint hover:bg-accent/10"}`}>
              {s.text}
            </button>
          ),
        )}
      </p>
      {active !== null && phrases[active] && (
        <div className="mt-3 border-l-2 border-accent bg-tint p-4 text-[15px]" aria-live="polite">
          <p className="font-medium">&ldquo;{phrases[active].phrase}&rdquo;</p>
          <p className="mt-1 text-slate-700">{phrases[active].why}</p>
          <p className="mt-2"><span className="font-medium">Ask yourself:</span> {phrases[active].ask_yourself}</p>
        </div>
      )}
      {phrases.length > 0 && <p className="mt-2 text-xs text-slate-400">Tap a highlighted phrase to see why it reads as vague.</p>}
    </div>
  );
}
