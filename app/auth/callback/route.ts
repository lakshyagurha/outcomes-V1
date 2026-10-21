import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  // Supabase passes signup errors (e.g. our domain trigger) back as query params.
  if (url.searchParams.get("error_description")?.toLowerCase().includes("ssb.scaler.com"))
    return NextResponse.redirect(new URL("/signin?error=domain", url.origin));

  const supabase = getServerSupabase();
  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isAllowedEmail(data.user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/signin?error=domain", url.origin));
      }
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/signin?error=auth", url.origin));
}
