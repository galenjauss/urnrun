import { describe, expect, it } from "vitest";
import { summarize } from "./stats";

describe("summarize", () => {
  it("handles an empty history", () => {
    expect(summarize({}, 10)).toMatchObject({
      played: 0,
      best: 0,
      average: 0,
      streak: 0,
      longest: 0,
    });
  });

  it("computes totals, streaks and the recent window", () => {
    const s = summarize({ 1: 1000, 2: 2000, 3: 3000, 7: 600, 8: 900 }, 9, 5);
    expect(s).toMatchObject({ played: 5, best: 3000, average: 1500, streak: 2, longest: 3 });
    expect(s.recent).toEqual([
      { day: 5, souls: null },
      { day: 6, souls: null },
      { day: 7, souls: 600 },
      { day: 8, souls: 900 },
      { day: 9, souls: null },
    ]);
  });

  it("counts today's dive in the current streak", () => {
    expect(summarize({ 4: 1, 5: 1 }, 5).streak).toBe(2);
    expect(summarize({ 4: 1, 5: 1 }, 7).streak).toBe(0);
  });
});
