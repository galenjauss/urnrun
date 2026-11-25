import { describe, expect, it } from "vitest";
import { rawHeroes, rawHeroStats, rawItems, rawItemStats, rawSteamInfo } from "./fixtures";
import { buildSnapshot, type Snapshot } from "./transform";
import { compilePrompt, parsePromptFile, PromptFileSchema, seedTierForRank } from "./prompts";

const base = buildSnapshot(
  {
    steamInfo: rawSteamInfo,
    heroes: rawHeroes,
    items: rawItems,
    heroStats: rawHeroStats,
    itemStats: rawItemStats,
  },
  "2026-11-25T00:00:00.000Z",
);
// Widen the fixture: 8 released heroes with descending pick shares.
const snap: Snapshot = {
  ...base,
  heroes: ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"].map(
    (name, i) => ({
      ...base.heroes.find((h) => h.released)!,
      id: 100 + i,
      slug: name.toLowerCase(),
      name,
      type: i % 2 === 0 ? "mystic" : "brawler",
      pickShare: (8 - i) / 36,
    }),
  ),
};

const yamlText = `
id: hero-any-001
status: approved
category: heroes
text: Name any hero
answer_source:
  entity: heroes
extra_answers:
  - { id: urn, display: The Urn }
exclude: [hotel]
aliases:
  alpha: [al, "a-man"]
seed_overrides:
  echo: wise_guy
rejuvenator: golf
why_not:
  trooper: "Troopers aren't heroes."
difficulty: 2
min_answers: 6
`;

describe("parsePromptFile", () => {
  it("parses and validates YAML", () => {
    const file = parsePromptFile(yamlText, "hero-any-001.yaml");
    expect(file.id).toBe("hero-any-001");
    expect(file.answer_source?.entity).toBe("heroes");
  });

  it("reports the file name and field on schema errors", () => {
    expect(() => parsePromptFile("id: x\ncategory: nope\ntext: hi", "bad.yaml")).toThrow(
      /bad\.yaml.*category/,
    );
  });

  it("accepts prompts without a data source (fully curated)", () => {
    const f = PromptFileSchema.parse({
      id: "lore-1",
      status: "draft",
      category: "lore",
      text: "Name a faction",
      extra_answers: [{ id: "a", display: "A" }],
    });
    expect(f.answer_source).toBeUndefined();
  });
});

describe("compilePrompt", () => {
  const compiled = compilePrompt(parsePromptFile(yamlText, "x.yaml"), snap);

  it("resolves the answer set with extras and excludes", () => {
    const ids = compiled.answers.map((a) => a.id);
    expect(ids).toContain("urn");
    expect(ids).not.toContain("hotel");
    expect(ids).toHaveLength(8);
  });

  it("attaches aliases", () => {
    expect(compiled.answers.find((a) => a.id === "alpha")!.aliases).toEqual(["al", "a-man"]);
  });

  it("locks the top-3 most common answers as Troopers", () => {
    const locked = compiled.answers.filter((a) => a.locked).map((a) => a.id);
    expect(locked).toEqual(["alpha", "bravo", "charlie"]);
    for (const id of locked)
      expect(compiled.answers.find((a) => a.id === id)!.seedTier).toBe("trooper");
  });

  it("applies seed overrides and the rejuvenator", () => {
    expect(compiled.answers.find((a) => a.id === "echo")!.seedTier).toBe("wise_guy");
    expect(compiled.answers.find((a) => a.id === "golf")!.seedTier).toBe("rejuvenator");
    expect(compiled.answers.find((a) => a.id === "golf")!.isRejuvenator).toBe(true);
  });

  it("gives rarer answers higher seed tiers", () => {
    const tier = (id: string) => compiled.answers.find((a) => a.id === id)!.seedTier;
    const order = ["trooper", "guardian", "walker", "mid_boss"];
    expect(order.indexOf(tier("foxtrot"))).toBeGreaterThanOrEqual(order.indexOf(tier("delta")));
    expect(tier("urn")).toBe("guardian"); // curated extra with no data → guardian default
  });

  it("carries why-nots and metadata", () => {
    expect(compiled.whyNot).toEqual({ trooper: "Troopers aren't heroes." });
    expect(compiled).toMatchObject({ id: "hero-any-001", category: "heroes", difficulty: 2 });
  });

  it("rejects prompts below min_answers", () => {
    const file = parsePromptFile(yamlText.replace("min_answers: 6", "min_answers: 20"), "x.yaml");
    expect(() => compilePrompt(file, snap)).toThrow(/hero-any-001.*8 answers.*20/);
  });

  it("rejects references to unknown answers", () => {
    for (const bad of [
      yamlText.replace("rejuvenator: golf", "rejuvenator: zulu"),
      yamlText.replace("echo: wise_guy", "zulu: wise_guy"),
      yamlText.replace("alpha: [al", "zulu: [al"),
    ]) {
      expect(() => compilePrompt(parsePromptFile(bad, "x.yaml"), snap)).toThrow(/zulu/);
    }
  });

  it("rejects alias collisions and why-nots that are valid answers", () => {
    const collide = yamlText.replace('alpha: [al, "a-man"]', "alpha: [bravo]");
    expect(() => compilePrompt(parsePromptFile(collide, "x.yaml"), snap)).toThrow(/collision/i);
    const whyValid = yamlText.replace('trooper: "Troopers aren\'t heroes."', 'alpha: "nope"');
    expect(() => compilePrompt(parsePromptFile(whyValid, "x.yaml"), snap)).toThrow(/why-not/i);
  });

  it("merges global aliases for answers present in the prompt", () => {
    const withGlobal = compilePrompt(parsePromptFile(yamlText, "x.yaml"), snap, {
      bravo: ["bro"],
      nobody: ["ghost"],
    });
    expect(withGlobal.answers.find((a) => a.id === "bravo")!.aliases).toEqual(["bro"]);
  });

  it("seeds tiers by popularity rank quantile", () => {
    const tiers = Array.from({ length: 10 }, (_, r) => seedTierForRank(r, 10));
    expect(tiers).toEqual([
      "trooper",
      "trooper",
      "trooper",
      "guardian",
      "guardian",
      "guardian",
      "walker",
      "walker",
      "mid_boss",
      "mid_boss",
    ]);
    expect(seedTierForRank(0, 1)).toBe("trooper");
  });
});
