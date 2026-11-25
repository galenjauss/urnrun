/** Answer normalization (SPEC §3.6): case, diacritics, punctuation, `&`↔`and`, leading articles. */

const LEADING_ARTICLE = /^(the|a|an) (?=\S)/;

export function normalize(input: string): string {
  const folded = input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  let out = folded;
  // Strip repeatedly so normalize is idempotent ("the a team" → "team").
  while (LEADING_ARTICLE.test(out)) out = out.replace(LEADING_ARTICLE, "");
  return out;
}
