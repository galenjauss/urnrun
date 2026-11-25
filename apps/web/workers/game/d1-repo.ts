import type { Tier } from "@urnrun/core";
import type {
  CrowdAnswer,
  GameRepo,
  PlayablePrompt,
  PromptAnswer,
  RoundRow,
  RoundStatus,
  RunRow,
} from "./types";

/** D1 implementation of GameRepo. All SQL is parameterized. */

const PROMPT_TTL_MS = 5 * 60_000;
const TIERS_TTL_MS = 60_000;

interface Cached<T> {
  value: T;
  expires: number;
}

const promptCache = new Map<string, Cached<PlayablePrompt | null>>();
const tiersCache = new Map<string, Cached<Record<string, Tier> | null>>();

interface RunDb {
  id: string;
  user_id: string;
  mode: RunRow["mode"];
  day: number | null;
  prompt_ids_json: string;
  started_at: number;
  finished_at: number | null;
  total_souls: number;
}

interface RoundDb {
  run_id: string;
  idx: number;
  prompt_id: string;
  answer_id: string | null;
  tier: Tier | null;
  souls: number;
  served_at: number | null;
  answered_at: number | null;
  guesses: number;
  status: RoundStatus;
}

const toRun = (r: RunDb): RunRow => ({
  id: r.id,
  userId: r.user_id,
  mode: r.mode,
  day: r.day,
  promptIds: JSON.parse(r.prompt_ids_json) as string[],
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  totalSouls: r.total_souls,
});

const toRound = (r: RoundDb): RoundRow => ({
  runId: r.run_id,
  idx: r.idx,
  promptId: r.prompt_id,
  answerId: r.answer_id,
  tier: r.tier,
  souls: r.souls,
  servedAt: r.served_at,
  answeredAt: r.answered_at,
  guesses: r.guesses,
  status: r.status,
});

const ROUND_COLUMNS: Readonly<Record<string, string>> = {
  answerId: "answer_id",
  tier: "tier",
  souls: "souls",
  servedAt: "served_at",
  answeredAt: "answered_at",
  guesses: "guesses",
  status: "status",
};

