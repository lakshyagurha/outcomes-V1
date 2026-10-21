"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/config";

function SignIn() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/diagnostic";
  const urlError = params.get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined;

  async function google() {
    const res = await getSupabase()?.auth.signInWithOAuth({
      provider: "google",
      // `hd` makes Google show only accounts on our domain. It's a hint; the server enforces it.
      options: { redirectTo, queryParams: { hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" } },
    });
    if (res?.error) { setError(res.error.message); setState("error"); }
  }
  async function magic(e: React.FormEvent) {
    e.preventDefault();
    if (!isAllowedEmail(email)) {
      setError(`Use your @${ALLOWED_EMAIL_DOMAIN} email. Outcomes is only open to SSB students.`);
      return setState("error");
    }
    setState("sending");
    const res = await getSupabase()?.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (res?.error) {
      setError(res.error.message.includes(ALLOWED_EMAIL_DOMAIN) || res.error.status === 500
        ? `Use your @${ALLOWED_EMAIL_DOMAIN} email. Outcomes is only open to SSB students.`
        : res.error.message);
      setState("error");
    } else setState("sent");
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-12 sm:pt-20">
      <p className="label mb-4 flex items-center gap-2"><span className="h-px w-6 bg-accent" />SSB students only</p>
      <h1 className="text-[40px] font-normal leading-none">Sign in to Outcomes</h1>
      <p className="mt-3 text-slate-600">Use your <span className="font-mono text-[14px] text-ink">@{ALLOWED_EMAIL_DOMAIN}</span> account. Your stage, matches, profile and tracker are saved to it.</p>
      {urlError && (
        <p role="alert" className="mt-6 border-l-2 border-accent bg-tint p-3 text-sm">
          {urlError === "domain" ? `That account isn't an @${ALLOWED_EMAIL_DOMAIN} address. Sign in with your SSB email.` : "Sign-in didn't complete. Please try again."}
        </p>
      )}
      <Card className="mt-8 p-6">
        {!supabaseConfigured ? (
          <p className="text-sm text-slate-600">Accounts aren&apos;t set up on this deployment yet. Your progress is saved on this device.</p>
        ) : state === "sent" ? (
          <div aria-live="polite">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-slate-600">We sent a sign-in link to {email}. Open it on this device.</p>
          </div>
        ) : (
          <>
            <Button onClick={google} className="w-full">Continue with SSB Google account</Button>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={magic} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="email">SSB email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
                className="h-12 w-full rounded-xl border border-line px-4 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
              <Button type="submit" variant="secondary" className="w-full" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Email me a sign-in link"}
              </Button>
              {state === "error" && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return <Suspense><SignIn /></Suspense>;
}
