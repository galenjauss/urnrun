import { MISS, TIERS, soulsFor, zoneFor, type Tier } from "./scoring";

/** Share string builder (SPEC §3.12). */

export interface ShareInput {
  day: number;
  tiers: readonly (Tier | null)[];
  percentile: number | null;
  url: string;
  variant?: "emoji" | "bars";
  /** Overrides the "#12" / "Beta" label (e.g. "Free Dive"). */
  label?: string;
}

const formatter = new Intl.NumberFormat("en-US");

export function buildShareText({
  day,
  tiers,
  percentile,
  url,
  variant = "emoji",
  label: labelOverride,
}: ShareInput): string {
  const total = tiers.reduce((sum, t) => sum + soulsFor(t), 0);
  const row = tiers
    .map((t) =>
      t
        ? TIERS[t][variant === "bars" ? "bar" : "glyph"]
        : MISS[variant === "bars" ? "bar" : "glyph"],
    )
    .join("");
  const label = labelOverride ?? (day >= 1 ? `#${day}` : "Beta");
  const lines = [`Urn Run ${label} · ${formatter.format(total)} ft · ${zoneFor(total).name}`, row];
  if (percentile !== null) {
    const pct = Math.min(100, Math.max(0, Math.round(percentile)));
    lines.push(pct >= 100 ? "Deepest dive today" : `Deeper than ${pct}% of couriers today`);
  }
  lines.push(url);
  return lines.join("\n");
}

/**
 * Share code: one character per round (x = miss), so `/s/:day/:code` can render the card and
 * constellation without any server state. Only tiers are encoded — already public in the share text.
 */
const CODE_CHAR: Readonly<Record<Tier, string>> = {
  trooper: "t",
  wise_guy: "w",
  guardian: "g",
  walker: "k",
  mid_boss: "m",
  rejuvenator: "r",
};
const MISS_CHAR = "x";
const CHAR_TIER: Readonly<Record<string, Tier>> = Object.fromEntries(
  Object.entries(CODE_CHAR).map(([tier, ch]) => [ch, tier as Tier]),
);

export function encodeShareCode(tiers: readonly (Tier | null)[]): string {
  return tiers.map((t) => (t ? CODE_CHAR[t] : MISS_CHAR)).join("");
}

/** Returns null unless `code` is exactly `rounds` valid characters. */
export function decodeShareCode(code: string, rounds = 7): (Tier | null)[] | null {
  if (code.length !== rounds) return null;
  const out: (Tier | null)[] = [];
  for (const ch of code) {
    if (ch === MISS_CHAR) out.push(null);
    else if (CHAR_TIER[ch]) out.push(CHAR_TIER[ch]!);
    else return null;
  }
  return out;
}

/** Canonical share-card path for a dive. */
export const shareCardPath = (day: number, tiers: readonly (Tier | null)[]): string =>
  `/s/${day}/${encodeShareCode(tiers)}`;
