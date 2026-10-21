"use client";
import { useEffect, useRef, useState } from "react";
import { useStored } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { useUser } from "@/lib/use-user";
import { getSupabase } from "@/lib/supabase/client";
import { computeStage } from "@/lib/rules";
import type { DiagnosticAnswers, FounderProfile } from "@/lib/types";
import { Page, PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

const TEAM: Record<DiagnosticAnswers["team"], string> = { solo: "Solo founder", "2-3": "2–3 founders", "4+": "4+ founders" };

function seed(a: DiagnosticAnswers | null): FounderProfile {
  return {
    startup_name: "", problem: "", solution: "",
    users_spoken_to: a && a.usersSpoken !== "0" ? `${a.usersSpoken} potential users` : "",
    traction: "",
    team: a ? `${TEAM[a.team]}${a.hasBuilder === "yes" ? ", including someone who can build" : ", no technical founder yet"}` : "",
    sector: a?.sectors.join(", ") ?? "",
  };
}

const FIELDS: { key: keyof FounderProfile; label: string; hint: string; long?: boolean }[] = [
  { key: "startup_name", label: "Startup or project name", hint: "A working name is fine." },
  { key: "problem", label: "The problem", hint: "Who has it, how often, and what it costs them. Use one example from a real conversation.", long: true },
  { key: "solution", label: "Your solution", hint: "What you're building, in one or two plain sentences.", long: true },
  { key: "users_spoken_to", label: "Users you've spoken to", hint: "How many, who they were, and the most surprising thing you heard.", long: true },
  { key: "traction", label: "Traction", hint: "Numbers only: users, retention, revenue, waitlist. \"None yet\" is an honest answer.", long: true },
  { key: "team", label: "Team", hint: "Names, roles, and why you're the right people to solve this." , long: true },
  { key: "sector", label: "Sector", hint: "For example, EdTech or AgriTech." },
];

export default function ProfilePage() {
  const [answers, , aLoaded] = useStored("answers");
  const [stored, setStored, loaded] = useStored("profile");
  const [form, setForm] = useState<FounderProfile | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { user } = useUser();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (loaded && aLoaded && !form) setForm(stored ?? seed(answers));
  }, [loaded, aLoaded, stored, answers, form]);

  function change(key: keyof FounderProfile, value: string) {
    const next = { ...form!, [key]: value };
    setForm(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStored(next);
      pushProfile().catch(() => {});
      setSavedAt(Date.now());
    }, 500);
  }

  if (!form) return null;
  const done = FIELDS.filter((f) => form[f.key].trim().length >= (f.long ? 20 : 2)).length;

  return (
    <Page className="max-w-2xl">
      <PageHeader eyebrow={answers ? `Stage: ${computeStage(answers).stage}` : undefined} title="Your founder profile"
        sub="Write it once, then reuse it in every application. We've filled in what we already know from your diagnostic." />
      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="tnum text-slate-600">{done} of {FIELDS.length} sections done</span>
        <span className="text-slate-400" aria-live="polite">{savedAt ? (user ? "Saved to your account" : "Saved on this device") : ""}</span>
      </div>
      <Card className="space-y-6 p-5 sm:p-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="block font-medium">{f.label}</label>
            <p className="mb-2 text-sm text-slate-500">{f.hint}</p>
            {f.long ? (
              <textarea id={f.key} rows={3} value={form[f.key]} onChange={(e) => change(f.key, e.target.value)}
                className="w-full resize-y rounded-xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
            ) : (
              <input id={f.key} value={form[f.key]} onChange={(e) => change(f.key, e.target.value)}
                className="h-12 w-full rounded-xl border border-line px-4 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
            )}
          </div>
        ))}
      </Card>
      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LinkButton href="/coach">Use it with the Application Coach</LinkButton>
        {user ? (
          <button onClick={async () => { await getSupabase()?.auth.signOut(); location.href = "/"; }} className="text-sm text-slate-500 hover:text-ink">
            Sign out ({user.email})
          </button>
        ) : (
          <a href="/signin?next=/profile" className="text-sm text-slate-500 underline underline-offset-2">Sign in to keep this across devices</a>
        )}
      </div>
    </Page>
  );
}
