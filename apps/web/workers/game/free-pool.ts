import { ROUNDS_PER_DIVE } from "@urnrun/core";

/**
 * Free Dive prompt selection (SPEC §3.8). Never spoils an upcoming Daily: prompts scheduled in the
 * next 30 days are excluded unless they've already been revealed on a past day. Aims for the daily
 * category mix (3 heroes · 2 items · 1 lore · 1 community) and fills from anything left.
 */

export const LOOKAHEAD_DAYS = 30;
const MIX: Readonly<Record<string, number>> = { heroes: 3, items: 2, lore: 1, community: 1 };

export interface BankPrompt {
  id: string;
  category: string;
}

export function freePool(
  bank: readonly BankPrompt[],
  upcoming: ReadonlySet<string>,
  revealed: ReadonlySet<string>,
): BankPrompt[] {
  return bank.filter((p) => !upcoming.has(p.id) || revealed.has(p.id));
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Seven prompt ids, or null when the safe pool is too small. */
export function pickFreePrompts(
  pool: readonly BankPrompt[],
  rand: () => number = Math.random,
): string[] | null {
  if (pool.length < ROUNDS_PER_DIVE) return null;
  const shuffled = shuffle(pool, rand);
  const picked: BankPrompt[] = [];
  for (const [category, n] of Object.entries(MIX)) {
    picked.push(...shuffled.filter((p) => p.category === category).slice(0, n));
  }
  for (const p of shuffled) {
    if (picked.length >= ROUNDS_PER_DIVE) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return shuffle(picked.slice(0, ROUNDS_PER_DIVE), rand).map((p) => p.id);
}
