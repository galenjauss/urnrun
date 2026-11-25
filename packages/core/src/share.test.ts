import { describe, expect, it } from "vitest";
import { buildShareText } from "./share";

const base = {
  day: 42,
  tiers: ["guardian", "trooper", "rejuvenator", "walker", "wise_guy", "mid_boss", null] as const,
  percentile: 87,
  url: "https://play.urnrun.workers.dev",
};

describe("buildShareText", () => {
  it("matches the SPEC §3.12 format", () => {
    expect(buildShareText({ ...base, tiers: [...base.tiers] })).toBe(
      [
        "Urn Run #42 · 3,000 ft · The Catacombs",
        "🛡️🪖💠🗼🎩👹⬛",
        "Deeper than 87% of couriers today",
        "https://play.urnrun.workers.dev",
      ].join("\n"),
    );
  });

  it("omits the percentile line when unknown", () => {
    const text = buildShareText({ ...base, tiers: [...base.tiers], percentile: null });
    expect(text).not.toMatch(/Deeper than/);
  });

  it("supports a colorblind bar-height variant", () => {
    const text = buildShareText({ ...base, tiers: [...base.tiers], variant: "bars" });
    expect(text.split("\n")[1]).toBe("▃▁█▅▂▆_");
  });
});

describe("share hardening", () => {
  it("rounds and clamps the percentile", () => {
    expect(buildShareText({ ...base, tiers: [...base.tiers], percentile: 87.333 })).toMatch(
      /than 87%/,
    );
    expect(buildShareText({ ...base, tiers: [...base.tiers], percentile: 140 })).toMatch(
      /than 99%/,
    );
    expect(buildShareText({ ...base, tiers: [...base.tiers], percentile: -3 })).toMatch(/than 0%/);
  });
});

describe("share label", () => {
  it("says Beta before launch", () => {
    expect(buildShareText({ ...base, tiers: [...base.tiers], day: -3 }).split("\n")[0]).toMatch(
      /^Urn Run Beta · /,
    );
  });
});
