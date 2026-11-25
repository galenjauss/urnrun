import { DAY_ONE_UTC } from "@urnrun/core";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeRepo } from "./fake-repo";
import { ANSWER_MS, GRACE_MS, PREVIEW_MS, createGameService, GameError } from "./service";
import type { PlayablePrompt } from "./types";

const DAY = 5;
const T0 = DAY_ONE_UTC + (DAY - 1) * 86_400_000 + 3_600_000; // 01:00 UTC on day 5

function prompt(i: number): PlayablePrompt {
  return {
    id: `p${i}`,
    category: "heroes",
    text: `Prompt number ${i}`,
    answers: [
      {
        id: "seven",
        display: "Seven",
        aliases: [],
        seedTier: "trooper",
        locked: true,
        isRejuvenator: false,
      },
      {
        id: "viscous",
        display: "Viscous",
        aliases: ["goo"],
        seedTier: "walker",
        locked: false,
        isRejuvenator: false,
      },
      {
        id: "grey_talon",
        display: "Grey Talon",
        aliases: ["gt"],
        seedTier: "guardian",
        locked: false,
        isRejuvenator: false,
      },
      {
        id: "paradox",
        display: "Paradox",
        aliases: [],
        seedTier: "rejuvenator",
        locked: false,
        isRejuvenator: true,
      },
    ],
    whyNot: { lash: "Lash pulls himself, not enemies." },
  };
}

let repo: FakeRepo;
let now: number;
const svc = () =>
  createGameService({ repo, secret: "test-secret", now: () => now, shareUrl: "https://x.test" });

beforeEach(() => {
  repo = new FakeRepo();
  now = T0;
  const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);
  ids.forEach((_, i) => repo.prompts.set(`p${i}`, prompt(i)));
  repo.schedule.set(DAY, ids);
});

async function startAndServe(user = "u1") {
  const start = await svc().startDaily(user);
  const served = await svc().serveRound(user, start.runId, start.token, 0);
  now += PREVIEW_MS;
  return { start, served };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof GameError && e.code === code);
}

describe("startDaily", () => {
  it("creates a run with 7 pending rounds and resumes it on repeat", async () => {
    const a = await svc().startDaily("u1");
    expect(a).toMatchObject({ day: DAY, totalRounds: 7, nextIdx: 0, finished: false });
    expect(a.rounds.every((r) => r.status === "pending")).toBe(true);
    const b = await svc().startDaily("u1");
    expect(b.runId).toBe(a.runId);
    expect(b.token).toBe(a.token);
    expect(repo.users.has("u1")).toBe(true);
  });

  it("fails cleanly when no dive is scheduled", async () => {
    repo.schedule.clear();
    await expectCode(svc().startDaily("u1"), "no_dive");
  });
});

describe("serveRound", () => {
  it("rejects bad tokens and other users", async () => {
    const s = await svc().startDaily("u1");
    await expectCode(svc().serveRound("u1", s.runId, "nope", 0), "forbidden");
    await expectCode(svc().serveRound("u2", s.runId, s.token, 0), "not_found");
  });

  it("enforces order and is idempotent for an open round", async () => {
    const s = await svc().startDaily("u1");
    await expectCode(svc().serveRound("u1", s.runId, s.token, 1), "out_of_order");
    const a = await svc().serveRound("u1", s.runId, s.token, 0);
    expect(a.prompt.text).toBe("Prompt number 0");
    expect(a.opensAt - a.servedAt).toBe(PREVIEW_MS);
    expect(a.deadline - a.opensAt).toBe(ANSWER_MS);
    now += 2000;
    const b = await svc().serveRound("u1", s.runId, s.token, 0);
    expect(b.servedAt).toBe(a.servedAt);
    expect(b.serverNow).toBe(now);
  });

  it("never leaks answers in the served payload", async () => {
    const { served } = await startAndServe();
    expect(JSON.stringify(served)).not.toMatch(/viscous|seven|paradox/i);
  });
});

