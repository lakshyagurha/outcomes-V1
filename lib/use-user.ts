"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase/client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return setLoaded(true);
    sb.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user);
      setLoaded(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e: string, session: { user: User } | null) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loaded };
}
