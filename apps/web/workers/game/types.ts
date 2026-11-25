import type { Tier } from "@urnrun/core";

export type Mode = "daily" | "free" | "archive";
export type RoundStatus = "pending" | "open" | "answered" | "expired";

export interface PromptAnswer {
  id: string;
  display: string;
  aliases: string[];
  seedTier: Tier;
  locked: boolean;
  isRejuvenator: boolean;
}

export interface PlayablePrompt {
  id: string;
  category: string;
  text: string;
  answers: PromptAnswer[];
  whyNot: Record<string, string>;
}

export interface RunRow {
  id: string;
  userId: string;
  mode: Mode;
  day: number | null;
  promptIds: string[];
  startedAt: number;
  finishedAt: number | null;
  totalSouls: number;
}

export interface RoundRow {
  runId: string;
  idx: number;
  promptId: string;
  answerId: string | null;
  tier: Tier | null;
  souls: number;
  servedAt: number | null;
  answeredAt: number | null;
  guesses: number;
  status: RoundStatus;
}

export interface CrowdAnswer {
  answerId: string;
  display: string;
  count: number;
}

/** Data access for the game loop (D1 in production, in-memory in tests). */
export interface GameRepo {
  getScheduledPromptIds(day: number): Promise<string[] | null>;
  getPrompt(promptId: string): Promise<PlayablePrompt | null>;
  getLiveTiers(promptId: string): Promise<Record<string, Tier> | null>;
  ensureUser(userId: string, now: number): Promise<void>;
  findDailyRun(userId: string, day: number): Promise<RunRow | null>;
  getRun(runId: string): Promise<RunRow | null>;
  createRun(run: RunRow): Promise<void>;
  getRounds(runId: string): Promise<RoundRow[]>;
  /** Conditional update: only applies when the stored status equals `expect`. Returns success. */
  updateRound(
    runId: string,
    idx: number,
    expect: RoundStatus,
    patch: Partial<Omit<RoundRow, "runId" | "idx" | "promptId">>,
  ): Promise<boolean>;
  incrementGuesses(runId: string, idx: number): Promise<void>;
  addTally(day: number, promptId: string, answerId: string): Promise<void>;
  finishRun(runId: string, total: number, zone: string, now: number): Promise<void>;
  percentileFor(day: number, total: number): Promise<{ below: number; players: number }>;
  crowdAnswers(day: number, promptId: string): Promise<CrowdAnswer[]>;
  /** Active prompt ids with their category (the Free Dive bank). */
  activePrompts(): Promise<{ id: string; category: string }[]>;
  /** Prompt ids scheduled on any day in [from, to]. */
  scheduledPromptIdsBetween(from: number, to: number): Promise<string[]>;
  /** Scheduled days strictly before `before`, newest first. */
  pastDays(before: number, limit: number): Promise<number[]>;
  /** Finished, unflagged daily runs for a day: player count, mean and best total. */
  dayStats(day: number): Promise<{ players: number; avgSouls: number; bestSouls: number }>;
  bumpStreak(userId: string, day: number): Promise<{ current: number; best: number }>;
}
