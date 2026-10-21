import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail, PUBLIC_PATHS } from "@/lib/config";

/**
 * Refreshes the Supabase session and gates the app: every route except PUBLIC_PATHS
 * needs a signed-in user with an allowed email domain.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.includes(path) || path.startsWith("/api/cron/")) return response; // cron routes check CRON_SECRET themselves

  if (!user || !isAllowedEmail(user.email)) {
    if (user) await supabase.auth.signOut();
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Please sign in with your @ssb.scaler.com email." }, { status: 401 });
    const to = request.nextUrl.clone();
    to.pathname = "/signin";
    to.search = user ? "?error=domain" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"] };
