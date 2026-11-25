import { normalize } from "./normalize";

/** Answer matching (SPEC §3.6): exact/alias → accept; near miss → suggest; curated → why-not. */

export interface AnswerDef {
  id: string;
  display: string;
  aliases?: readonly string[];
}

export interface AnswerIndexInput {
  answers: readonly AnswerDef[];
  /** Plausible wrong answers → one-line reason. */
  whyNot?: Readonly<Record<string, string>>;
}

export interface AnswerIndex {
  readonly keys: ReadonlyMap<string, string>;
  readonly whyNot: ReadonlyMap<string, string>;
}

export type MatchResult =
  | { kind: "exact"; answerId: string }
  | { kind: "suggest"; answerIds: string[] }
  | { kind: "whyNot"; reason: string }
  | { kind: "none" };

const MAX_SUGGESTIONS = 3;

export function buildAnswerIndex({ answers, whyNot = {} }: AnswerIndexInput): AnswerIndex {
  const keys = new Map<string, string>();
  for (const answer of answers) {
    for (const raw of [answer.display, ...(answer.aliases ?? [])]) {
      const key = normalize(raw);
      if (!key) continue;
      const existing = keys.get(key);
      if (existing !== undefined && existing !== answer.id) {
        throw new Error(`Alias collision: "${raw}" maps to both ${existing} and ${answer.id}`);
      }
      keys.set(key, answer.id);
    }
  }
  const why = new Map<string, string>();
  for (const [raw, reason] of Object.entries(whyNot)) {
    const key = normalize(raw);
    if (key && !keys.has(key)) why.set(key, reason);
  }
  return { keys, whyNot: why };
}

/** Allowed edit distance for fuzzy suggestions, by normalized input length. */
export function fuzzyLimit(length: number): number {
  if (length <= 3) return 0;
  return length <= 6 ? 1 : 2;
}

/** Optimal-string-alignment Damerau-Levenshtein distance. */
export function damerauLevenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    const row = d[i]!;
    const prev = d[i - 1]!;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, d[i - 2]![j - 2]! + 1);
      }
      row[j] = best;
    }
  }
  return d[a.length]![b.length]!;
}

export function matchGuess(index: AnswerIndex, guess: string): MatchResult {
  const key = normalize(guess);
  if (!key) return { kind: "none" };

  const exact = index.keys.get(key);
  if (exact !== undefined) return { kind: "exact", answerId: exact };

  const reason = index.whyNot.get(key);
  if (reason !== undefined) return { kind: "whyNot", reason };

  const limit = fuzzyLimit(key.length);
  if (limit === 0) return { kind: "none" };

  const best = new Map<string, number>();
  for (const [candidate, answerId] of index.keys) {
    if (Math.abs(candidate.length - key.length) > limit) continue;
    const dist = damerauLevenshtein(key, candidate);
    if (dist <= limit && dist < (best.get(answerId) ?? Infinity)) best.set(answerId, dist);
  }
  if (best.size === 0) return { kind: "none" };

  const answerIds = [...best.entries()]
    .sort(([idA, dA], [idB, dB]) => dA - dB || idA.localeCompare(idB))
    .slice(0, MAX_SUGGESTIONS)
    .map(([id]) => id);
  return { kind: "suggest", answerIds };
}
