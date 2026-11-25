import { MISS, TIERS, type Tier } from "@urnrun/core";

export const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  heroes: "Heroes & Abilities",
  items: "Items & Economy",
  lore: "Lore & World",
  community: "Community",
};

export const categoryLabel = (c: string): string => CATEGORY_LABEL[c] ?? c;

export interface TierView {
  label: string;
  glyph: string;
  souls: number;
  /** CSS class suffix for tier-colored styling. */
  tone: string;
}

const TONE: Readonly<Record<Tier, string>> = {
  trooper: "trooper",
  wise_guy: "wise",
  guardian: "guardian",
  walker: "walker",
  mid_boss: "midboss",
  rejuvenator: "rejuv",
};

export function tierView(tier: Tier | null): TierView {
  if (!tier) return { label: "Miss", glyph: MISS.glyph, souls: 0, tone: "miss" };
  const t = TIERS[tier];
  return { label: t.label, glyph: t.glyph, souls: t.souls, tone: TONE[tier] };
}

export const formatFt = (n: number): string => `${new Intl.NumberFormat("en-US").format(n)} ft`;
