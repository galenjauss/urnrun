/** Turn API rich-text (HTML spans, inline SVG icons) into plain text. */

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function sanitizeText(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?)])/g, "$1")
    .trim();
}

/** Stable snake_case id for an entity name. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
