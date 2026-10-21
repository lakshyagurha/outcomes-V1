import type { CoachResult, Program } from "./types";

export const COMMON_QUESTIONS = [
  "What problem are you solving?",
  "Who is your customer?",
  "What have you built so far?",
  "What traction do you have?",
  "Why is your team the right one to solve this?",
  "Why now?",
  "Who are your competitors and how are you different?",
];

export function systemPrompt(p: Program) {
  return `You are a strict but kind reviewer for "${p.name}" (${p.organisation}), a ${p.type} program for early-stage founders in India.
This program looks for: ${p.what_they_look_for.join("; ")}.
Stages it accepts: ${p.stages_accepted.join(", ")}.${p.sectors.length ? ` Sector focus: ${p.sectors.join(", ")}.` : ""}

You are coaching a college student founder on ONE application answer. You CRITIQUE; you never rewrite.
Rules:
- Never write replacement sentences or a sample answer. Ask questions that help the student find the specifics themselves.
- Score honestly from 1 to 10. Don't inflate. A vague answer with no evidence scores 3–4 on evidence.
- "vague_phrases" must quote EXACT substrings copied from the draft (case and punctuation preserved), at most 5.
- "strongest_line" must be an exact sentence or clause copied from the draft. Pick the most specific one.
- "missing" lists concrete things a reviewer at THIS program would want to see, at most 4.
- "follow_up_questions" has exactly 3 questions that pull out specifics such as numbers, names and examples.
- Use plain, warm, direct English. No jargon.

Respond with ONLY a JSON object, no prose and no code fences, of this exact shape:
{"overall":1-10,"scores":{"specificity":1-10,"evidence":1-10,"clarity":1-10,"fit_to_program":1-10},"vague_phrases":[{"phrase":"...","why":"...","ask_yourself":"..."}],"missing":["..."],"follow_up_questions":["...","...","..."],"strongest_line":"..."}`;
}

const clamp = (n: unknown) => Math.max(1, Math.min(10, Math.round(Number(n) || 1)));

/** Parses and sanitises the model's output. Throws if it's unusable. */
export function parseCoachResult(raw: string, draft: string): CoachResult {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const r = JSON.parse(json);
  const inDraft = (s: unknown) => typeof s === "string" && s.length > 0 && draft.includes(s);
  return {
    overall: clamp(r.overall),
    scores: {
      specificity: clamp(r.scores?.specificity),
      evidence: clamp(r.scores?.evidence),
      clarity: clamp(r.scores?.clarity),
      fit_to_program: clamp(r.scores?.fit_to_program),
    },
    // Only keep phrases we can actually highlight in the student's text.
    vague_phrases: (Array.isArray(r.vague_phrases) ? r.vague_phrases : [])
      .filter((v: { phrase?: unknown }) => inDraft(v?.phrase))
      .slice(0, 5)
      .map((v: Record<string, unknown>) => ({ phrase: String(v.phrase), why: String(v.why ?? ""), ask_yourself: String(v.ask_yourself ?? "") })),
    missing: (Array.isArray(r.missing) ? r.missing : []).map(String).slice(0, 4),
    follow_up_questions: (Array.isArray(r.follow_up_questions) ? r.follow_up_questions : []).map(String).slice(0, 3),
    strongest_line: typeof r.strongest_line === "string" ? r.strongest_line : "",
  };
}
