import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/ingest/discover";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Vercel Cron: searches daily, directories on Mondays (see vercel.json). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kind = new URL(req.url).searchParams.get("kind");
  try {
    const summary = await runDiscovery({ kinds: kind === "directory" || kind === "search" ? [kind] : undefined });
    return NextResponse.json(summary);
  } catch (e) {
    console.error("discovery failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "discovery failed" }, { status: 500 });
  }
}
