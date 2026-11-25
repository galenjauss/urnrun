import {
  ROUNDS_PER_DIVE,
  buildAnswerIndex,
  buildShareText,
  shareCardPath,
  dayNumber,
  matchGuess,
  nextResetAt,
  soulsFor,
  verdictFor,
  zoneFor,
  type AnswerIndex,
  type Tier,
} from "@urnrun/core";
import { hmac, randomId, verifyHmac } from "../lib/crypto";
import { LOOKAHEAD_DAYS, freePool, pickFreePrompts } from "./free-pool";
import type { GameRepo, Mode, PlayablePrompt, RoundRow, RunRow } from "./types";

/** Server-authoritative Daily Dive loop (SPEC §3.2, §6.4–6.5). */

export const PREVIEW_MS = 3_000;
export const ANSWER_MS = 25_000;
export const GRACE_MS = 1_500;
const EARLY_TOLERANCE_MS = 500;

export class GameError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

export interface GameServiceDeps {
  repo: GameRepo;
  secret: string;
  now: () => number;
  shareUrl: string;
}

export interface RoundSummary {
  idx: number;
  status: RoundRow["status"];
  tier: Tier | null;
  souls: number;
}

export interface StartResult {
  runId: string;
  token: string;
  day: number;
  totalRounds: number;
  nextIdx: number | null;
  finished: boolean;
  rounds: RoundSummary[];
}

export interface ServeResult {
  idx: number;
  prompt: { text: string; category: string };
  servedAt: number;
  opensAt: number;
  deadline: number;
  serverNow: number;
}

export type GuessResult =
  | { status: "correct"; answer: { id: string; display: string }; tier: Tier; souls: number }
  | { status: "suggest"; suggestions: { id: string; display: string }[] }
  | { status: "whyNot"; reason: string }
  | { status: "invalid" }
  | { status: "expired" };

export interface RoundReveal {
  idx: number;
  text: string;
  answer: string | null;
  tier: Tier | null;
  souls: number;
  rejuvenator: string | null;
  crowd: { display: string; share: number }[];
}

export interface FinishResult {
  mode: Mode;
  day: number | null;
  totalSouls: number;
  zone: string;
  verdict: string;
  percentile: number | null;
  players: number;
  rounds: RoundReveal[];
  share: string;
  streak: { current: number; best: number } | null;
}

const indexCache = new Map<string, AnswerIndex>();
const INDEX_CACHE_MAX = 256;

function indexFor(prompt: PlayablePrompt): AnswerIndex {
  let index = indexCache.get(prompt.id);
  if (!index) {
    index = buildAnswerIndex({ answers: prompt.answers, whyNot: prompt.whyNot });
    if (indexCache.size >= INDEX_CACHE_MAX) indexCache.clear();
    indexCache.set(prompt.id, index);
  }
  return index;
}

const deadlineOf = (r: RoundRow) => (r.servedAt ?? 0) + PREVIEW_MS + ANSWER_MS;
const isClosed = (r: RoundRow) => r.status === "answered" || r.status === "expired";
const summarize = (r: RoundRow): RoundSummary => ({
  idx: r.idx,
  status: r.status,
  tier: r.tier,
  souls: r.souls,
});

