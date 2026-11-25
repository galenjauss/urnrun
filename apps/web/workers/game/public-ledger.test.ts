import { describe, expect, it } from "vitest";
import { FakeRepo } from "./fake-repo";
import { CROWD_SHOWN, buildDayLedger } from "./public-ledger";
import type { PlayablePrompt, RunRow } from "./types";

function prompt(id: string, n: number): PlayablePrompt {
  return {
    id,
    category: "heroes",
    text: `Prompt ${id}`,
    answers: Array.from({ length: n }, (_, i) => ({
      id: `a${i}`,
      display: `Answer ${i}`,
      aliases: [],
      seedTier: "trooper" as const,
      locked: false,
      isRejuvenator: i === n - 1,
    })),
    whyNot: {},
  };
}

function run(id: string, day: number, total: number, finished = true): RunRow {
  return {
    id,
    userId: `u-${id}`,
    mode: "daily",
    day,
    promptIds: [],
    startedAt: 0,
    finishedAt: finished ? 1 : null,
    totalSouls: total,
  };
}

function seeded(): FakeRepo {
  const repo = new FakeRepo();
  repo.prompts.set("p1", prompt("p1", 8));
  repo.prompts.set("p2", prompt("p2", 3));
  repo.schedule.set(4, ["p1", "p2"]);
  repo.runs.set("r1", run("r1", 4, 1000));
  repo.runs.set("r2", run("r2", 4, 3000));
  repo.runs.set("r3", run("r3", 4, 9999, false));
  for (let i = 0; i < 7; i++) void repo.addTally(4, "p1", `a${i % 7}`);
  void repo.addTally(4, "p1", "a0");
  return repo;
}

describe("pastDays", () => {
  it("lists only finished days, newest first", async () => {
    const repo = seeded();
    repo.schedule.set(1, ["p2"]);
    repo.schedule.set(7, ["p2"]);
    expect(await repo.pastDays(7, 10)).toEqual([4, 1]);
    expect(await repo.pastDays(7, 1)).toEqual([4]);
  });
});

describe("buildDayLedger", () => {
  it("never reveals today or the future", async () => {
    const repo = seeded();
    expect(await buildDayLedger(repo, 4, 4)).toBeNull();
    expect(await buildDayLedger(repo, 5, 4)).toBeNull();
  });

  it("returns null for unscheduled or malformed days", async () => {
    const repo = seeded();
    expect(await buildDayLedger(repo, 3, 9)).toBeNull();
    expect(await buildDayLedger(repo, 2.5, 9)).toBeNull();
  });

  it("summarises a finished day without exposing full answer lists", async () => {
    const l = (await buildDayLedger(seeded(), 4, 5))!;
    expect(l).toMatchObject({ day: 4, players: 2, avgSouls: 2000, bestSouls: 3000 });
    expect(l.prompts.map((p) => p.idx)).toEqual([0, 1]);
    const p1 = l.prompts[0]!;
    expect(p1).toMatchObject({ rejuvenator: "Answer 7", answerCount: 8 });
    expect(p1.crowd).toHaveLength(CROWD_SHOWN);
    expect(p1.crowd[0]).toEqual({ display: "Answer 0", share: 25 });
    expect(JSON.stringify(l)).not.toContain("aliases");
    expect(l.prompts[1]!.crowd).toEqual([]);
  });
});
