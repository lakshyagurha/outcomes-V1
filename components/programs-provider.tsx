"use client";
import { createContext, useContext, useMemo } from "react";
import type { Program } from "@/lib/types";

const Ctx = createContext<Program[]>([]);

export function ProgramsProvider({ programs, children }: { programs: Program[]; children: React.ReactNode }) {
  return <Ctx.Provider value={programs}>{children}</Ctx.Provider>;
}

export function usePrograms() {
  const programs = useContext(Ctx);
  return useMemo(() => {
    const bySlug = new Map(programs.map((p) => [p.slug, p]));
    return { programs, getProgram: (slug: string) => bySlug.get(slug) };
  }, [programs]);
}
