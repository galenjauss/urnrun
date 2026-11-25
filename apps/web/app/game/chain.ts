import type { Tier } from "@urnrun/core";
import type { Slot } from "./machine";

const CHAIN: ReadonlySet<Tier> = new Set(["mid_boss", "rejuvenator"]);

/**
 * Length of the run of back-to-back Mid Boss+ answers ending at round `idx` (SPEC §3.5 "chain").
 * 0 when that round isn't Mid Boss+; a chain only *counts* from 2.
 */
export function chainAt(slots: readonly Slot[], idx: number): number {
  let n = 0;
  for (let i = idx; i >= 0; i--) {
    const s = slots[i];
    if (!s || s.status !== "answered" || !s.tier || !CHAIN.has(s.tier)) break;
    n++;
  }
  return n;
}
