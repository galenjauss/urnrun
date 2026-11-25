import { decodeShareCode, encodeShareCode, shareCardPath } from "./share";
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
    expect(buildShareText({ ...base, tiers: [...base.tiers], percentile: 99.4 })).toMatch(
      /than 99%/,
    );
    expect(buildShareText({ ...base, tiers: [...base.tiers], percentile: 140 })).toMatch(
      /Deepest dive today/,
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

describe("share label override", () => {
  it("can label a Free Dive", () => {
    const text = buildShareText({
      day: 0,
      tiers: ["rejuvenator", null, null, null, null, null, null],
      percentile: null,
      url: "https://x.test",
      label: "Free Dive",
    });
    expect(text.startsWith("Urn Run Free Dive · 1,000 ft")).toBe(true);
  });
});

describe("share code", () => {
  const tiers = [
    "trooper",
    "wise_guy",
    null,
    "guardian",
    "walker",
    "mid_boss",
    "rejuvenator",
  ] as const;

  it("round-trips every tier and misses", () => {
    const code = encodeShareCode(tiers);
    expect(code).toBe("twxgkmr");
    expect(decodeShareCode(code)).toEqual([...tiers]);
  });

  it("rejects wrong lengths and unknown characters", () => {
    expect(decodeShareCode("twx")).toBeNull();
    expect(decodeShareCode("twxgkmz")).toBeNull();
    expect(decodeShareCode("TWXGKMR")).toBeNull();
  });

  it("builds the card path", () => {
    expect(shareCardPath(12, tiers)).toBe("/s/12/twxgkmr");
    expect(shareCardPath(-3, tiers)).toBe("/s/-3/twxgkmr");
  });
});
