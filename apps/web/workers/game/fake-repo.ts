import type { Tier } from "@urnrun/core";
import type { CrowdAnswer, GameRepo, PlayablePrompt, RoundRow, RunRow } from "./types";

/** In-memory GameRepo for unit tests. */
export class FakeRepo implements GameRepo {
  schedule = new Map<number, string[]>();
  prompts = new Map<string, PlayablePrompt>();
  liveTiers = new Map<string, Record<string, Tier>>();
  users = new Set<string>();
  runs = new Map<string, RunRow>();
  rounds = new Map<string, RoundRow[]>();
  tallies = new Map<string, number>();
  streaks = new Map<string, { current: number; best: number; lastDay: number }>();

  async getScheduledPromptIds(day: number) {
    return this.schedule.get(day) ?? null;
  }
  async getPrompt(id: string) {
    return this.prompts.get(id) ?? null;
  }
  async getLiveTiers(id: string) {
    return this.liveTiers.get(id) ?? null;
  }
  async ensureUser(id: string) {
    this.users.add(id);
  }
  async findDailyRun(userId: string, day: number) {
    return (
      [...this.runs.values()].find(
        (r) => r.userId === userId && r.day === day && r.mode === "daily",
      ) ?? null
    );
  }
  async getRun(id: string) {
    const run = this.runs.get(id);
    return run ? { ...run } : null;
  }
  async createRun(run: RunRow) {
    if (run.mode === "daily" && (await this.findDailyRun(run.userId, run.day!))) {
      throw new Error("UNIQUE constraint failed: runs.user_id, runs.day");
    }
    this.runs.set(run.id, { ...run });
    this.rounds.set(
      run.id,
      run.promptIds.map((promptId, idx) => ({
        runId: run.id,
        idx,
        promptId,
        answerId: null,
        tier: null,
        souls: 0,
        servedAt: null,
        answeredAt: null,
        guesses: 0,
        status: "pending",
      })),
    );
  }
  async getRounds(runId: string) {
    return (this.rounds.get(runId) ?? []).map((r) => ({ ...r }));
  }
  async updateRound(
    runId: string,
    idx: number,
    expect: RoundRow["status"],
    patch: Partial<RoundRow>,
  ) {
    const list = this.rounds.get(runId) ?? [];
    const row = list[idx];
    if (!row || row.status !== expect) return false;
    list[idx] = { ...row, ...patch };
    return true;
  }
  async incrementGuesses(runId: string, idx: number) {
    const row = this.rounds.get(runId)?.[idx];
    if (row) row.guesses += 1;
  }
  async addTally(day: number, promptId: string, answerId: string) {
    const key = `${day}|${promptId}|${answerId}`;
    this.tallies.set(key, (this.tallies.get(key) ?? 0) + 1);
  }
  async finishRun(runId: string, total: number, _zone: string, now: number) {
    const run = this.runs.get(runId)!;
    this.runs.set(runId, { ...run, totalSouls: total, finishedAt: now });
  }
  async percentileFor(day: number, total: number) {
    const done = [...this.runs.values()].filter((r) => r.day === day && r.finishedAt !== null);
    return { below: done.filter((r) => r.totalSouls < total).length, players: done.length };
  }
  async pastDays(before: number, limit: number) {
    return [...this.schedule.keys()]
      .filter((d) => d < before)
      .sort((a, b) => b - a)
      .slice(0, limit);
  }
  async dayStats(day: number) {
    const done = [...this.runs.values()].filter((r) => r.day === day && r.finishedAt !== null);
    const sum = done.reduce((s, r) => s + r.totalSouls, 0);
    return {
      players: done.length,
      avgSouls: done.length ? Math.round(sum / done.length) : 0,
      bestSouls: done.reduce((m, r) => Math.max(m, r.totalSouls), 0),
    };
  }
  async crowdAnswers(day: number, promptId: string): Promise<CrowdAnswer[]> {
    const prompt = this.prompts.get(promptId);
    return [...this.tallies.entries()]
      .filter(([k]) => k.startsWith(`${day}|${promptId}|`))
      .map(([k, count]) => {
        const answerId = k.split("|")[2]!;
        return {
          answerId,
          display: prompt?.answers.find((a) => a.id === answerId)?.display ?? answerId,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }
  async bumpStreak(userId: string, day: number) {
    const s = this.streaks.get(userId);
    const current =
      s && s.lastDay === day - 1 ? s.current + 1 : s && s.lastDay === day ? s.current : 1;
    const best = Math.max(current, s?.best ?? 0);
    this.streaks.set(userId, { current, best, lastDay: day });
    return { current, best };
  }
}
