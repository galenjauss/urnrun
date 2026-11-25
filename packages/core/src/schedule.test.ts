import { describe, expect, it } from "vitest";
import { answerOverlap, buildSchedule, DAILY_MIX, type SchedulablePrompt } from "./schedule";

function bank(): SchedulablePrompt[] {
  const mk = (cat: SchedulablePrompt["category"], n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${cat}-${i}`,
      category: cat,
      // mostly disjoint answer sets, with a few deliberate overlaps
      answerIds: Array.from({ length: 8 }, (_, j) => `${cat}-${i}-a${j}`),
    }));
  return [...mk("heroes", 95), ...mk("items", 65), ...mk("lore", 32), ...mk("community", 32)];
}

describe("answerOverlap", () => {
  it("is |A∩B| / min(|A|,|B|)", () => {
    expect(answerOverlap(["a", "b", "c", "d"], ["c", "d"])).toBe(1);
    expect(answerOverlap(["a", "b"], ["c"])).toBe(0);
    expect(answerOverlap(["a", "b", "c", "d"], ["a", "x", "y", "z"])).toBe(0.25);
    expect(answerOverlap([], ["a"])).toBe(0);
  });
});

describe("buildSchedule", () => {
  const opts = { prompts: bank(), startDay: 1, days: 30, seed: "launch" };

  it("produces 7 prompts per day with the 3/2/1/1 category mix", () => {
    const sched = buildSchedule(opts);
    expect(sched).toHaveLength(30);
    const byId = new Map(opts.prompts.map((p) => [p.id, p]));
    for (const day of sched) {
      expect(day.promptIds).toHaveLength(7);
      const counts: Record<string, number> = {};
      for (const id of day.promptIds) {
        const cat = byId.get(id)!.category;
        counts[cat] = (counts[cat] ?? 0) + 1;
      }
      expect(counts).toEqual(DAILY_MIX);
    }
  });

  it("is deterministic for the same seed and differs for another", () => {
    expect(buildSchedule(opts)).toEqual(buildSchedule(opts));
    expect(buildSchedule({ ...opts, seed: "other" })).not.toEqual(buildSchedule(opts));
  });

  it("never repeats a prompt within 30 days", () => {
    const sched = buildSchedule({ ...opts, days: 60 });
    const lastSeen = new Map<string, number>();
    for (const { day, promptIds } of sched) {
      for (const id of promptIds) {
        const prev = lastSeen.get(id);
        if (prev !== undefined) expect(day - prev).toBeGreaterThanOrEqual(30);
        lastSeen.set(id, day);
      }
    }
  });

  it("respects history from already-published days", () => {
    const history = [{ day: 0, promptIds: ["heroes-0", "heroes-1", "heroes-2"] }];
    const sched = buildSchedule({ ...opts, history });
    const early = sched.filter((d) => d.day < 30).flatMap((d) => d.promptIds);
    expect(early).not.toContain("heroes-0");
  });

  it("keeps same-day answer overlap ≤ 60%", () => {
    const prompts = bank();
    // make heroes-0..4 share almost all answers
    const shared = Array.from({ length: 8 }, (_, j) => `shared-${j}`);
    const overlapped = prompts.map((p, i) => (i < 5 ? { ...p, answerIds: shared } : p));
    const sched = buildSchedule({ ...opts, prompts: overlapped });
    const byId = new Map(overlapped.map((p) => [p.id, p]));
    for (const { promptIds } of sched) {
      for (let i = 0; i < promptIds.length; i++) {
        for (let j = i + 1; j < promptIds.length; j++) {
          const a = byId.get(promptIds[i]!)!.answerIds;
          const b = byId.get(promptIds[j]!)!.answerIds;
          expect(answerOverlap(a, b)).toBeLessThanOrEqual(0.6);
        }
      }
    }
  });

  it("throws a clear error when the bank is too small", () => {
    const tiny = bank().filter((p) => p.category !== "lore" || p.id === "lore-0");
    expect(() => buildSchedule({ ...opts, prompts: tiny, days: 5 })).toThrow(/lore/);
  });
});

describe("buildSchedule hardening", () => {
  const opts = { prompts: bank(), startDay: 1, days: 30, seed: "launch" };

  it("uses the latest day per prompt even when history is unsorted", () => {
    const history = [
      { day: 0, promptIds: ["heroes-0"] },
      { day: -40, promptIds: ["heroes-0"] },
    ];
    const early = buildSchedule({ ...opts, history })
      .filter((d) => d.day < 30)
      .flatMap((d) => d.promptIds);
    expect(early).not.toContain("heroes-0");
  });

  it("rejects duplicate prompt ids and non-positive day counts", () => {
    const dup = [...bank(), bank()[0]!];
    expect(() => buildSchedule({ ...opts, prompts: dup })).toThrow(/duplicate/i);
    expect(() => buildSchedule({ ...opts, days: 0 })).toThrow(/days/);
  });

  it("allows a shorter no-repeat window for small dev banks", () => {
    const small = bank().filter((p) => Number(p.id.split("-")[1]) < 4);
    expect(() => buildSchedule({ ...opts, prompts: small, days: 6 })).toThrow();
    const sched = buildSchedule({ ...opts, prompts: small, days: 6, noRepeatDays: 1 });
    expect(sched).toHaveLength(6);
  });
});
