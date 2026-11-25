import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildAnswerIndex, damerauLevenshtein, matchGuess } from "./match";
import { normalize } from "./normalize";
import { cumulativeShares, computeLiveTiers } from "./rarity";
import { buildSchedule, type SchedulablePrompt } from "./schedule";

describe("properties", () => {
  it("normalize is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(normalize(normalize(s))).toBe(normalize(s));
      }),
    );
  });

  it("damerauLevenshtein is symmetric and zero only for equal strings", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), fc.string({ maxLength: 12 }), (a, b) => {
        expect(damerauLevenshtein(a, b)).toBe(damerauLevenshtein(b, a));
        expect(damerauLevenshtein(a, b) === 0).toBe(a === b);
      }),
    );
  });

  it("every answer's own display name matches exactly", () => {
    const name = fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,14}$/);
    fc.assert(
      fc.property(
        fc.uniqueArray(name, { minLength: 1, maxLength: 12, selector: normalize }),
        (names) => {
          const answers = names.map((display, i) => ({ id: `a${i}`, display }));
          const index = buildAnswerIndex({ answers });
          answers.forEach((a) =>
            expect(matchGuess(index, a.display)).toEqual({ kind: "exact", answerId: a.id }),
          );
        },
      ),
    );
  });

  it("cumulative shares are within [0, 1) and monotone in rarity", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 4 }), fc.integer({ min: 1, max: 500 })),
        (tally) => {
          const cum = cumulativeShares(tally);
          for (const [a, ca] of Object.entries(cum)) {
            expect(ca).toBeGreaterThanOrEqual(0);
            expect(ca).toBeLessThan(1);
            for (const [b, cb] of Object.entries(cum)) {
              if (tally[a]! > tally[b]!) expect(ca).toBeLessThanOrEqual(cb);
            }
          }
        },
      ),
    );
  });

  it("live tiers always come back for every seed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), fc.integer({ min: 0, max: 1000 }), (x, y) => {
        const tiers = computeLiveTiers(
          [
            { answerId: "x", seedTier: "guardian" },
            { answerId: "y", seedTier: "walker" },
          ],
          { x, y },
        );
        expect(Object.keys(tiers).sort()).toEqual(["x", "y"]);
      }),
    );
  });

  it("schedules are deterministic for any seed", () => {
    const prompts: SchedulablePrompt[] = (
      ["heroes", "items", "lore", "community"] as const
    ).flatMap((category, ci) =>
      Array.from({ length: [95, 65, 32, 32][ci]! }, (_, i) => ({
        id: `${category}-${i}`,
        category,
        answerIds: [`${category}-${i}`],
      })),
    );
    fc.assert(
      fc.property(fc.string(), (seed) => {
        const opts = { prompts, startDay: 1, days: 10, seed };
        expect(buildSchedule(opts)).toEqual(buildSchedule(opts));
      }),
      { numRuns: 25 },
    );
  });
});
