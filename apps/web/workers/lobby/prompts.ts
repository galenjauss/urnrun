import { dayNumber } from "@urnrun/core";
import { LOOKAHEAD_DAYS, freePool, pickFreePrompts } from "../game/free-pool";
import type { GameRepo } from "../game/types";
import type { LobbyPrompt } from "./engine";

/**
 * Draw `count` prompts for a séance with the same no-spoiler rule as Free Dive, resolving each
 * answer's tier once (live table if present, else the seed) so a round scores consistently.
 */
export async function drawLobbyPrompts(
  repo: GameRepo,
  count: number,
  now: number,
): Promise<LobbyPrompt[] | null> {
  const day = dayNumber(new Date(now));
  const [bank, upcoming, revealed] = await Promise.all([
    repo.activePrompts(),
    repo.scheduledPromptIdsBetween(day, day + LOOKAHEAD_DAYS),
    repo.scheduledPromptIdsBetween(day - 10_000, day - 1),
  ]);
  const ids = pickFreePrompts(
    freePool(bank, new Set(upcoming), new Set(revealed)),
    Math.random,
    count,
  );
  if (!ids) return null;
  const prompts = await Promise.all(
    ids.map(async (id): Promise<LobbyPrompt | null> => {
      const [p, live] = await Promise.all([repo.getPrompt(id), repo.getLiveTiers(id)]);
      if (!p) return null;
      return {
        id: p.id,
        category: p.category,
        text: p.text,
        whyNot: p.whyNot,
        answers: p.answers.map((a) => ({
          id: a.id,
          display: a.display,
          aliases: a.aliases,
          tier: live?.[a.id] ?? a.seedTier,
          isRejuvenator: a.isRejuvenator,
        })),
      };
    }),
  );
  const ok = prompts.filter((p): p is LobbyPrompt => p !== null);
  return ok.length >= count ? ok : null;
}
