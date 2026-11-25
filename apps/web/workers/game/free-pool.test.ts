import { describe, expect, it } from "vitest";
import { freePool, pickFreePrompts, type BankPrompt } from "./free-pool";

const bank: BankPrompt[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `h${i}`, category: "heroes" })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `i${i}`, category: "items" })),
  { id: "l0", category: "lore" },
  { id: "c0", category: "community" },
];

let seed = 1;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe("freePool", () => {
  it("hides upcoming dailies unless already revealed", () => {
    const pool = freePool(bank, new Set(["h0", "h1", "i0"]), new Set(["h1"]));
    const ids = pool.map((p) => p.id);
    expect(ids).not.toContain("h0");
    expect(ids).not.toContain("i0");
    expect(ids).toContain("h1");
  });
});

describe("pickFreePrompts", () => {
  it("picks seven distinct prompts with the daily mix when possible", () => {
    const ids = pickFreePrompts(bank, rand)!;
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    const cats = ids.map((id) => bank.find((b) => b.id === id)!.category);
    expect(cats.filter((c) => c === "heroes")).toHaveLength(3);
    expect(cats.filter((c) => c === "items")).toHaveLength(2);
    expect(cats).toContain("lore");
    expect(cats).toContain("community");
  });

  it("fills from any category when the mix can't be met", () => {
    const heroesOnly = bank.filter((b) => b.category !== "lore").slice(0, 8);
    expect(pickFreePrompts(heroesOnly, rand)).toHaveLength(7);
  });

  it("refuses when the safe pool is too small", () => {
    expect(pickFreePrompts(bank.slice(0, 6), rand)).toBeNull();
  });
});
