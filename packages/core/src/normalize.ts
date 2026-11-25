/** Answer normalization (SPEC §3.6): case, diacritics, punctuation, `&`↔`and`, leading articles. */

/** Guesses longer than this are truncated before any processing (CPU safety on the Worker). */
export const MAX_GUESS_LENGTH = 80;

const LEADING_ARTICLES = /^(?:(?:the|a|an) )+(?=\S)/;

/** Letters NFKD does not decompose into ASCII + combining marks. */
const TRANSLITERATE: Readonly<Record<string, string>> = {
  ø: "o",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ł: "l",
  đ: "d",
  þ: "th",
  ð: "d",
  ı: "i",
};
const TRANSLITERATE_RE = new RegExp(`[${Object.keys(TRANSLITERATE).join("")}]`, "g");

export function normalize(input: string): string {
  return input
    .slice(0, MAX_GUESS_LENGTH * 2)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(TRANSLITERATE_RE, (ch) => TRANSLITERATE[ch] ?? ch)
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(LEADING_ARTICLES, "")
    .slice(0, MAX_GUESS_LENGTH)
    .trim();
}
