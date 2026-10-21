"use client";
/**
 * Local-first storage. Everything works without an account; when signed in,
 * lib/sync.ts mirrors these values to Supabase.
 */
import { useEffect, useState, useCallback } from "react";
import type { CoachReview, DiagnosticAnswers, FounderProfile, SavedProgram } from "./types";

const KEYS = {
  answers: "outcomes.answers",
  profile: "outcomes.profile",
  saved: "outcomes.saved",
  reviews: "outcomes.reviews",
} as const;
type Shape = { answers: DiagnosticAnswers | null; profile: FounderProfile | null; saved: SavedProgram[]; reviews: CoachReview[] };
const DEFAULTS: Shape = { answers: null, profile: null, saved: [], reviews: [] };

export function read<K extends keyof Shape>(key: K): Shape[K] {
  try {
    const raw = window.localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as Shape[K]) : DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}

export function write<K extends keyof Shape>(key: K, value: Shape[K]) {
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new CustomEvent("outcomes:store", { detail: key }));
}

/** React hook: returns [value, setValue, loaded]. `loaded` avoids SSR flashes. */
export function useStored<K extends keyof Shape>(key: K) {
  const [value, setValue] = useState<Shape[K]>(DEFAULTS[key]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const sync = () => setValue(read(key));
    sync();
    setLoaded(true);
    const onChange = (e: Event) => (e as CustomEvent).detail === key && sync();
    window.addEventListener("outcomes:store", onChange);
    return () => window.removeEventListener("outcomes:store", onChange);
  }, [key]);
  const set = useCallback((v: Shape[K]) => write(key, v), [key]);
  return [value, set, loaded] as const;
}
