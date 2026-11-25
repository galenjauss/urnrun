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
    if (!key) continue;
    if (keys.has(key)) {
      throw new Error(`why-not "${raw}" collides with a valid answer (${keys.get(key)})`);
    }
    why.set(key, reason);
  }
  return { keys, whyNot: why };
}

/**
 * Allowed edit distance for fuzzy suggestions, by normalized input length (SPEC §3.6: ≤1 up to
 * 6 chars, ≤2 longer). Inputs of ≤3 chars get no fuzzing — too many false "did you mean"s.
 */
export function fuzzyLimit(length: number): number {
  if (length <= 3) return 0;
  return length <= 6 ? 1 : 2;
}

/**
 * Optimal-string-alignment distance (Damerau-Levenshtein restricted to non-overlapping
 * transpositions — the right model for typos). Uses three rolling rows.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev2 = new Int32Array(b.length + 1);
  let prev = Int32Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prev2[j - 2]! + 1);
      }
      curr[j] = best;
    }
    [prev2, prev, curr] = [prev, curr, prev2];
  }
  return prev[b.length]!;
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
    .sort(([idA, dA], [idB, dB]) => dA - dB || (idA < idB ? -1 : idA > idB ? 1 : 0))
    .slice(0, MAX_SUGGESTIONS)
    .map(([id]) => id);
  return { kind: "suggest", answerIds };
}
