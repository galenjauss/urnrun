/** Tiers, souls, verdict bands and depth zones (SPEC §3.3–3.4). 1 soul = 1 ft. */

export type Tier = "trooper" | "wise_guy" | "guardian" | "walker" | "mid_boss" | "rejuvenator";

export interface TierInfo {
  souls: number;
  label: string;
  glyph: string;
  /** Colorblind bar-height glyph for the alternate share row. */
  bar: string;
}

export const TIERS: Readonly<Record<Tier, TierInfo>> = {
  trooper: { souls: 100, label: "Trooper", glyph: "🪖", bar: "▁" },
  wise_guy: { souls: 150, label: "Wise Guy", glyph: "🎩", bar: "▂" },
  guardian: { souls: 300, label: "Guardian", glyph: "🛡️", bar: "▃" },
  walker: { souls: 600, label: "Walker", glyph: "🗼", bar: "▅" },
  mid_boss: { souls: 850, label: "Mid Boss", glyph: "👹", bar: "▆" },
  rejuvenator: { souls: 1000, label: "Rejuvenator", glyph: "💠", bar: "█" },
};

export const MISS = { souls: 0, glyph: "⬛", bar: "_" } as const;
export const ROUNDS_PER_DIVE = 7;
export const MAX_SOULS = ROUNDS_PER_DIVE * TIERS.rejuvenator.souls;

export function soulsFor(tier: Tier | null): number {
  return tier ? TIERS[tier].souls : MISS.souls;
}

export interface Verdict {
  name: string;
  min: number;
}

/** Verdict bands, highest first. */
export const VERDICTS: readonly Verdict[] = [
  { name: "Patron's Courier", min: 4500 },
  { name: "Vault Breaker", min: 3501 },
  { name: "Tunnel Rat", min: 2501 },
  { name: "Subway Runner", min: 1501 },
  { name: "Street Rat", min: 0 },
];

export function verdictFor(total: number): Verdict {
  return VERDICTS.find((v) => total >= v.min) ?? VERDICTS[VERDICTS.length - 1]!;
}

export interface Zone {
  id: string;
  name: string;
  depth: number;
  ceremony?: 1 | 2 | 3;
}

export const ZONES: readonly Zone[] = [
  { id: "curb", name: "The Curb", depth: 0 },
  { id: "platform", name: "The Platform", depth: 300 },
  { id: "tunnels", name: "The Tunnels", depth: 750 },
  { id: "cellar", name: "The Cellar", depth: 1250 },
  { id: "sewers", name: "The Sewers", depth: 1900 },
  { id: "catacombs", name: "The Catacombs", depth: 2600 },
  { id: "vault", name: "The Vault", depth: 3500 },
  { id: "veil", name: "The Veil", depth: 4500, ceremony: 1 },
  { id: "sanctum", name: "The Sanctum", depth: 5750, ceremony: 2 },
  { id: "hearth", name: "The Patron's Hearth", depth: 7000, ceremony: 3 },
];

export function zoneFor(depth: number): Zone {
  let current = ZONES[0]!;
  for (const zone of ZONES) {
    if (depth >= zone.depth) current = zone;
  }
  return current;
}

export function nextZone(depth: number): Zone | null {
  return ZONES.find((z) => z.depth > depth) ?? null;
}
