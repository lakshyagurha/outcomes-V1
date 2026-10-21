import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

/** Service-role client for server jobs and admin actions. Never import from client components. */
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  // `ws` transport: Node 20 has no native WebSocket, which supabase-js requires outside Next.js (e.g. npm run ingest).
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket as never } });
}

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (email?: string | null) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
