/**
 * Upserts data/programs.json into the Supabase `programs` table.
 * Usage: npm run seed   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Program } from "../lib/types";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

const programs: Program[] = JSON.parse(readFileSync("data/programs.json", "utf8"));
const rows = programs.map(({ slug, ...p }) => ({ id: slug, ...p, updated_at: new Date().toISOString() }));

createClient(url, key)
  .from("programs")
  .upsert(rows)
  .then(({ error }) => {
    if (error) throw error;
    console.log(`Seeded ${rows.length} programs.`);
  });
