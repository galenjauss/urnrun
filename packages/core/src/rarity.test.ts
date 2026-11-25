import { describe, expect, it } from "vitest";
import { computeLiveTiers, cumulativeShares, tierFromCum, type AnswerSeed } from "./rarity";

describe("tierFromCum (SPEC §3.7 thresholds)", () => {
  it.each([
    [0, "trooper"],
    [0.1199, "trooper"],
    [0.12, "guardian"],
    [0.2999, "guardian"],
    [0.3, "walker"],
    [0.5499, "walker"],
    [0.55, "mid_boss"],
    [1, "mid_boss"],
  ])("cum %f → %s", (cum, tier) => {
    expect(tierFromCum(cum)).toBe(tier);
  });
});

describe("cumulativeShares", () => {
  it("cum(a) = share of players who gave a strictly more common answer", () => {
    const cum = cumulativeShares({ a: 50, b: 30, c: 20 });
    expect(cum.a).toBe(0);
    expect(cum.b).toBeCloseTo(0.5);
    expect(cum.c).toBeCloseTo(0.8);
  });

  it("ties share the same cum", () => {
    const cum = cumulativeShares({ a: 40, b: 40, c: 20 });
    expect(cum.a).toBe(0);
    expect(cum.b).toBe(0);
    expect(cum.c).toBeCloseTo(0.8);
  });

  it("handles empty tallies", () => {
    expect(cumulativeShares({})).toEqual({});
  });
});

// Build a tally with n total responses.
const seeds: AnswerSeed[] = [
  { answerId: "obvious1", seedTier: "trooper", locked: true },
  { answerId: "obvious2", seedTier: "trooper" },
  { answerId: "mid", seedTier: "guardian" },
  { answerId: "rare", seedTier: "walker" },
  { answerId: "deep", seedTier: "mid_boss" },
  { answerId: "clever", seedTier: "wise_guy" },
  { answerId: "gem", seedTier: "rejuvenator" },
];

describe("computeLiveTiers", () => {
  it("returns seed tiers when sample is below minimum", () => {
    const tiers = computeLiveTiers(seeds, { obvious1: 10, rare: 5 });
    expect(tiers).toEqual({
      obvious1: "trooper",
      obvious2: "trooper",
      mid: "guardian",
      rare: "walker",
      deep: "mid_boss",
      clever: "wise_guy",
      gem: "rejuvenator",
    });
  });

  it("promotes at most +1 tier above seed", () => {
    // obvious2 becomes very rare live (cum high) but seed is trooper → max guardian
    const tally = { obvious1: 600, mid: 200, rare: 100, deep: 50, clever: 40, obvious2: 10 };
    const tiers = computeLiveTiers(seeds, tally);
    expect(tiers.obvious2).toBe("guardian");
  });

  it("demotes up to −2 tiers below seed", () => {
    // deep (seed mid_boss) is the most common answer live → trooper by data, clamped to guardian
    const tally = { deep: 700, obvious1: 200, mid: 50, rare: 30, clever: 20 };
    const tiers = computeLiveTiers(seeds, tally);
    expect(tiers.deep).toBe("guardian");
  });

  it("never lifts locked troopers", () => {
    const tally = { mid: 700, rare: 200, obvious1: 5, clever: 95 };
    expect(computeLiveTiers(seeds, tally).obvious1).toBe("trooper");
  });

  it("keeps Wise Guy sticky unless live share < 1%", () => {
    const sticky = computeLiveTiers(seeds, { obvious1: 500, clever: 100, mid: 400 });
    expect(sticky.clever).toBe("wise_guy");
    const dropped = computeLiveTiers(seeds, { obvious1: 600, mid: 395, clever: 5 });
    expect(dropped.clever).not.toBe("wise_guy");
    // treated as guardian-seeded once the overlay drops: cum high → walker (+1 max)
    expect(dropped.clever).toBe("walker");
  });

  it("keeps Rejuvenator hand-picked regardless of data", () => {
    expect(computeLiveTiers(seeds, { gem: 900, obvious1: 100 }).gem).toBe("rejuvenator");
  });

  it("respects a custom minimum sample", () => {
    const tiers = computeLiveTiers(seeds, { deep: 9, obvious1: 1 }, { minSample: 10 });
    expect(tiers.deep).toBe("guardian");
  });
});

describe("computeLiveTiers hardening", () => {
  it("treats never-named answers as rarest once the sample is large enough", () => {
    const tiers = computeLiveTiers(seeds, { obvious1: 300 });
    expect(tiers.rare).toBe("mid_boss"); // walker seed, +1
    expect(tiers.clever).not.toBe("wise_guy"); // 0% share < 1%
  });

  it("ignores undefined option overrides", () => {
    const tiers = computeLiveTiers(seeds, { deep: 9, obvious1: 1 }, { minSample: undefined });
    expect(tiers.deep).toBe("mid_boss"); // still below the default n ≥ 200
  });
});
