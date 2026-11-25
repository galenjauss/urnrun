import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createD1Repo } from "./d1-repo";

type Proxy = Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let proxy: Proxy;
let db: D1Database;

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  db = proxy.env.DB;
  const sql = readFileSync(join(__dirname, "../../migrations/0001_init.sql"), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (const stmt of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await db.prepare(stmt).run();
  }
  await db.batch([
    db.prepare("INSERT INTO prompts (id, category, text) VALUES ('p1','heroes','Name a hero')"),
    db.prepare(
      `INSERT INTO prompt_answers (prompt_id, answer_id, display, aliases_json, seed_tier, locked, is_rejuv)
       VALUES ('p1','seven','Seven','["7"]','trooper',1,0), ('p1','paradox','Paradox','[]','rejuvenator',0,1)`,
    ),
    db.prepare(
      "INSERT INTO prompt_why_nots (prompt_id, guess, reason) VALUES ('p1','trooper','nope')",
    ),
    db.prepare(
      `INSERT INTO daily_schedule (day, prompt_ids_json, published_at) VALUES (3, '["p1"]', 0)`,
    ),
  ]);
}, 60_000);

afterAll(async () => {
  await proxy?.dispose();
});

describe("D1 repo", () => {
  it("reads schedule and prompts with answers and why-nots", async () => {
    const repo = createD1Repo(db);
    expect(await repo.getScheduledPromptIds(3)).toEqual(["p1"]);
    expect(await repo.getScheduledPromptIds(4)).toBeNull();
    const p = await repo.getPrompt("p1");
    expect(p).toMatchObject({ id: "p1", text: "Name a hero", whyNot: { trooper: "nope" } });
    expect(p!.answers).toContainEqual({
      id: "seven",
      display: "Seven",
      aliases: ["7"],
      seedTier: "trooper",
      locked: true,
      isRejuvenator: false,
    });
    expect(await repo.getPrompt("missing")).toBeNull();
    expect(await repo.getLiveTiers("p1")).toBeNull();
  });

  it("runs the run/round lifecycle with conditional updates", async () => {
    const repo = createD1Repo(db);
    await repo.ensureUser("u1", 1);
    await repo.ensureUser("u1", 2);
    const run = {
      id: "r1",
      userId: "u1",
      mode: "daily" as const,
      day: 3,
      promptIds: ["p1", "p1"],
      startedAt: 10,
      finishedAt: null,
      totalSouls: 0,
    };
    await repo.createRun(run);
    await expect(repo.createRun({ ...run, id: "r2" })).rejects.toThrow(/UNIQUE/);
    expect(await repo.findDailyRun("u1", 3)).toMatchObject({ id: "r1", promptIds: ["p1", "p1"] });
    expect(await repo.getRun("nope")).toBeNull();

    expect(await repo.updateRound("r1", 0, "pending", { status: "open", servedAt: 100 })).toBe(
      true,
    );
    expect(await repo.updateRound("r1", 0, "pending", { status: "open", servedAt: 200 })).toBe(
      false,
    );
    expect(await repo.updateRound("r1", 0, "open", {})).toBe(false);
    await repo.incrementGuesses("r1", 0);
    await repo.updateRound("r1", 0, "open", {
      status: "answered",
      answerId: "seven",
      tier: "trooper",
      souls: 100,
      answeredAt: 150,
    });
    const [r0] = await repo.getRounds("r1");
    expect(r0).toMatchObject({
      status: "answered",
      servedAt: 100,
      guesses: 1,
      souls: 100,
      answerId: "seven",
    });

    await repo.addTally(3, "p1", "seven");
    await repo.addTally(3, "p1", "seven");
    await repo.addTally(3, "p1", "paradox");
    expect(await repo.crowdAnswers(3, "p1")).toEqual([
      { answerId: "seven", display: "Seven", count: 2 },
      { answerId: "paradox", display: "Paradox", count: 1 },
    ]);

    await repo.finishRun("r1", 100, "curb", 500);
    await repo.finishRun("r1", 9999, "hearth", 600); // ignored: already finished
    expect(await repo.getRun("r1")).toMatchObject({ totalSouls: 100, finishedAt: 500 });
    expect(await repo.percentileFor(3, 150)).toEqual({ below: 1, players: 1 });
  });

  it("bumps streaks idempotently per day", async () => {
    const repo = createD1Repo(db);
    await repo.ensureUser("s1", 1);
    expect(await repo.bumpStreak("s1", 3)).toEqual({ current: 1, best: 1 });
    expect(await repo.bumpStreak("s1", 3)).toEqual({ current: 1, best: 1 });
    expect(await repo.bumpStreak("s1", 4)).toEqual({ current: 2, best: 2 });
    expect(await repo.bumpStreak("s1", 9)).toEqual({ current: 1, best: 2 });
  });
});
