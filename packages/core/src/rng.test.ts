import { describe, expect, it } from "vitest";
import { createRng, seedFromString, shuffle, pickInt } from "./rng";

describe("seeded RNG", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(seedFromString("urnrun:day:1"));
    const b = createRng(seedFromString("urnrun:day:1"));
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("differs for different seeds", () => {
    const a = createRng(seedFromString("x"));
    const b = createRng(seedFromString("y"));
    expect(a()).not.toEqual(b());
  });

  it("produces values in [0, 1)", () => {
    const r = createRng(seedFromString("range"));
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pickInt stays within [0, n)", () => {
    const r = createRng(seedFromString("int"));
    for (let i = 0; i < 500; i++) {
      const v = pickInt(r, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it("shuffle returns a new permutation without mutating input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const frozen = Object.freeze([...input]);
    const out = shuffle(createRng(seedFromString("s")), frozen);
    expect(out).not.toBe(frozen);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(shuffle(createRng(seedFromString("s")), frozen)).toEqual(out);
  });
});