describe("guess", () => {
  it("blocks guesses during the preview", async () => {
    const s = await svc().startDaily("u1");
    await svc().serveRound("u1", s.runId, s.token, 0);
    await expectCode(svc().guess("u1", s.runId, s.token, 0, "Seven"), "not_open");
  });

  it("scores exact answers by seed tier and tallies them", async () => {
    const { start } = await startAndServe();
    const r = await svc().guess("u1", start.runId, start.token, 0, "  VISCOUS ");
    expect(r).toEqual({
      status: "correct",
      answer: { id: "viscous", display: "Viscous" },
      tier: "walker",
      souls: 600,
    });
    expect(repo.tallies.get(`${DAY}|p0|viscous`)).toBe(1);
    await expectCode(svc().guess("u1", start.runId, start.token, 0, "Seven"), "round_closed");
  });

  it("prefers live tiers over seeds", async () => {
    repo.liveTiers.set("p0", { viscous: "mid_boss" });
    const { start } = await startAndServe();
    const r = await svc().guess("u1", start.runId, start.token, 0, "goo");
    expect(r).toMatchObject({ status: "correct", tier: "mid_boss", souls: 850 });
  });

  it("suggests near misses and accepts a confirmed suggestion", async () => {
    const { start } = await startAndServe();
    const sug = await svc().guess("u1", start.runId, start.token, 0, "Vicsous");
    expect(sug).toEqual({
      status: "suggest",
      suggestions: [{ id: "viscous", display: "Viscous" }],
    });
    await expectCode(
      svc().guess("u1", start.runId, start.token, 0, "Vicsous", "paradox"),
      "bad_confirm",
    );
    const ok = await svc().guess("u1", start.runId, start.token, 0, "Vicsous", "viscous");
    expect(ok).toMatchObject({ status: "correct", souls: 600 });
  });

  it("explains why-nots and rejects unknowns without closing the round", async () => {
    const { start } = await startAndServe();
    expect(await svc().guess("u1", start.runId, start.token, 0, "Lash")).toEqual({
      status: "whyNot",
      reason: "Lash pulls himself, not enemies.",
    });
    expect(await svc().guess("u1", start.runId, start.token, 0, "Abrams")).toEqual({
      status: "invalid",
    });
    expect((await repo.getRounds(start.runId))[0]!.guesses).toBe(2);
  });

  it("expires late guesses with zero souls", async () => {
    const { start } = await startAndServe();
    now += ANSWER_MS + GRACE_MS + 1;
    expect(await svc().guess("u1", start.runId, start.token, 0, "Seven")).toEqual({
      status: "expired",
    });
    expect((await repo.getRounds(start.runId))[0]).toMatchObject({ status: "expired", souls: 0 });
  });
});

describe("expireRound", () => {
  it("refuses early expiry and accepts at the deadline", async () => {
    const { start } = await startAndServe();
    await expectCode(svc().expireRound("u1", start.runId, start.token, 0), "too_early");
    now += ANSWER_MS;
    expect(await svc().expireRound("u1", start.runId, start.token, 0)).toEqual({
      status: "expired",
    });
    expect(await svc().expireRound("u1", start.runId, start.token, 0)).toEqual({
      status: "expired",
    });
  });
});

async function playAll(user: string, answers: (string | null)[], mode: "daily" | "free" = "daily") {
  const s = mode === "free" ? await svc().startFree(user) : await svc().startDaily(user);
  for (let i = 0; i < 7; i++) {
    await svc().serveRound(user, s.runId, s.token, i);
    now += PREVIEW_MS;
    const a = answers[i];
    if (a) await svc().guess(user, s.runId, s.token, i, a);
    else {
      now += ANSWER_MS;
      await svc().expireRound(user, s.runId, s.token, i);
    }
    now += 500;
  }
  return s;
}

