import type { GameRepo } from "./types";

/**
 * Public, spoiler-safe ledger for a *finished* day (SSR archive + SEO pages, SPEC §3.9).
 * Shows what the crowd said and each Rejuvenator — never the full answer lists, which stay private
 * because prompts can return later.
 */

export interface DayLedgerPrompt {
  idx: number;
  category: string;
  text: string;
  rejuvenator: string | null;
  /** Number of valid answers (a difficulty hint, not the list). */
  answerCount: number;
  crowd: { display: string; share: number }[];
}

export interface DayLedger {
  day: number;
  players: number;
  avgSouls: number;
  bestSouls: number;
  prompts: DayLedgerPrompt[];
}

export const CROWD_SHOWN = 5;

/** Returns null for today/future days (no spoilers) or days with nothing scheduled. */
export async function buildDayLedger(
  repo: GameRepo,
  day: number,
  today: number,
): Promise<DayLedger | null> {
  if (!Number.isInteger(day) || day >= today) return null;
  const ids = await repo.getScheduledPromptIds(day);
  if (!ids || ids.length === 0) return null;
  const [stats, prompts] = await Promise.all([
    repo.dayStats(day),
    Promise.all(
      ids.map(async (id, idx): Promise<DayLedgerPrompt | null> => {
        const [p, crowd] = await Promise.all([repo.getPrompt(id), repo.crowdAnswers(day, id)]);
        if (!p) return null;
        const total = crowd.reduce((s, c) => s + c.count, 0);
        return {
          idx,
          category: p.category,
          text: p.text,
          rejuvenator: p.answers.find((a) => a.isRejuvenator)?.display ?? null,
          answerCount: p.answers.length,
          crowd: crowd.slice(0, CROWD_SHOWN).map((c) => ({
            display: c.display,
            share: total > 0 ? Math.round((c.count / total) * 100) : 0,
          })),
        };
      }),
    ),
  ]);
  return {
    day,
    ...stats,
    prompts: prompts.filter((p): p is DayLedgerPrompt => p !== null),
  };
}
