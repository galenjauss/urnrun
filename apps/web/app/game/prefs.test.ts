import { describe, expect, it } from "vitest";
import { parsePrefs } from "./prefs";

describe("parsePrefs", () => {
  it("defaults to full quality", () => {
    expect(parsePrefs(null)).toEqual({ lowPower: false });
  });
  it("reads a saved choice and repairs garbage", () => {
    expect(parsePrefs('{"lowPower":true}')).toEqual({ lowPower: true });
    expect(parsePrefs('{"lowPower":"yes"}')).toEqual({ lowPower: false });
    expect(parsePrefs("{oops")).toEqual({ lowPower: false });
  });
});