describe("finish", () => {
  it("refuses to finish an incomplete run", async () => {
    const s = await svc().startDaily("u1");
    await expectCode(svc().finish("u1", s.runId, s.token), "unfinished");
  });

  it("totals the run, builds share text and bumps the streak once", async () => {
    const s = await playAll("u1", ["Seven", "Viscous", "Paradox", "gt", null, "Seven", "Seven"]);
    const res = await svc().finish("u1", s.runId, s.token);
    expect(res.totalSouls).toBe(100 + 600 + 1000 + 300 + 0 + 100 + 100);
    expect(res.zone).toBe("The Sewers");
    expect(res.percentile).toBeNull(); // first courier of the day
    expect(res.share.split("\n")[1]).toBe("🪖🗼💠🛡️⬛🪖🪖");
    expect(res.rounds[2]).toMatchObject({
      text: "Prompt number 2",
      answer: "Paradox",
      tier: "rejuvenator",
      rejuvenator: "Paradox",
    });
    expect(res.rounds[0]!.crowd[0]).toMatchObject({ display: "Seven", share: 100 });
    expect(res.streak).toEqual({ current: 1, best: 1 });
    const again = await svc().finish("u1", s.runId, s.token);
    expect(again.totalSouls).toBe(res.totalSouls);
    expect(again.streak).toEqual({ current: 1, best: 1 });
    const resumed = await svc().startDaily("u1");
    expect(resumed.finished).toBe(true);
  });

  it("computes percentile against other couriers", async () => {
    const a = await playAll("a", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await svc().finish("a", a.runId, a.token);
    const b = await playAll("b", [
      "Paradox",
      "Paradox",
      "Paradox",
      "Paradox",
      "Paradox",
      "Paradox",
      "Paradox",
    ]);
    const res = await svc().finish("b", b.runId, b.token);
    expect(res.totalSouls).toBe(7000);
    expect(res.percentile).toBe(100);
    expect(res.zone).toBe("The Patron's Hearth");
  });

  it("auto-expires an abandoned open round", async () => {
    const s = await svc().startDaily("u1");
    for (let i = 0; i < 7; i++) {
      await svc().serveRound("u1", s.runId, s.token, i);
      now += PREVIEW_MS + ANSWER_MS + GRACE_MS + 1;
    }
    const res = await svc().finish("u1", s.runId, s.token);
    expect(res.totalSouls).toBe(0);
  });
});

describe("free dive", () => {
  const addBank = (n: number) => {
    for (let i = 7; i < 7 + n; i++) repo.prompts.set(`p${i}`, { ...prompt(i), id: `p${i}` });
  };

  it("unlocks only after today's daily is finished", async () => {
    addBank(7);
    await expectCode(svc().startFree("u1"), "daily_first");
    const d = await playAll("u1", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await expectCode(svc().startFree("u1"), "daily_first");
    await svc().finish("u1", d.runId, d.token);
    const f = await svc().startFree("u1");
    expect(f.totalRounds).toBe(7);
  });

  it("never serves an upcoming daily prompt", async () => {
    addBank(7);
    const d = await playAll("u1", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await svc().finish("u1", d.runId, d.token);
    const f = await svc().startFree("u1");
    const run = await repo.getRun(f.runId);
    expect(run!.mode).toBe("free");
    expect(run!.day).toBeNull();
    expect(run!.promptIds.every((id) => Number(id.slice(1)) >= 7)).toBe(true);
  });

  it("refuses when only upcoming dailies are left", async () => {
    const d = await playAll("u1", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await svc().finish("u1", d.runId, d.token);
    await expectCode(svc().startFree("u1"), "no_free");
  });

  it("scores without streak, percentile or crowd tallies", async () => {
    addBank(7);
    const d = await playAll("u1", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await svc().finish("u1", d.runId, d.token);
    const talliesBefore = repo.tallies.size;
    const f = await playAll("u1", ["Paradox", null, null, null, null, null, null], "free");
    const res = await svc().finish("u1", f.runId, f.token);
    expect(res).toMatchObject({ mode: "free", day: null, percentile: null, streak: null });
    expect(res.totalSouls).toBe(1000);
    expect(res.share.startsWith("Urn Run Free Dive · 1,000 ft")).toBe(true);
    expect(repo.tallies.size).toBe(talliesBefore);
  });
});

describe("archive replay", () => {
  it("only replays finished past days", async () => {
    await expectCode(svc().startArchive("u1", DAY), "not_archived");
    await expectCode(svc().startArchive("u1", DAY - 1), "not_archived"); // unscheduled
    repo.schedule.set(DAY - 1, repo.schedule.get(DAY)!);
    const a = await svc().startArchive("u1", DAY - 1);
    expect((await repo.getRun(a.runId))!.mode).toBe("archive");
    const b = await svc().startArchive("u1", DAY - 1);
    expect(b.runId).not.toBe(a.runId); // replay as often as you like
  });

  it("ranks against that day's couriers without streak or tallies", async () => {
    // Two real couriers on DAY, then the clock moves to the next day and u3 replays DAY.
    const x = await playAll("x", ["Seven", "Seven", "Seven", "Seven", "Seven", "Seven", "Seven"]);
    await svc().finish("x", x.runId, x.token);
    const y = await playAll("y", [
      "Paradox",
      "Paradox",
      "Seven",
      "Seven",
      "Seven",
      "Seven",
      "Seven",
    ]);
    await svc().finish("y", y.runId, y.token);
    now = T0 + 86_400_000;
    const talliesBefore = JSON.stringify([...repo.tallies]);
    const s = await svc().startArchive("u3", DAY);
    for (let i = 0; i < 7; i++) {
      await svc().serveRound("u3", s.runId, s.token, i);
      now += PREVIEW_MS;
      await svc().guess("u3", s.runId, s.token, i, "Viscous");
      now += 500;
    }
    const res = await svc().finish("u3", s.runId, s.token);
    expect(res).toMatchObject({ mode: "archive", day: DAY, streak: null, totalSouls: 4200 });
    expect(res.percentile).toBe(100); // deeper than both of that day's couriers
    expect(res.share.startsWith("Urn Run Replay #5")).toBe(true);
    expect(res.share).not.toContain("/s/");
    expect(JSON.stringify([...repo.tallies])).toBe(talliesBefore);
    expect(repo.streaks.get("u3")).toBeUndefined();
  });
});

describe("today", () => {
  it("reports availability and the player's state", async () => {
    expect(await svc().today("u1")).toMatchObject({ day: DAY, available: true, played: null });
    const s = await svc().startDaily("u1");
    expect((await svc().today("u1")).played).toEqual({
      runId: s.runId,
      finished: false,
      totalSouls: 0,
    });
  });
});
