import { describe, expect, it } from "vitest";
import { rawHeroes, rawHeroStats, rawItems, rawItemStats, rawSteamInfo } from "./fixtures";
import { buildSnapshot } from "./transform";
import { resolveAnswerSource } from "./sources";

const snap = buildSnapshot(
  {
    steamInfo: rawSteamInfo,
    heroes: rawHeroes,
    items: rawItems,
    heroStats: rawHeroStats,
    itemStats: rawItemStats,
  },
  "2026-11-25T00:00:00.000Z",
);

describe("resolveAnswerSource", () => {
  it("lists released heroes by default", () => {
    expect(resolveAnswerSource(snap, { entity: "heroes" }).map((a) => a.id)).toEqual(["infernus"]);
  });

  it("can include unreleased heroes explicitly", () => {
    const ids = resolveAnswerSource(snap, { entity: "heroes", includeUnreleased: true }).map(
      (a) => a.id,
    );
    expect(ids).toEqual(["baba", "infernus"]);
  });

  it("drops abilities of unreleased heroes unless asked", () => {
    const heroesOf = (includeUnreleased?: boolean) =>
      new Set(
        resolveAnswerSource(snap, { entity: "abilities", includeUnreleased }).map(
          (a) => a.meta?.hero,
        ),
      );
    expect(heroesOf().has("Baba")).toBe(false);
    expect(heroesOf(true).has("Baba")).toBe(true);
  });

  it("filters by equality, includes and in", () => {
    expect(resolveAnswerSource(snap, { entity: "heroes", where: { type: "mystic" } })).toHaveLength(
      1,
    );
    expect(
      resolveAnswerSource(snap, { entity: "heroes", where: { type: "brawler" } }),
    ).toHaveLength(0);
    expect(
      resolveAnswerSource(snap, {
        entity: "abilities",
        where: { effects: { includes: "stun" } },
      }).map((a) => a.display),
    ).toEqual(["Concussive Combustion"]);
    expect(
      resolveAnswerSource(snap, { entity: "items", where: { tier: { in: [3, 4] } } }).map(
        (a) => a.display,
      ),
    ).toEqual(["Refresher"]);
  });

  it("finds heroes by ability effect", () => {
    expect(
      resolveAnswerSource(snap, {
        entity: "heroes",
        where: { abilityEffects: { includes: "stun" } },
      }),
    ).toEqual([{ id: "infernus", display: "Infernus" }]);
  });

  it("matches case-insensitive substrings with contains", () => {
    expect(
      resolveAnswerSource(snap, { entity: "items", where: { name: { contains: "MAGAZINE" } } }),
    ).toEqual([{ id: "extended_magazine", display: "Extended Magazine" }]);
    expect(
      resolveAnswerSource(snap, { entity: "heroes", where: { tags: { contains: "x" } } }),
    ).toEqual([]);
  });

  it("supports numeric comparisons", () => {
    expect(
      resolveAnswerSource(snap, { entity: "items", where: { cost: { gte: 3200 } } }),
    ).toHaveLength(1);
    expect(
      resolveAnswerSource(snap, { entity: "items", where: { cost: { lte: 800 } } }),
    ).toHaveLength(1);
  });

  it("returns ability answers labelled with their hero", () => {
    const [first] = resolveAnswerSource(snap, { entity: "abilities", where: { slot: 1 } });
    expect(first).toEqual({ id: "catalyst", display: "Catalyst", meta: { hero: "Infernus" } });
  });

  it("throws on unknown fields to catch typos in prompt files", () => {
    expect(() => resolveAnswerSource(snap, { entity: "heroes", where: { colour: "red" } })).toThrow(
      /colour/,
    );
  });
});

describe("resolveAnswerSource edge cases", () => {
  it("returns empty results for an empty pool even with a where clause", () => {
    const empty = { ...snap, items: [] };
    expect(resolveAnswerSource(empty, { entity: "items", where: { tier: 1 } })).toEqual([]);
  });

  it("includes-conditions on non-array fields never match", () => {
    expect(
      resolveAnswerSource(snap, { entity: "heroes", where: { type: { includes: "mystic" } } }),
    ).toEqual([]);
  });

  it("numeric comparisons on non-numbers never match", () => {
    expect(resolveAnswerSource(snap, { entity: "heroes", where: { type: { gte: 1 } } })).toEqual(
      [],
    );
    expect(resolveAnswerSource(snap, { entity: "heroes", where: { type: { lte: 1 } } })).toEqual(
      [],
    );
  });
});
