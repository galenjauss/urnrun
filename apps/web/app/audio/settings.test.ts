import { describe, expect, it } from "vitest";
import { DEFAULT_AUDIO, jitter, parseAudioSettings } from "./settings";

describe("parseAudioSettings", () => {
  it("defaults to music 40% / SFX 80%, unmuted", () => {
    expect(parseAudioSettings(null)).toEqual({ muted: false, sfx: 0.8, music: 0.4 });
  });

  it("round-trips saved values", () => {
    const s = { muted: true, sfx: 0.5, music: 0 };
    expect(parseAudioSettings(JSON.stringify(s))).toEqual(s);
  });

  it("clamps and repairs bad values field by field", () => {
    expect(parseAudioSettings(JSON.stringify({ muted: "yes", sfx: 3, music: -1 }))).toEqual({
      muted: false,
      sfx: 1,
      music: 0,
    });
  });

  it("survives garbage", () => {
    expect(parseAudioSettings("{nope")).toEqual(DEFAULT_AUDIO);
    expect(parseAudioSettings("null")).toEqual(DEFAULT_AUDIO);
  });
});

describe("jitter", () => {
  it("stays within ±spread", () => {
    expect(jitter(0.06, () => 0)).toBeCloseTo(0.94);
    expect(jitter(0.06, () => 1)).toBeCloseTo(1.06);
    expect(jitter(0.06, () => 0.5)).toBe(1);
  });
});