export function createD1Repo(db: D1Database, clock: () => number = Date.now): GameRepo {
  return {
    async getScheduledPromptIds(day) {
      const row = await db
        .prepare("SELECT prompt_ids_json FROM daily_schedule WHERE day = ?")
        .bind(day)
        .first<{ prompt_ids_json: string }>();
      return row ? (JSON.parse(row.prompt_ids_json) as string[]) : null;
    },

    async getPrompt(id) {
      const hit = promptCache.get(id);
      if (hit && hit.expires > clock()) return hit.value;
      const [p, answers, why] = await db.batch([
        db.prepare("SELECT id, category, text FROM prompts WHERE id = ?").bind(id),
        db
          .prepare(
            "SELECT answer_id, display, aliases_json, seed_tier, locked, is_rejuv FROM prompt_answers WHERE prompt_id = ?",
          )
          .bind(id),
        db.prepare("SELECT guess, reason FROM prompt_why_nots WHERE prompt_id = ?").bind(id),
      ]);
      const head = p?.results[0] as { id: string; category: string; text: string } | undefined;
      const value: PlayablePrompt | null = head
        ? {
            ...head,
            answers: (answers?.results ?? []).map((row) => {
              const a = row as {
                answer_id: string;
                display: string;
                aliases_json: string;
                seed_tier: Tier;
                locked: number;
                is_rejuv: number;
              };
              const answer: PromptAnswer = {
                id: a.answer_id,
                display: a.display,
                aliases: JSON.parse(a.aliases_json) as string[],
                seedTier: a.seed_tier,
                locked: a.locked === 1,
                isRejuvenator: a.is_rejuv === 1,
              };
              return answer;
            }),
            whyNot: Object.fromEntries(
              (why?.results ?? []).map((row) => {
                const w = row as { guess: string; reason: string };
                return [w.guess, w.reason];
              }),
            ),
          }
        : null;
      promptCache.set(id, { value, expires: clock() + PROMPT_TTL_MS });
      return value;
    },

    async getLiveTiers(promptId) {
      const hit = tiersCache.get(promptId);
      if (hit && hit.expires > clock()) return hit.value;
      const row = await db
        .prepare("SELECT table_json FROM rarity_tables WHERE prompt_id = ?")
        .bind(promptId)
        .first<{ table_json: string }>();
      const value = row ? (JSON.parse(row.table_json) as Record<string, Tier>) : null;
      tiersCache.set(promptId, { value, expires: clock() + TIERS_TTL_MS });
      return value;
    },

    async ensureUser(id, now) {
      await db
        .prepare("INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)")
        .bind(id, now)
        .run();
    },

    async findDailyRun(userId, day) {
      const row = await db
        .prepare("SELECT * FROM runs WHERE user_id = ? AND day = ? AND mode = 'daily'")
        .bind(userId, day)
        .first<RunDb>();
      return row ? toRun(row) : null;
    },

    async getRun(id) {
      const row = await db.prepare("SELECT * FROM runs WHERE id = ?").bind(id).first<RunDb>();
      return row ? toRun(row) : null;
    },

    async createRun(run) {
      await db.batch([
        db
          .prepare(
            "INSERT INTO runs (id, user_id, mode, day, prompt_ids_json, started_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(
            run.id,
            run.userId,
            run.mode,
            run.day,
            JSON.stringify(run.promptIds),
            run.startedAt,
          ),
        ...run.promptIds.map((promptId, idx) =>
          db
            .prepare("INSERT INTO run_rounds (run_id, idx, prompt_id) VALUES (?, ?, ?)")
            .bind(run.id, idx, promptId),
        ),
      ]);
    },

    async getRounds(runId) {
      const { results } = await db
        .prepare("SELECT * FROM run_rounds WHERE run_id = ? ORDER BY idx")
        .bind(runId)
        .all<RoundDb>();
      return results.map(toRound);
    },

    async updateRound(runId, idx, expect, patch) {
      const entries = Object.entries(patch).filter(
        ([k, v]) => k in ROUND_COLUMNS && v !== undefined,
      );
      if (entries.length === 0) return false;
      const sets = entries.map(([k]) => `${ROUND_COLUMNS[k]} = ?`).join(", ");
      const res = await db
        .prepare(`UPDATE run_rounds SET ${sets} WHERE run_id = ? AND idx = ? AND status = ?`)
        .bind(...entries.map(([, v]) => v as string | number | null), runId, idx, expect)
        .run();
      return (res.meta.changes ?? 0) > 0;
    },

    async incrementGuesses(runId, idx) {
      await db
        .prepare("UPDATE run_rounds SET guesses = guesses + 1 WHERE run_id = ? AND idx = ?")
        .bind(runId, idx)
        .run();
    },

    async addTally(day, promptId, answerId) {
      await db
        .prepare(
          `INSERT INTO answer_tallies (day, prompt_id, answer_id, count) VALUES (?, ?, ?, 1)
           ON CONFLICT (day, prompt_id, answer_id) DO UPDATE SET count = count + 1`,
        )
        .bind(day, promptId, answerId)
        .run();
    },

    async finishRun(runId, total, zone, now) {
      await db
        .prepare(
          "UPDATE runs SET total_souls = ?, depth_zone = ?, finished_at = ? WHERE id = ? AND finished_at IS NULL",
        )
        .bind(total, zone, now, runId)
        .run();
    },

    async percentileFor(day, total) {
      const row = await db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN total_souls < ? THEN 1 ELSE 0 END), 0) AS below, COUNT(*) AS players
           FROM runs WHERE mode = 'daily' AND day = ? AND finished_at IS NOT NULL AND flagged = 0`,
        )
        .bind(total, day)
        .first<{ below: number; players: number }>();
      return { below: row?.below ?? 0, players: row?.players ?? 0 };
    },

    async activePrompts() {
      const { results } = await db
        .prepare("SELECT id, category FROM prompts WHERE active = 1")
        .all<{ id: string; category: string }>();
      return results;
    },

    async scheduledPromptIdsBetween(from, to) {
      const { results } = await db
        .prepare("SELECT prompt_ids_json FROM daily_schedule WHERE day BETWEEN ? AND ?")
        .bind(from, to)
        .all<{ prompt_ids_json: string }>();
      return results.flatMap((r) => JSON.parse(r.prompt_ids_json) as string[]);
    },

    async pastDays(before, limit) {
      const { results } = await db
        .prepare(`SELECT day FROM daily_schedule WHERE day < ? ORDER BY day DESC LIMIT ?`)
        .bind(before, limit)
        .all<{ day: number }>();
      return results.map((r) => r.day);
    },

    async dayStats(day) {
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS players, COALESCE(AVG(total_souls), 0) AS avg, COALESCE(MAX(total_souls), 0) AS best
           FROM runs WHERE mode = 'daily' AND day = ? AND finished_at IS NOT NULL AND flagged = 0`,
        )
        .bind(day)
        .first<{ players: number; avg: number; best: number }>();
      return {
        players: row?.players ?? 0,
        avgSouls: Math.round(row?.avg ?? 0),
        bestSouls: row?.best ?? 0,
      };
    },

    async crowdAnswers(day, promptId): Promise<CrowdAnswer[]> {
      const { results } = await db
        .prepare(
          `SELECT t.answer_id AS answerId, COALESCE(a.display, t.answer_id) AS display, t.count AS count
           FROM answer_tallies t
           LEFT JOIN prompt_answers a ON a.prompt_id = t.prompt_id AND a.answer_id = t.answer_id
           WHERE t.day = ? AND t.prompt_id = ? ORDER BY t.count DESC LIMIT 10`,
        )
        .bind(day, promptId)
        .all<CrowdAnswer>();
      return results;
    },

    async bumpStreak(userId, day) {
      const row = await db
        .prepare("SELECT current, best, last_day FROM streaks WHERE user_id = ?")
        .bind(userId)
        .first<{ current: number; best: number; last_day: number | null }>();
      if (row && row.last_day === day) return { current: row.current, best: row.best };
      const current = row && row.last_day === day - 1 ? row.current + 1 : 1;
      const best = Math.max(current, row?.best ?? 0);
      await db
        .prepare(
          `INSERT INTO streaks (user_id, current, best, last_day) VALUES (?, ?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE SET current = excluded.current, best = excluded.best, last_day = excluded.last_day`,
        )
        .bind(userId, current, best, day)
        .run();
      return { current, best };
    },
  };
}
