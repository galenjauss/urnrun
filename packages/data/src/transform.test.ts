import { describe, expect, it } from "vitest";
import { rawHeroes, rawHeroStats, rawItems, rawItemStats, rawSteamInfo } from "./fixtures";
import { buildSnapshot } from "./transform";

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

describe("buildSnapshot", () => {
  it("records version metadata", () => {
    expect(snap.clientVersion).toBe(6868);
    expect(snap.versionDate).toBe("Nov 24 2026");
    expect(snap.fetchedAt).toBe("2026-11-25T00:00:00.000Z");
  });

  it("normalizes heroes with released flag and ability slots", () => {
    const inf = snap.heroes.find((h) => h.slug === "infernus")!;
    expect(inf).toMatchObject({
      id: 1,
      name: "Infernus",
      type: "mystic",
      gunTag: "Rapid Fire",
      released: true,
      pickShare: 0.75,
    });
    expect(inf.abilities.map((a) => [a.slot, a.name])).toEqual([
      [1, "Catalyst"],
      [2, "Flame Dash"],
      [3, "Afterburn"],
      [4, "Concussive Combustion"],
    ]);
    expect(snap.heroes.find((h) => h.slug === "baba")!.released).toBe(false);
  });

  it("builds a flat ability list with hero, effects and sanitized text", () => {
    const ult = snap.abilities.find((a) => a.name === "Concussive Combustion")!;
    expect(ult).toMatchObject({
      heroSlug: "infernus",
      slot: 4,
      isUltimate: true,
      effects: ["stun"],
      description: "Concussive Combustion does things.",
    });
  });

  it("keeps only shopable items with slot, tier, cost and purchase share", () => {
    expect(snap.items.map((i) => i.name)).toEqual(["Extended Magazine", "Refresher"]);
    expect(snap.items[0]).toMatchObject({
      slug: "extended_magazine",
      slot: "weapon",
      tier: 1,
      cost: 800,
      active: false,
      purchaseShare: 0.9,
    });
    expect(snap.items[1]!.active).toBe(true);
  });

  it("rejects malformed payloads with a clear error", () => {
    expect(() =>
      buildSnapshot(
        { steamInfo: {}, heroes: [], items: [], heroStats: [], itemStats: [] },
        "2026-11-25T00:00:00.000Z",
      ),
    ).toThrow(/client_version/);
  });
});

describe("buildSnapshot fallbacks", () => {
  const sparse = buildSnapshot(
    {
      steamInfo: { client_version: 1 },
      heroes: [
        { id: 5, name: "Sparse", class_name: "hero_sparse" },
        { id: 6, name: "Hidden", class_name: "hero_hidden", player_selectable: false },
        { id: 7, name: "Off", class_name: "hero_off", disabled: true },
      ],
      items: [
        {
          type: "upgrade",
          id: 10,
          class_name: "u_active",
          name: "Active Text",
          item_slot_type: "spirit",
          item_tier: 2,
          cost: 1600,
          shopable: true,
          description: { active: "Use <b>it</b>" },
        },
        {
          type: "upgrade",
          id: 11,
          class_name: "u_badslot",
          name: "Bad",
          item_slot_type: "melee",
          item_tier: 1,
          cost: 1,
          shopable: true,
        },
        {
          type: "upgrade",
          id: 12,
          class_name: "u_notier",
          name: "NoTier",
          item_slot_type: "weapon",
          shopable: true,
        },
        {
          type: "upgrade",
          id: 13,
          class_name: "u_noname",
          item_slot_type: "weapon",
          item_tier: 1,
          cost: 1,
          shopable: true,
        },
      ],
      heroStats: [],
      itemStats: [],
    },
    "2026-11-25T00:00:00.000Z",
  );

  it("fills nulls/defaults for missing optional hero fields and skips hidden/disabled heroes", () => {
    expect(sparse.versionDate).toBeNull();
    expect(sparse.heroes).toHaveLength(1);
    expect(sparse.heroes[0]).toMatchObject({
      type: null,
      tags: [],
      complexity: null,
      gunTag: null,
      gender: null,
      released: true,
      pickShare: 0,
      abilities: [],
    });
  });

  it("uses active/passive text when desc is missing and drops items without slot, tier or name", () => {
    expect(sparse.items.map((i) => i.name)).toEqual(["Active Text"]);
    expect(sparse.items[0]).toMatchObject({
      description: "Use it",
      active: false,
      purchaseShare: 0,
      effects: [],
    });
  });
});
