import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it.each([
    ["  Grey   Talon ", "grey talon"],
    ["GREY TALON", "grey talon"],
    ["Mo & Krill", "mo and krill"],
    ["Mo and Krill", "mo and krill"],
    ["Pokémon", "pokemon"],
    ["Lady Geist!", "lady geist"],
    ["The Doorman", "doorman"],
    ["a Seven", "seven"],
    ["An Urn", "urn"],
    ["Wraith's Card Trick", "wraiths card trick"],
    ["Mirage—Djinn's Mark", "mirage djinns mark"],
    ["Yamato.", "yamato"],
    ["The A Team", "team"],
  ])("%s → %s", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it("does not strip an article that is the whole input", () => {
    expect(normalize("The")).toBe("the");
  });

  it("returns empty string for whitespace or punctuation only", () => {
    expect(normalize("   ")).toBe("");
    expect(normalize("?!...")).toBe("");
  });
});
