/** Edit these to brand the app for your campus. */
export const COLLEGE_NAME = process.env.NEXT_PUBLIC_COLLEGE_NAME || "[College Name]";
export const PRODUCT_NAME = "Outcomes";

/** Only emails on this domain can sign in. Also enforced in the database (supabase/migrations/0002). */
export const ALLOWED_EMAIL_DOMAIN = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "ssb.scaler.com").toLowerCase();
export const isAllowedEmail = (email?: string | null) => !!email && email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);

/** Routes reachable without signing in. */
export const PUBLIC_PATHS = ["/", "/signin", "/auth/callback"];
