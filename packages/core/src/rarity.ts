import type { Tier } from "./scoring";

/** Live rarity recalibration with guards (SPEC §3.7). */

/** Tiers that move with data, from most common to rarest. */
const LADDER = ["trooper", "guardian", "walker", "mid_boss"] as const;
type LadderTier = (typeof LADDER)[number];

export interface AnswerSeed {
  answerId: string;
  seedTier: Tier;
  /** Top obvious answers that must never rise above Trooper. */
  locked?: boolean;
}

export interface RarityOptions {
  minSample?: number;
  maxPromote?: number;
  maxDemote?: number;
  wiseGuyMinShare?: number;
}

const DEFAULTS: Required<RarityOptions> = {
  minSample: 200,
  maxPromote: 1,
  maxDemote: 2,
  wiseGuyMinShare: 0.01,
};

export function tierFromCum(cum: number): LadderTier {
  if (cum < 0.12) return "trooper";
  if (cum < 0.3) return "guardian";
  if (cum < 0.55) return "walker";
  return "mid_boss";
}

/** cum(a) = share of responses that named a strictly more common answer. */
export function cumulativeShares(tally: Readonly<Record<string, number>>): Record<string, number> {
  const entries = Object.entries(tally);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const result: Record<string, number> = {};
  if (total === 0) return result;
  for (const [id, count] of entries) {
    const moreCommon = entries.reduce((sum, [, n]) => (n > count ? sum + n : sum), 0);
    result[id] = moreCommon / total;
  }
  return result;
}

function ladderIndex(tier: Tier): number {
  // Wise Guy behaves like Guardian once its overlay drops.
  const t = tier === "wise_guy" ? "guardian" : tier;
  return LADDER.indexOf(t as LadderTier);
}

function clampToSeed(seed: Tier, live: LadderTier, opts: Required<RarityOptions>): LadderTier {
  const base = ladderIndex(seed);
  const target = LADDER.indexOf(live);
  const clamped = Math.min(base + opts.maxPromote, Math.max(base - opts.maxDemote, target));
  return LADDER[Math.max(0, Math.min(LADDER.length - 1, clamped))]!;
}

function liveTierFor(
  seed: AnswerSeed,
  tally: Readonly<Record<string, number>>,
  cum: Readonly<Record<string, number>>,
  total: number,
  opts: Required<RarityOptions>,
): Tier {
  if (seed.seedTier === "rejuvenator") return "rejuvenator";
  if (seed.locked) return "trooper";
  const count = tally[seed.answerId] ?? 0;
  if (seed.seedTier === "wise_guy" && count / total >= opts.wiseGuyMinShare) return "wise_guy";
  // Never named (with a large enough sample) = rarer than everything that was named.
  const answerCum = count === 0 ? 1 : (cum[seed.answerId] ?? 0);
  return clampToSeed(seed.seedTier, tierFromCum(answerCum), opts);
}

/**
 * Compute the current tier for every seeded answer. Below the minimum sample size the
 * build-time seeds stand; above it, live shares move tiers within the guard rails.
 */
export function computeLiveTiers(
  seeds: readonly AnswerSeed[],
  tally: Readonly<Record<string, number>>,
  options: RarityOptions = {},
): Record<string, Tier> {
  const overrides = Object.fromEntries(
    Object.entries(options).filter(([, v]) => v !== undefined),
  ) as RarityOptions;
  const opts: Required<RarityOptions> = { ...DEFAULTS, ...overrides };
  const total = Object.values(tally).reduce((sum, n) => sum + n, 0);
  if (total < opts.minSample) {
    return Object.fromEntries(seeds.map((s) => [s.answerId, s.seedTier]));
  }
  const cum = cumulativeShares(tally);
  return Object.fromEntries(
    seeds.map((s) => [s.answerId, liveTierFor(s, tally, cum, total, opts)]),
  );
}
