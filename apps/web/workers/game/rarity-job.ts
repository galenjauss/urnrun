import { computeLiveTiers, dayNumber, type AnswerSeed, type Tier } from "@urnrun/core";

/** Cron (every 10 min): recompute live rarity tables for today's prompts (SPEC §3.7 step 2). */
export async function recomputeRarity(db: D1Database, now = Date.now()): Promise<number> {
  const day = dayNumber(new Date(now));
  const sched = await db
    .prepare("SELECT prompt_ids_json FROM daily_schedule WHERE day = ?")
    .bind(day)
    .first<{ prompt_ids_json: string }>();
  if (!sched) return 0;
  const promptIds = JSON.parse(sched.prompt_ids_json) as string[];
  const writes: D1PreparedStatement[] = [];
  for (const promptId of promptIds) {
    const [seedRes, tallyRes] = await db.batch([
      db
        .prepare("SELECT answer_id, seed_tier, locked FROM prompt_answers WHERE prompt_id = ?")
        .bind(promptId),
      db
        .prepare("SELECT answer_id, count FROM answer_tallies WHERE day = ? AND prompt_id = ?")
        .bind(day, promptId),
    ]);
    const seeds: AnswerSeed[] = (seedRes?.results ?? []).map((r) => {
      const row = r as { answer_id: string; seed_tier: Tier; locked: number };
      return { answerId: row.answer_id, seedTier: row.seed_tier, locked: row.locked === 1 };
    });
    const tally = Object.fromEntries(
      (tallyRes?.results ?? []).map((r) => {
        const row = r as { answer_id: string; count: number };
        return [row.answer_id, row.count];
      }),
    );
    const sample = Object.values(tally).reduce((s, n) => s + n, 0);
    writes.push(
      db
        .prepare(
          `INSERT INTO rarity_tables (prompt_id, computed_at, sample, table_json) VALUES (?, ?, ?, ?)
           ON CONFLICT (prompt_id) DO UPDATE SET computed_at = excluded.computed_at,
             sample = excluded.sample, table_json = excluded.table_json`,
        )
        .bind(promptId, now, sample, JSON.stringify(computeLiveTiers(seeds, tally))),
    );
  }
  if (writes.length) await db.batch(writes);
  return writes.length;
}
