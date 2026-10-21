import { aiProvider, generateJSON } from "@/lib/ai";
import { NextResponse } from "next/server";
import { getProgram } from "@/lib/programs";
import { parseCoachResult, systemPrompt } from "@/lib/coach-prompt";

export const runtime = "nodejs";

const MAX_DRAFT = 4000;
// Basic per-instance rate limit. Swap for a shared store (e.g. Upstash) before scaling.
const hits = new Map<string, number[]>();
const LIMIT = 10, WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  if (!aiProvider()) return NextResponse.json({ error: "The coach isn't configured yet (set GEMINI_API_KEY or ANTHROPIC_API_KEY)." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "You've reached the review limit. Try again in a few minutes." }, { status: 429 });
  hits.set(ip, [...recent, now]);

  let body: { programSlug?: string; question?: string; draft?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const program = body.programSlug ? await getProgram(body.programSlug) : undefined;
  const question = body.question?.trim();
  const draft = body.draft?.trim();
  if (!program || !question || !draft) return NextResponse.json({ error: "Pick a program, a question, and paste your draft." }, { status: 400 });
  if (draft.length < 40) return NextResponse.json({ error: "Your draft is a bit short to review. Write at least a few sentences." }, { status: 400 });
  if (draft.length > MAX_DRAFT) return NextResponse.json({ error: `Keep your draft under ${MAX_DRAFT} characters.` }, { status: 400 });

  try {
    const text = await generateJSON({
      system: systemPrompt(program),
      user: `Application question: "${question}"\n\nDraft answer:\n<draft>\n${draft}\n</draft>`,
      maxTokens: 1500,
    });
    const result = parseCoachResult(text, draft);
    return NextResponse.json({ result });
  } catch (e) {
    console.error("coach error", e);
    return NextResponse.json({ error: "The review didn't go through. Please try again." }, { status: 502 });
  }
}
