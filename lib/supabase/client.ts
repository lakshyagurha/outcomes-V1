import { createBrowserClient } from "@supabase/ssr";

export const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let client: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabase() {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
