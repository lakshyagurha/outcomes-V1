"use client";
import { useStored } from "./store";
import { pushSaved, removeSaved } from "./sync";
import type { SavedProgram } from "./types";

export function useSaved() {
  const [saved, setSaved, loaded] = useStored("saved");
  const isSaved = (slug: string) => saved.some((s) => s.program_slug === slug);
  function toggle(slug: string, deadline: string | null = null) {
    if (isSaved(slug)) {
      setSaved(saved.filter((s) => s.program_slug !== slug));
      removeSaved(slug);
    } else {
      const item: SavedProgram = { program_slug: slug, status: "interested", deadline, notes: "", updated_at: new Date().toISOString() };
      setSaved([...saved, item]);
      pushSaved(item);
    }
  }
  function update(slug: string, patch: Partial<SavedProgram>) {
    const next = saved.map((s) => (s.program_slug === slug ? { ...s, ...patch, updated_at: new Date().toISOString() } : s));
    setSaved(next);
    const item = next.find((s) => s.program_slug === slug);
    if (item) pushSaved(item);
  }
  return { saved, loaded, isSaved, toggle, update };
}