export function createGameService({ repo, secret, now, shareUrl }: GameServiceDeps) {
  const tokenFor = (run: Pick<RunRow, "id" | "userId" | "day">) =>
    hmac(secret, `${run.id}.${run.userId}.${run.day ?? "free"}`);

  async function authorize(userId: string, runId: string, token: string): Promise<RunRow> {
    const run = await repo.getRun(runId);
    if (!run || run.userId !== userId) throw new GameError("not_found", 404, "Run not found");
    const valid = await verifyHmac(secret, `${run.id}.${run.userId}.${run.day ?? "free"}`, token);
    if (!valid) throw new GameError("forbidden", 403, "Invalid run token");
    return run;
  }

  /** Close open rounds whose time ran out (abandoned tabs, lost connections). */
  async function sweep(runId: string): Promise<RoundRow[]> {
    const rounds = await repo.getRounds(runId);
    const t = now();
    for (const r of rounds) {
      if (r.status === "open" && t > deadlineOf(r) + GRACE_MS) {
        await repo.updateRound(runId, r.idx, "open", { status: "expired", souls: 0 });
        r.status = "expired";
        r.souls = 0;
      }
    }
    return rounds.sort((a, b) => a.idx - b.idx);
  }

  async function startResult(run: RunRow): Promise<StartResult> {
    const rounds = await sweep(run.id);
    const next = rounds.find((r) => !isClosed(r));
    return {
      runId: run.id,
      token: await tokenFor(run),
      day: run.day ?? 0,
      totalRounds: rounds.length,
      nextIdx: next ? next.idx : null,
      finished: run.finishedAt !== null,
      rounds: rounds.map(summarize),
    };
  }

  async function startDaily(userId: string): Promise<StartResult> {
    const day = dayNumber(new Date(now()));
    const promptIds = await repo.getScheduledPromptIds(day);
    if (!promptIds || promptIds.length !== ROUNDS_PER_DIVE) {
      throw new GameError("no_dive", 404, "No dive is scheduled today");
    }
    await repo.ensureUser(userId, now());
    const existing = await repo.findDailyRun(userId, day);
    if (existing) return startResult(existing);

    const run: RunRow = {
      id: randomId(),
      userId,
      mode: "daily",
      day,
      promptIds,
      startedAt: now(),
      finishedAt: null,
      totalSouls: 0,
    };
    try {
      await repo.createRun(run);
    } catch (err) {
      // Lost a race with a parallel start for the same user/day — resume the winner.
      const winner = await repo.findDailyRun(userId, day);
      if (!winner) throw err;
      return startResult(winner);
    }
    return startResult(run);
  }

  /**
   * Free Dive (SPEC §3.8): unlocked once today's Daily is finished (or when none is scheduled).
   * Seven random prompts that can't spoil an upcoming Daily; no streak, tallies or percentile.
   */
  async function startFree(userId: string, rand: () => number = Math.random): Promise<StartResult> {
    const day = dayNumber(new Date(now()));
    await repo.ensureUser(userId, now());
    if (await repo.getScheduledPromptIds(day)) {
      const daily = await repo.findDailyRun(userId, day);
      if (!daily || daily.finishedAt === null) {
        throw new GameError("daily_first", 403, "Finish today's dive to unlock Free Dive");
      }
    }
    const [bank, upcoming, revealed] = await Promise.all([
      repo.activePrompts(),
      repo.scheduledPromptIdsBetween(day, day + LOOKAHEAD_DAYS),
      repo.scheduledPromptIdsBetween(day - 10_000, day - 1),
    ]);
    const promptIds = pickFreePrompts(freePool(bank, new Set(upcoming), new Set(revealed)), rand);
    if (!promptIds) {
      throw new GameError("no_free", 404, "Free Dive opens once the archive has grown");
    }
    const run: RunRow = {
      id: randomId(),
      userId,
      mode: "free",
      day: null,
      promptIds,
      startedAt: now(),
      finishedAt: null,
      totalSouls: 0,
    };
    await repo.createRun(run);
    return startResult(run);
  }

  /** Archive replay (SPEC §3.9): any finished past Daily, as often as you like; no streak credit. */
  async function startArchive(userId: string, day: number): Promise<StartResult> {
    const today = dayNumber(new Date(now()));
    if (!Number.isInteger(day) || day >= today) {
      throw new GameError("not_archived", 404, "That dive isn't in the archive yet");
    }
    const promptIds = await repo.getScheduledPromptIds(day);
    if (!promptIds || promptIds.length !== ROUNDS_PER_DIVE) {
      throw new GameError("not_archived", 404, "That dive isn't in the archive yet");
    }
    await repo.ensureUser(userId, now());
    const run: RunRow = {
      id: randomId(),
      userId,
      mode: "archive",
      day,
      promptIds,
      startedAt: now(),
      finishedAt: null,
      totalSouls: 0,
    };
    await repo.createRun(run);
    return startResult(run);
  }

  async function openRound(run: RunRow, idx: number): Promise<RoundRow> {
    const rounds = await sweep(run.id);
    const round = rounds[idx];
    if (!round) throw new GameError("bad_round", 400, "No such round");
    if (rounds.slice(0, idx).some((r) => !isClosed(r))) {
      throw new GameError("out_of_order", 409, "Finish the previous round first");
    }
    return round;
  }

  async function serveRound(userId: string, runId: string, token: string, idx: number) {
    const run = await authorize(userId, runId, token);
    let round = await openRound(run, idx);
    if (isClosed(round)) throw new GameError("round_closed", 409, "Round already played");
    if (round.status === "pending") {
      const servedAt = now();
      const ok = await repo.updateRound(runId, idx, "pending", { status: "open", servedAt });
      round = ok ? { ...round, status: "open", servedAt } : (await repo.getRounds(runId))[idx]!;
    }
    const prompt = await repo.getPrompt(round.promptId);
    if (!prompt) throw new GameError("not_found", 404, "Prompt missing");
    const servedAt = round.servedAt!;
    const result: ServeResult = {
      idx,
      prompt: { text: prompt.text, category: prompt.category },
      servedAt,
      opensAt: servedAt + PREVIEW_MS,
      deadline: servedAt + PREVIEW_MS + ANSWER_MS,
      serverNow: now(),
    };
    return result;
  }

  async function loadOpenRound(userId: string, runId: string, token: string, idx: number) {
    const run = await authorize(userId, runId, token);
    const rounds = await repo.getRounds(runId);
    const round = rounds.find((r) => r.idx === idx);
    if (!round) throw new GameError("bad_round", 400, "No such round");
    return { run, round };
  }

  async function guess(
    userId: string,
    runId: string,
    token: string,
    idx: number,
    text: string,
    confirmId?: string,
  ): Promise<GuessResult> {
    const { run, round } = await loadOpenRound(userId, runId, token, idx);
    if (round.status !== "open") {
      if (round.status === "expired") return { status: "expired" };
      throw new GameError("round_closed", 409, "Round is not open");
    }
    const t = now();
    if (t > deadlineOf(round) + GRACE_MS) {
      await repo.updateRound(runId, idx, "open", { status: "expired", souls: 0 });
      return { status: "expired" };
    }
    if (t < (round.servedAt ?? 0) + PREVIEW_MS - EARLY_TOLERANCE_MS) {
      throw new GameError("not_open", 409, "The clock hasn't started yet");
    }
    await repo.incrementGuesses(runId, idx);

    const prompt = await repo.getPrompt(round.promptId);
    if (!prompt) throw new GameError("not_found", 404, "Prompt missing");
    const match = matchGuess(indexFor(prompt), text);
    const display = (id: string) => prompt.answers.find((a) => a.id === id)?.display ?? id;

    let answerId: string | null = null;
    if (confirmId !== undefined) {
      if (match.kind !== "suggest" || !match.answerIds.includes(confirmId)) {
        throw new GameError("bad_confirm", 400, "That suggestion doesn't match your guess");
      }
      answerId = confirmId;
    } else if (match.kind === "exact") {
      answerId = match.answerId;
    }

    if (answerId === null) {
      if (match.kind === "suggest") {
        return {
          status: "suggest",
          suggestions: match.answerIds.map((id) => ({ id, display: display(id) })),
        };
      }
      return match.kind === "whyNot"
        ? { status: "whyNot", reason: match.reason }
        : { status: "invalid" };
    }

    const answer = prompt.answers.find((a) => a.id === answerId)!;
    const live = await repo.getLiveTiers(prompt.id);
    const tier: Tier = live?.[answerId] ?? answer.seedTier;
    const souls = soulsFor(tier);
    const ok = await repo.updateRound(runId, idx, "open", {
      status: "answered",
      answerId,
      tier,
      souls,
      answeredAt: t,
    });
    if (!ok) throw new GameError("round_closed", 409, "Round already resolved");
    if (run.mode === "daily" && run.day !== null) await repo.addTally(run.day, prompt.id, answerId);
    return { status: "correct", answer: { id: answerId, display: answer.display }, tier, souls };
  }

  async function expireRound(userId: string, runId: string, token: string, idx: number) {
    const { round } = await loadOpenRound(userId, runId, token, idx);
    if (round.status === "expired") return { status: "expired" as const };
    if (round.status !== "open") throw new GameError("round_closed", 409, "Round is not open");
    if (now() < deadlineOf(round) - EARLY_TOLERANCE_MS) {
      throw new GameError("too_early", 409, "Time isn't up yet");
    }
    await repo.updateRound(runId, idx, "open", { status: "expired", souls: 0 });
    return { status: "expired" as const };
  }

  async function reveal(run: RunRow, rounds: RoundRow[]): Promise<RoundReveal[]> {
    return Promise.all(
      rounds.map(async (r) => {
        const prompt = await repo.getPrompt(r.promptId);
        const crowd = run.day !== null ? await repo.crowdAnswers(run.day, r.promptId) : [];
        const total = crowd.reduce((s, c) => s + c.count, 0);
        return {
          idx: r.idx,
          text: prompt?.text ?? "",
          answer: r.answerId
            ? (prompt?.answers.find((a) => a.id === r.answerId)?.display ?? null)
            : null,
          tier: r.tier,
          souls: r.souls,
          rejuvenator: prompt?.answers.find((a) => a.isRejuvenator)?.display ?? null,
          crowd: crowd.slice(0, 3).map((c) => ({
            display: c.display,
            share: total > 0 ? Math.round((c.count / total) * 100) : 0,
          })),
        };
      }),
    );
  }

  async function finish(userId: string, runId: string, token: string): Promise<FinishResult> {
    const run = await authorize(userId, runId, token);
    const rounds = await sweep(runId);
    if (rounds.some((r) => !isClosed(r))) {
      throw new GameError("unfinished", 409, "Some rounds are still unplayed");
    }
    const total = rounds.reduce((s, r) => s + r.souls, 0);
    const zone = zoneFor(total);
    let streak: FinishResult["streak"] = null;
    if (run.finishedAt === null) {
      await repo.finishRun(runId, total, zone.id, now());
      if (run.mode === "daily" && run.day !== null) streak = await repo.bumpStreak(userId, run.day);
    } else if (run.mode === "daily" && run.day !== null) {
      streak = await repo.bumpStreak(userId, run.day); // idempotent for the same day
    }

    let percentile: number | null = null;
    let players = 1;
    if ((run.mode === "daily" || run.mode === "archive") && run.day !== null) {
      const p = await repo.percentileFor(run.day, total);
      players = p.players;
      // A daily finisher is counted among `players`; an archive replayer is not.
      const others = run.mode === "daily" ? p.players - 1 : p.players;
      percentile = others > 0 ? Math.round((p.below / others) * 100) : null;
    }

    return {
      mode: run.mode,
      day: run.day,
      totalSouls: total,
      zone: zone.name,
      verdict: verdictFor(total).name,
      percentile,
      players,
      rounds: await reveal(run, rounds),
      share: buildShareText({
        day: run.day ?? 0,
        label:
          run.mode === "free"
            ? "Free Dive"
            : run.mode === "archive"
              ? `Replay ${run.day !== null && run.day >= 1 ? `#${run.day}` : "Beta"}`
              : undefined,
        tiers: rounds.map((r) => r.tier),
        percentile,
        url:
          run.mode === "daily" && run.day !== null
            ? `${shareUrl}${shareCardPath(
                run.day,
                rounds.map((r) => r.tier),
              )}`
            : shareUrl,
      }),
      streak,
    };
  }

  async function today(userId: string) {
    const date = new Date(now());
    const day = dayNumber(date);
    const scheduled = await repo.getScheduledPromptIds(day);
    const run = await repo.findDailyRun(userId, day);
    return {
      day,
      launched: day >= 1,
      nextResetAt: nextResetAt(date).toISOString(),
      available: scheduled !== null,
      played: run
        ? { runId: run.id, finished: run.finishedAt !== null, totalSouls: run.totalSouls }
        : null,
    };
  }

  return { startDaily, startFree, startArchive, serveRound, guess, expireRound, finish, today };
}

export type GameService = ReturnType<typeof createGameService>;
