"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

/** Form button that disables itself and shows progress while its server action runs. */
export function SubmitButton({ children, pendingText, className, formAction }: {
  children: React.ReactNode; pendingText: string; className?: string; formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button formAction={formAction} disabled={pending} aria-busy={pending}
      className={cn("inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-60", className)}>
      {pending && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}
