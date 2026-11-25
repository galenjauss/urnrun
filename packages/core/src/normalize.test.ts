import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { MAX_GUESS_LENGTH, normalize } from "./normalize";

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

describe("normalize hardening", () => {
  it("transliterates letters NFKD can't decompose", () => {
    expect(normalize("Ørsted")).toBe("orsted");
    expect(normalize("Straße")).toBe("strasse");
    expect(normalize("Æther Œuvre")).toBe("aether oeuvre");
    expect(normalize("Łódź")).toBe("lodz");
  });

  it("caps very long input so a hostile guess can't burn CPU", () => {
    const hostile = "a ".repeat(500_000) + "seven";
    const started = performance.now();
    const out = normalize(hostile);
    expect(performance.now() - started).toBeLessThan(50);
    expect(out.length).toBeLessThanOrEqual(MAX_GUESS_LENGTH);
  });

  it("strips stacked leading articles in one pass", () => {
    expect(normalize("the a an seven")).toBe("seven");
  });
});
