import Anthropic from "@anthropic-ai/sdk";

/**
 * One function for "send a prompt, get JSON text back", so the AI provider can be
 * swapped with AI_PROVIDER=anthropic|gemini without touching the coach or the pipeline.
 * Default: Gemini when GEMINI_API_KEY is set and AI_PROVIDER isn't, otherwise Anthropic.
 */
export type Provider = "anthropic" | "gemini";

export function aiProvider(): Provider | null {
  const explicit = process.env.AI_PROVIDER as Provider | undefined;
  if (explicit === "anthropic" || explicit === "gemini") return explicit;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// "-latest" aliases track Google's newest models, so they don't get retired under us.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-pro-latest";
/** Cheaper model for high-volume page extraction. */
export const GEMINI_FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-flash-lite-latest";

export async function generateJSON({ system, user, maxTokens = 2000, fast = false }: { system: string; user: string; maxTokens?: number; fast?: boolean }): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new Error("No AI provider configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.");

  if (provider === "anthropic") {
    const msg = await new Anthropic().messages.create({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] });
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  }

  await throttle();
  const res = await withRetry(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fast ? GEMINI_FAST_MODEL : GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      // Thinking models count reasoning tokens against the output budget, so leave headroom.
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens * 4, temperature: 0.2 },
    }),
  }));
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${body?.error?.message ?? "request failed"}`);
  // Skip "thought" parts from thinking models; keep only the answer.
  const text = (body?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error(`Gemini returned no text (${body?.candidates?.[0]?.finishReason ?? "unknown reason"})`);
  return text;
}

/** Retries overloaded / rate-limited responses (429, 500, 503) with backoff: 2s, 5s, 12s. */
async function withRetry(call: () => Promise<Response>): Promise<Response> {
  const waits = [4000, 10000, 20000];
  for (let i = 0; ; i++) {
    const res = await call();
    if (![429, 500, 503].includes(res.status) || i >= waits.length) return res;
    await new Promise((r) => setTimeout(r, waits[i]));
  }
}

/**
 * Spaces out Gemini calls so batch jobs stay inside free-tier per-minute limits.
 * Tune with AI_MIN_INTERVAL_MS (0 disables, e.g. once billing is on).
 */
let nextSlot = 0;
async function throttle() {
  const gap = Number(process.env.AI_MIN_INTERVAL_MS ?? 6500);
  if (!gap) return;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + gap;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

/** True for the Gemini/Anthropic "out of quota" error, so batch jobs can stop early instead of burning through the queue. */
export const isQuotaError = (e: unknown) => e instanceof Error && /\b429\b|quota/i.test(e.message);
