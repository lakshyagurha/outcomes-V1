/**
 * Hosts that list many programs (aggregators, social networks, form builders).
 * A page on one of these is never the program's own site, so we don't take
 * its logo/colours, and the domain alone can't identify a program.
 */
export const SHARED_HOSTS = [
  "unstop.com", "devfolio.co", "startupindia.gov.in", "startupgrantsindia.com", "fundsforngos.org", "f6s.com",
  "linkedin.com", "instagram.com", "facebook.com", "x.com", "twitter.com", "youtube.com", "medium.com",
  "google.com", "forms.gle", "docs.google.com", "typeform.com", "inc42.com", "yourstory.com",
];

export const domainOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const isSharedHost = (urlOrDomain: string) => {
  const d = urlOrDomain.includes("/") ? domainOf(urlOrDomain) : urlOrDomain;
  return SHARED_HOSTS.some((h) => d === h || d.endsWith(`.${h}`));
};
