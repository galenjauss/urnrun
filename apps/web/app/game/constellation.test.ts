import { describe, expect, it } from "vitest";
import { VIEW, layoutConstellation, type StarInput } from "./constellation";

const round = (idx: number, tier: StarInput["tier"], souls = 0): StarInput => ({
  idx,
  tier,
  souls,
});

describe("layoutConstellation", () => {
  const rounds = [
    round(0, "trooper", 100),
    round(1, "rejuvenator", 1000),
    round(2, "mid_boss", 850),
    round(3, null),
    round(4, "guardian", 300),
    round(5, "wise_guy", 150),
    round(6, "walker", 600),
  ];
  const { stars, links } = layoutConstellation(rounds);

  it("places stars left to right inside the card", () => {
    expect(stars).toHaveLength(7);
    for (let i = 1; i < stars.length; i++) expect(stars[i]!.x).toBeGreaterThan(stars[i - 1]!.x);
    for (const s of stars) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(VIEW.w);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(VIEW.h);
    }
  });

  it("sinks rarer answers deeper and draws them bigger", () => {
    expect(stars[1]!.y).toBeGreaterThan(stars[0]!.y);
    expect(stars[1]!.r).toBeGreaterThan(stars[0]!.r);
  });

  it("leaves misses unlit and unlinked", () => {
    expect(stars[3]!.lit).toBe(false);
    expect(links.some((l) => l.from === 3 || l.to === 3)).toBe(false);
  });

  it("chains back-to-back Mid Boss+ answers", () => {
    expect(links.find((l) => l.from === 1 && l.to === 2)?.chain).toBe(true);
    expect(links.find((l) => l.from === 0 && l.to === 1)?.chain).toBe(false);
  });

  it("is deterministic", () => {
    expect(layoutConstellation(rounds)).toEqual({ stars, links });
  });
});
