import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runIngest } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Called by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const only = new URL(req.url).searchParams.get("only")?.split(",").filter(Boolean);
  try {
    const summary = await runIngest({ only });
    if (summary.autoApplied || summary.closed) revalidateTag("programs");
    return NextResponse.json(summary);
  } catch (e) {
    console.error("ingest failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "ingest failed" }, { status: 500 });
  }
}
