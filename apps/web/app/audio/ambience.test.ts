import { ZONES } from "@urnrun/core";
import { describe, expect, it } from "vitest";
import { BEDS, bedFor } from "./ambience";

describe("ambience beds", () => {
  it("has one bed per zone", () => {
    expect(BEDS).toHaveLength(ZONES.length);
  });

  it("keeps every layer quiet enough to sit under the SFX", () => {
    for (const bed of BEDS) {
      const noise = bed.noise.reduce((s, [, , g]) => s + g, 0);
      expect(noise).toBeLessThanOrEqual(0.2);
      expect(bed.droneGain * bed.drones.length * 2).toBeLessThanOrEqual(0.25);
      expect(bed.lfoDepth).toBeLessThanOrEqual(1);
    }
  });

  it("clamps out-of-range zone indexes", () => {
    expect(bedFor(-3)).toBe(BEDS[0]);
    expect(bedFor(99)).toBe(BEDS[BEDS.length - 1]);
  });
});
