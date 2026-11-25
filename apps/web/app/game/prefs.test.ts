import { describe, expect, it } from "vitest";
import { parsePrefs } from "./prefs";

describe("parsePrefs", () => {
  it("defaults to full quality", () => {
    expect(parsePrefs(null)).toEqual({ lowPower: false, streamer: false });
  });
  it("reads streamer mode", () => {
    expect(parsePrefs('{"streamer":true}')).toEqual({ lowPower: false, streamer: true });
  });
  it("reads a saved choice and repairs garbage", () => {
    expect(parsePrefs('{"lowPower":true}')).toEqual({ lowPower: true, streamer: false });
    expect(parsePrefs('{"lowPower":"yes"}')).toEqual({ lowPower: false, streamer: false });
    expect(parsePrefs("{oops")).toEqual({ lowPower: false, streamer: false });
  });
});
