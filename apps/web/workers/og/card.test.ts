import { describe, expect, it } from "vitest";
import { cardSvg, cardTotal } from "./card";

const tiers = [
  "trooper",
  "rejuvenator",
  "rejuvenator",
  null,
  "guardian",
  "wise_guy",
  "walker",
] as const;

describe("share card svg", () => {
  it("totals souls from the tiers", () => {
    expect(cardTotal(tiers)).toBe(100 + 1000 + 1000 + 0 + 300 + 150 + 600);
  });

  it("renders depth, zone, verdict and the dive label", () => {
    const svg = cardSvg({ day: 12, tiers });
    expect(svg).toContain("3,150 ft");
    expect(svg).toContain("The Catacombs");
    expect(svg).toContain("TUNNEL RAT");
  });

  it("labels beta days and launch days", () => {
    expect(cardSvg({ day: -3, tiers })).toContain("BETA DIVE");
    expect(cardSvg({ day: 12, tiers })).toContain("DIVE #12");
  });

  it("draws seven gems and one star per round", () => {
    const svg = cardSvg({ day: 1, tiers });
    expect(svg.match(/<path d="M\d+ \d+L/g)?.length).toBeGreaterThanOrEqual(7);
    expect(svg.match(/<circle /g)?.length).toBe(6 * 2 + 1); // 6 lit (glow + core) + 1 miss
  });

  it("is well-formed: balanced svg root and no raw apostrophes in text", () => {
    const svg = cardSvg({ day: 1, tiers: Array(7).fill("rejuvenator") });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
    expect(svg).toContain("The Patron’s Hearth");
    expect(svg).not.toMatch(/>[^<]*'[^<]*</);
  });
});
