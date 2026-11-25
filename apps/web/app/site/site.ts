/** Public site facts shared by content pages. No personal contact details live in this repo. */

export const SITE = {
  name: "Urn Run",
  origin: "https://play.urnrun.workers.dev",
  /** Public contact + takedown channel (SPEC §10). Swap for a dedicated inbox when one exists. */
  contactUrl: "https://github.com/galenjauss/urnrun/issues",
  contactLabel: "GitHub Issues",
  policyDate: "November 25, 2026",
} as const;

/** Indexable pages (the dive itself is noindex). */
export const CONTENT_PATHS = ["/", "/how-to-play", "/about", "/faq", "/privacy", "/terms"] as const;

export const DISCLAIMER =
  "Urn Run is an unofficial fan game. It is not affiliated with, endorsed, sponsored, or approved by Valve Corporation. Deadlock and all related names are trademarks of Valve.";

/** Standard meta for a content page. */
export function pageMeta(title: string, description: string, path: string) {
  return [
    { title: `${title} — ${SITE.name}` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: `${SITE.origin}${path}` },
    { property: "og:title", content: `${title} — ${SITE.name}` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
}
