import { createRng, seedFromString, shuffle } from "./rng";

/**
 * Deterministic daily schedule builder (SPEC §3.2, §4.2 step 5).
 * Output depends on (seed, startDay, history, bank): published days must be persisted (D1
 * `daily_schedule`) and passed back as `history` — never regenerate already-published days.
 */

export type Category = "heroes" | "items" | "lore" | "community";

export const DAILY_MIX: Readonly<Record<Category, number>> = {
  heroes: 3,
  items: 2,
  lore: 1,
  community: 1,
};

export const NO_REPEAT_DAYS = 30;
export const MAX_SAME_DAY_OVERLAP = 0.6;

export interface SchedulablePrompt {
  id: string;
  category: Category;
  answerIds: readonly string[];
}

export interface ScheduledDay {
  day: number;
  promptIds: string[];
}

export interface ScheduleOptions {
  prompts: readonly SchedulablePrompt[];
  startDay: number;
  days: number;
  seed: string;
  /** Already-published days, used for the no-repeat window. */
  history?: readonly ScheduledDay[];
  /** Override the 30-day window (dev/beta with a small bank only). */
  noRepeatDays?: number;
}

/** |A∩B| / min(|A|,|B|) — 1 means one set is contained in the other. */
export function answerOverlap(a: readonly string[], b: readonly string[]): number {
  const smaller = Math.min(a.length, b.length);
  if (smaller === 0) return 0;
  const setB = new Set(b);
  const shared = a.reduce((n, id) => (setB.has(id) ? n + 1 : n), 0);
  return shared / smaller;
}

function pickForDay(
  day: number,
  byCategory: ReadonlyMap<Category, readonly SchedulablePrompt[]>,
  lastUsed: ReadonlyMap<string, number>,
  seed: string,
  noRepeatDays: number,
): SchedulablePrompt[] {
  const rng = createRng(seedFromString(`${seed}:day:${day}`));
  const chosen: SchedulablePrompt[] = [];
  for (const [category, needed] of Object.entries(DAILY_MIX) as [Category, number][]) {
    const pool = shuffle(rng, byCategory.get(category) ?? []);
    let picked = 0;
    for (const prompt of pool) {
      if (picked === needed) break;
      const last = lastUsed.get(prompt.id);
      if (last !== undefined && day - last < noRepeatDays) continue;
      const clash = chosen.some(
        (c) => answerOverlap(c.answerIds, prompt.answerIds) > MAX_SAME_DAY_OVERLAP,
      );
      if (clash) continue;
      chosen.push(prompt);
      picked++;
    }
    if (picked < needed) {
      throw new Error(
        `Not enough eligible ${category} prompts for day ${day} (need ${needed}, found ${picked})`,
      );
    }
  }
  return chosen;
}

export function buildSchedule({
  prompts,
  startDay,
  days,
  seed,
  history = [],
  noRepeatDays = NO_REPEAT_DAYS,
}: ScheduleOptions): ScheduledDay[] {
  if (!Number.isInteger(days) || days <= 0) throw new Error(`days must be a positive integer`);
  const seen = new Set<string>();
  for (const p of prompts) {
    if (seen.has(p.id)) throw new Error(`Duplicate prompt id in bank: ${p.id}`);
    seen.add(p.id);
  }

  const byCategory = new Map<Category, SchedulablePrompt[]>();
  for (const p of prompts) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);

  const lastUsed = new Map<string, number>();
  for (const h of history) {
    for (const id of h.promptIds) lastUsed.set(id, Math.max(h.day, lastUsed.get(id) ?? -Infinity));
  }

  const schedule: ScheduledDay[] = [];
  for (let day = startDay; day < startDay + days; day++) {
    const picked = pickForDay(day, byCategory, lastUsed, seed, noRepeatDays);
    for (const p of picked) lastUsed.set(p.id, day);
    schedule.push({ day, promptIds: picked.map((p) => p.id) });
  }
  return schedule;
}
