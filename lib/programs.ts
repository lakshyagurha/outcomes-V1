import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import seed from "@/data/programs.json";
import type { Program } from "./types";
import { COLLEGE_NAME } from "./config";

const brand = (p: Program): Program => ({
  ...p,
  name: p.name.replace("[College Name]", COLLEGE_NAME),
  organisation: p.organisation.replace("[College Name]", COLLEGE_NAME),
});

/** Bundled seed data. Used as a fallback when the database is unreachable. */
export const SEED_PROGRAMS: Program[] = (seed as Program[]).map(brand);

type Row = Omit<Program, "slug"> & { id: string };

async function fetchPrograms(): Promise<Program[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return SEED_PROGRAMS;
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).from("programs").select("*").order("name");
  if (error || !data?.length) {
    console.error("programs: falling back to seed data", error?.message);
    return SEED_PROGRAMS;
  }
  return (data as Row[]).map(({ id, ...rest }) => brand({ ...rest, slug: id } as Program));
}

/** Programs from Supabase (the source of truth), cached for an hour. Server-only. */
export const getPrograms = unstable_cache(fetchPrograms, ["programs"], { revalidate: 3600, tags: ["programs"] });

export async function getProgram(slug: string) {
  return (await getPrograms()).find((p) => p.slug === slug);
}
