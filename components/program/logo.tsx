"use client";
import { useState } from "react";
import type { Program } from "@/lib/types";
import { brandOf, onBrand } from "@/lib/brand";
import { cn } from "@/lib/cn";

export function initials(name: string) {
  return name.replace(/[^A-Za-z0-9 ]/g, " ").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Program logo on a white tile; falls back to initials on the program's brand colour. */
export function ProgramLogo({ program, size = 40, className }: { program: Program; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const brand = brandOf(program.brand_color);
  if (program.logo_url && !failed)
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-[4px] border border-line bg-white", className)} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logos come from many domains */}
        <img src={program.logo_url} alt={`${program.name} logo`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}
          className="h-full w-full object-contain" style={{ padding: Math.round(size * 0.14) }} />
      </span>
    );
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-[4px] font-medium tracking-[-0.03em]", className)}
      style={{ width: size, height: size, background: brand, color: onBrand(brand), fontSize: Math.round(size * 0.38) }}>
      {initials(program.name)}
    </span>
  );
}
