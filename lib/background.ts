import { waitUntil } from "@vercel/functions";

/**
 * Runs work after the response is sent. On Vercel, waitUntil keeps the function alive
 * until it finishes; locally the long-running Node server simply keeps going.
 */
export function inBackground(label: string, work: () => Promise<unknown>) {
  const p = work().catch((e) => console.error(`[background] ${label} failed`, e));
  try { waitUntil(p); } catch { /* not on Vercel */ }
}
