import { MISS, TIERS, soulsFor, zoneFor, type Tier } from "./scoring";

/** Share string builder (SPEC §3.12). */

export interface ShareInput {
  day: number;
  tiers: readonly (Tier | null)[];
  percentile: number | null;
  url: string;
  variant?: "emoji" | "bars";
}

const formatter = new Intl.NumberFormat("en-US");

export function buildShareText({
  day,
  tiers,
  percentile,
  url,
  variant = "emoji",
}: ShareInput): string {
  const total = tiers.reduce((sum, t) => sum + soulsFor(t), 0);
  const row = tiers
    .map((t) =>
      t
        ? TIERS[t][variant === "bars" ? "bar" : "glyph"]
        : MISS[variant === "bars" ? "bar" : "glyph"],
    )
    .join("");
  const label = day >= 1 ? `#${day}` : "Beta";
  const lines = [`Urn Run ${label} · ${formatter.format(total)} ft · ${zoneFor(total).name}`, row];
  if (percentile !== null) {
    const pct = Math.min(100, Math.max(0, Math.round(percentile)));
    lines.push(pct >= 100 ? "Deepest dive today" : `Deeper than ${pct}% of couriers today`);
  }
  lines.push(url);
  return lines.join("\n");
}
