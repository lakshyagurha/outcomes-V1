import type { Program } from "@/lib/types";

/** "Verified 12 Oct · source ↗" for one field, from the program's field_meta. */
export function FieldSource({ program, field }: { program: Program; field: string }) {
  const m = program.field_meta?.[field];
  if (!m?.verified) return null;
  return (
    <span className="mt-1 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400">
      Verified {new Date(m.checked_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
      <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">source ↗</a>
    </span>
  );
}
