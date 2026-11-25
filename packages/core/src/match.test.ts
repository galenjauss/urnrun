import { describe, expect, it } from "vitest";
import { buildAnswerIndex, damerauLevenshtein, fuzzyLimit, matchGuess } from "./match";

const index = buildAnswerIndex({
  answers: [
    { id: "mo_krill", display: "Mo & Krill", aliases: ["m&k", "mo", "krill"] },
    { id: "grey_talon", display: "Grey Talon", aliases: ["gt"] },
    { id: "viscous", display: "Viscous" },
    { id: "seven", display: "Seven" },
    { id: "haze", display: "Haze" },
  ],
  whyNot: { lash: "Lash's Ground Strike knocks up — no stun." },
});

describe("damerauLevenshtein", () => {
  it.each([
    ["", "", 0],
    ["abc", "abc", 0],
    ["abc", "", 3],
    ["kitten", "sitting", 3],
    ["haze", "hzae", 1], // transposition
    ["viscous", "vicsous", 1],
    ["seven", "sevn", 1],
  ])("%s ↔ %s = %d", (a, b, d) => {
    expect(damerauLevenshtein(a, b)).toBe(d);
  });
});

describe("fuzzyLimit", () => {
  it("allows 1 edit up to 6 chars, 2 for longer", () => {
    expect(fuzzyLimit(3)).toBe(0);
    expect(fuzzyLimit(4)).toBe(1);
    expect(fuzzyLimit(6)).toBe(1);
    expect(fuzzyLimit(7)).toBe(2);
  });
});

describe("matchGuess", () => {
  it("accepts exact display names regardless of case/punctuation", () => {
    expect(matchGuess(index, "grey talon!")).toEqual({ kind: "exact", answerId: "grey_talon" });
    expect(matchGuess(index, "Mo and Krill")).toEqual({ kind: "exact", answerId: "mo_krill" });
  });

  it("accepts aliases", () => {
    expect(matchGuess(index, "GT")).toEqual({ kind: "exact", answerId: "grey_talon" });
    expect(matchGuess(index, "M&K")).toEqual({ kind: "exact", answerId: "mo_krill" });
  });

  it("suggests (never auto-accepts) near misses", () => {
    expect(matchGuess(index, "Vicsous")).toEqual({ kind: "suggest", answerIds: ["viscous"] });
    expect(matchGuess(index, "grey talin")).toEqual({ kind: "suggest", answerIds: ["grey_talon"] });
  });

  it("ranks suggestions by distance and caps them at 3", () => {
    const big = buildAnswerIndex({
      answers: ["aaaa1", "aaaa2", "aaaa3", "aaaa4", "aaab"].map((id) => ({ id, display: id })),
    });
    const res = matchGuess(big, "aaaa");
    expect(res.kind).toBe("suggest");
    if (res.kind === "suggest") expect(res.answerIds).toHaveLength(3);
  });

  it("returns why-not explanations for curated wrong answers", () => {
    expect(matchGuess(index, "Lash")).toEqual({
      kind: "whyNot",
      reason: "Lash's Ground Strike knocks up — no stun.",
    });
  });

  it("returns none for unknown or empty guesses", () => {
    expect(matchGuess(index, "Abrams")).toEqual({ kind: "none" });
    expect(matchGuess(index, "   ")).toEqual({ kind: "none" });
  });

  it("does not fuzzy-match very short inputs", () => {
    expect(matchGuess(index, "mx")).toEqual({ kind: "none" });
  });

  it("throws on alias collisions between different answers", () => {
    expect(() =>
      buildAnswerIndex({
        answers: [
          { id: "a", display: "Alpha", aliases: ["x"] },
          { id: "b", display: "Beta", aliases: ["x"] },
        ],
      }),
    ).toThrow(/collision/i);
  });
});

describe("match hardening", () => {
  it("throws when a why-not key collides with a real answer", () => {
    expect(() =>
      buildAnswerIndex({ answers: [{ id: "seven", display: "Seven" }], whyNot: { seven: "nope" } }),
    ).toThrow(/why-not/i);
  });

  it("orders equal-distance suggestions by id deterministically", () => {
    const idx = buildAnswerIndex({
      answers: [
        { id: "b", display: "abcd" },
        { id: "a", display: "abce" },
      ],
    });
    expect(matchGuess(idx, "abcf")).toEqual({ kind: "suggest", answerIds: ["a", "b"] });
  });
});
