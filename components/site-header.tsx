"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useStored } from "@/lib/store";
import { useUser } from "@/lib/use-user";
import { syncOnSignIn } from "@/lib/sync";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/matches", label: "Matches" },
  { href: "/ideas", label: "Idea Bank" },
  { href: "/coach", label: "Coach" },
  { href: "/tracker", label: "Tracker" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-[17px] tracking-[-0.03em]">
      <span className="relative grid h-6 w-6 place-items-center rounded-[2px] bg-ink">
        <span className="h-2.5 w-2.5 rounded-full border-[2px] border-warm" />
        <span className="absolute right-[3px] top-[3px] h-1 w-1 rounded-full bg-accent" />
      </span>
      outcomes
    </span>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [answers] = useStored("answers");
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    const flag = `outcomes.synced.${user.id}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    syncOnSignIn(user.id).catch(() => sessionStorage.removeItem(flag));
  }, [user]);

  if (path.startsWith("/diagnostic")) return null;

  const link = (n: (typeof NAV)[number], mobile = false) => {
    const on = path.startsWith(n.href);
    return (
      <Link key={n.href} href={n.href}
        className={cn("relative shrink-0 px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] transition-colors", on ? "text-ink" : "text-slate-500 hover:text-ink", mobile && "py-2")}>
        {on && <span className="absolute inset-x-3 -bottom-[1px] h-[2px] bg-accent" />}
        {n.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
        <Link href={answers ? "/dashboard" : "/"}><Logo /></Link>
        {answers && <nav className="hidden h-14 items-center sm:flex">{NAV.map((n) => link(n))}</nav>}
        <Link href={user ? "/profile" : "/signin"} className="font-mono text-[12px] uppercase tracking-[0.08em] text-slate-600 hover:text-accent">
          {user ? "Profile" : "Sign in →"}
        </Link>
      </div>
      {answers && <nav className="flex overflow-x-auto border-t border-line px-1 sm:hidden">{NAV.map((n) => link(n, true))}</nav>}
    </header>
  );
}
