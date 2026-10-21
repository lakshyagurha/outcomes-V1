import { NextResponse } from "next/server";
import { runIdeaCollection } from "@/lib/ideas/collect";
import { runEstimates } from "@/lib/ideas/estimate";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Weekly (vercel.json): collect from enabled sources. Never publishes. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const collected = await runIdeaCollection();
    return NextResponse.json({ collected, estimates: await runEstimates({ limit: 30 }) });
  } catch (e) {
    console.error("ideas cron failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
