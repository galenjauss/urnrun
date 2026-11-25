import { describe, expect, it } from "vitest";
import { MAX_SOULS, TIERS, soulsFor, verdictFor, zoneFor, ZONES, nextZone } from "./scoring";

describe("tiers", () => {
  it("maps tiers to souls per SPEC §3.3", () => {
    expect(soulsFor("trooper")).toBe(100);
    expect(soulsFor("wise_guy")).toBe(150);
    expect(soulsFor("guardian")).toBe(300);
    expect(soulsFor("walker")).toBe(600);
    expect(soulsFor("mid_boss")).toBe(850);
    expect(soulsFor("rejuvenator")).toBe(1000);
    expect(soulsFor(null)).toBe(0);
  });

  it("each tier has a share glyph and label", () => {
    for (const t of Object.values(TIERS)) {
      expect(t.glyph.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
    }
  });

  it("max is 7 × 1000", () => {
    expect(MAX_SOULS).toBe(7000);
  });
});

describe("verdictFor", () => {
  it.each([
    [0, "Street Rat"],
    [1500, "Street Rat"],
    [1501, "Subway Runner"],
    [2500, "Subway Runner"],
    [2501, "Tunnel Rat"],
    [3500, "Tunnel Rat"],
    [3501, "Vault Breaker"],
    [4499, "Vault Breaker"],
    [4500, "Patron's Courier"],
    [7000, "Patron's Courier"],
  ])("%d → %s", (total, name) => {
    expect(verdictFor(total).name).toBe(name);
  });
});

describe("zones", () => {
  it("are ordered by depth starting at 0", () => {
    expect(ZONES[0]?.depth).toBe(0);
    for (let i = 1; i < ZONES.length; i++) {
      expect(ZONES[i]!.depth).toBeGreaterThan(ZONES[i - 1]!.depth);
    }
  });

  it.each([
    [0, "The Curb"],
    [299, "The Curb"],
    [300, "The Platform"],
    [1250, "The Cellar"],
    [4499, "The Vault"],
    [4500, "The Veil"],
    [6999, "The Sanctum"],
    [7000, "The Patron's Hearth"],
  ])("depth %d → %s", (depth, name) => {
    expect(zoneFor(depth).name).toBe(name);
  });

  it("nextZone gives the next landmark or null at the bottom", () => {
    expect(nextZone(0)?.name).toBe("The Platform");
    expect(nextZone(7000)).toBeNull();
  });
});
