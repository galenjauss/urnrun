import type { Tier } from "@urnrun/core";
import { describe, expect, it } from "vitest";
import { chainAt } from "./chain";
import type { Slot } from "./machine";

const s = (tier: Tier | null, status: Slot["status"] = "answered"): Slot => ({
  status,
  tier,
  souls: 0,
  answer: null,
});

describe("chainAt", () => {
  const slots = [s("mid_boss"), s("rejuvenator"), s("rejuvenator"), s("walker"), s("mid_boss")];

  it("counts back-to-back Mid Boss+ ending at a round", () => {
    expect(chainAt(slots, 0)).toBe(1);
    expect(chainAt(slots, 2)).toBe(3);
  });

  it("breaks on anything below Mid Boss", () => {
    expect(chainAt(slots, 3)).toBe(0);
    expect(chainAt(slots, 4)).toBe(1);
  });

  it("breaks on a missed round", () => {
    expect(chainAt([s("mid_boss"), s(null, "expired"), s("mid_boss")], 2)).toBe(1);
  });
});
