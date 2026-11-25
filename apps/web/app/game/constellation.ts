import type { Tier } from "@urnrun/core";

/**
 * The constellation card (SPEC §3.5): a player's 7 answers as stars, placed left→right by round
 * and sunk by rarity. Pure layout so the same geometry can drive the ledger SVG and, later, the
 * OG share image.
 */

export interface StarInput {
  idx: number;
  tier: Tier | null;
  souls: number;
}

export interface Star {
  idx: number;
  x: number;
  y: number;
  r: number;
  tier: Tier | null;
  /** A miss is drawn as a faint ember, not a star. */
  lit: boolean;
}

export interface Link {
  from: number;
  to: number;
  /** Back-to-back Mid Boss or better: a bright chain link. */
  chain: boolean;
}

export const VIEW = { w: 320, h: 180 } as const;

const DEPTH: Readonly<Record<Tier, number>> = {
  trooper: 0.2,
  wise_guy: 0.32,
  guardian: 0.46,
  walker: 0.62,
  mid_boss: 0.76,
  rejuvenator: 0.9,
};
const CHAIN_TIERS: ReadonlySet<Tier> = new Set(["mid_boss", "rejuvenator"]);

/** Deterministic wobble in [-1, 1] per round index so lines never look ruled. */
const wobble = (i: number) => Math.sin(i * 12.9898 + 4.1) * 0.5 + Math.sin(i * 3.7) * 0.5;

export function layoutConstellation(rounds: readonly StarInput[]): {
  stars: Star[];
  links: Link[];
} {
  const n = Math.max(1, rounds.length - 1);
  const padX = 26;
  const stars = rounds.map((r, i): Star => {
    const depth = r.tier ? DEPTH[r.tier] : 0.08;
    return {
      idx: r.idx,
      x: padX + (i / n) * (VIEW.w - padX * 2) + wobble(i) * 6,
      y: 14 + depth * (VIEW.h - 28) + wobble(i + 11) * 5,
      r: r.tier ? 2 + Math.min(1000, r.souls) / 220 : 1.2,
      tier: r.tier,
      lit: r.tier !== null,
    };
  });
  const links: Link[] = [];
  for (let i = 1; i < stars.length; i++) {
    const a = stars[i - 1]!;
    const b = stars[i]!;
    if (!a.lit || !b.lit) continue;
    links.push({
      from: i - 1,
      to: i,
      chain: CHAIN_TIERS.has(a.tier!) && CHAIN_TIERS.has(b.tier!),
    });
  }
  return { stars, links };
}
