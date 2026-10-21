"use client";
import { useState } from "react";
import type { Program } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { brandOf } from "@/lib/brand";
import { initials as toInitials } from "./logo";

/** The program's official share image, or a generated cover in our design language. */
export function Poster({ program, className }: { program: Program; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = program.poster_url && !failed ? program.poster_url : null;
  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote posters from many domains; next/image would need each whitelisted
        <img src={src} alt={`${program.name} poster`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
      ) : (
        <GeneratedCover program={program} />
      )}
      {src && program.poster_source_url && (
        <span className="absolute bottom-1.5 right-2 bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-warm/80">
          Image: {new URL(program.poster_source_url).hostname.replace("www.", "")}
        </span>
      )}
    </div>
  );
}

function GeneratedCover({ program }: { program: Program }) {
  const initials = toInitials(program.name);
  const brand = brandOf(program.brand_color);
  // Deterministic tick pattern from the slug, so every cover is unique but stable.
  const seed = program.slug.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const ticks = Array.from({ length: 28 }, (_, i) => 20 + ((seed >> (i % 24)) % 70));
  return (
    <div className="blueprint-dark relative flex h-full w-full flex-col justify-between p-4 text-warm" aria-hidden>
      <span className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(120% 90% at 100% 0%, ${brand}, transparent 60%)` }} />
      <div className="relative flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-warm/60">
        <span>{TYPE_LABEL[program.type]}</span><span>{program.organisation.slice(0, 24)}</span>
      </div>
      <div className="relative flex items-end justify-between gap-4">
        <span className="text-[44px] leading-none tracking-[-0.05em]">{initials}</span>
        <span className="flex h-10 items-end gap-[2px]">
          {ticks.map((h, i) => <span key={i} className={cn("w-[3px] rounded-[1px]", i % 5 === 0 ? "" : "bg-white/20")} style={{ height: `${h}%`, ...(i % 5 === 0 ? { background: brand === "#0B1015" ? "#0562EF" : brand } : {}) }} />)}
        </span>
      </div>
    </div>
  );
}
