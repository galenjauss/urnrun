import { MISS, TIERS, verdictFor, zoneFor, type Tier } from "@urnrun/core";
import { VIEW, layoutConstellation } from "../../app/game/constellation";

/**
 * Share card (1200×630 OG image) as an SVG string. Pure: everything comes from the day and the
 * seven tiers in the share code, so the same URL always renders the same card.
 */

export const CARD = { w: 1200, h: 630 } as const;

/** sRGB approximations of the tier tokens (resvg has no oklch). */
export const TIER_HEX: Readonly<Record<Tier | "miss", string>> = {
  trooper: "#8d857c",
  wise_guy: "#c47ad6",
  guardian: "#b8955a",
  walker: "#7f8df0",
  mid_boss: "#d1584f",
  rejuvenator: "#5fe0c8",
  miss: "#3e434a",
};

const INK = "#0b0e13";
const BRASS = "#b8955a";
const GOLD = "#e8b84a";
const SOUL = "#5fe0c8";
const PARCHMENT = "#f1e9d6";

const fmt = new Intl.NumberFormat("en-US");

export interface CardInput {
  day: number;
  tiers: readonly (Tier | null)[];
}

export function cardTotal(tiers: readonly (Tier | null)[]): number {
  return tiers.reduce((s, t) => s + (t ? TIERS[t].souls : MISS.souls), 0);
}

/** Diamond gem for the tier row (emoji can't be relied on in a rasterizer). */
function gem(cx: number, cy: number, r: number, color: string, lit: boolean): string {
  const d = `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;
  return lit
    ? `<path d="${d}" fill="${color}"/><path d="${d}" fill="none" stroke="${PARCHMENT}" stroke-opacity="0.35" stroke-width="2"/>`
    : `<path d="${d}" fill="none" stroke="${TIER_HEX.miss}" stroke-width="3"/>`;
}

export function cardSvg({ day, tiers }: CardInput): string {
  const total = cardTotal(tiers);
  const zone = zoneFor(total).name;
  const verdict = verdictFor(total).name;
  const label = day >= 1 ? `DIVE #${day}` : "BETA DIVE";

  // Constellation box on the right.
  const box = { x: 640, y: 118, w: 480, h: 270 };
  const sx = box.w / VIEW.w;
  const sy = box.h / VIEW.h;
  const { stars, links } = layoutConstellation(
    tiers.map((t, idx) => ({ idx, tier: t, souls: t ? TIERS[t].souls : 0 })),
  );
  const px = (x: number) => (box.x + x * sx).toFixed(1);
  const py = (y: number) => (box.y + y * sy).toFixed(1);
  const linkSvg = links
    .map((l) => {
      const a = stars[l.from]!;
      const b = stars[l.to]!;
      return `<line x1="${px(a.x)}" y1="${py(a.y)}" x2="${px(b.x)}" y2="${py(b.y)}" stroke="${
        l.chain ? SOUL : PARCHMENT
      }" stroke-opacity="${l.chain ? 0.9 : 0.3}" stroke-width="${l.chain ? 3 : 1.6}"/>`;
    })
    .join("");
  const starSvg = stars
    .map((s) => {
      const c = TIER_HEX[s.tier ?? "miss"];
      const r = s.r * 2.6;
      return s.lit
        ? `<circle cx="${px(s.x)}" cy="${py(s.y)}" r="${(r * 3.2).toFixed(1)}" fill="url(#glow-${s.tier})"/><circle cx="${px(s.x)}" cy="${py(s.y)}" r="${r.toFixed(1)}" fill="${c}"/>`
        : `<circle cx="${px(s.x)}" cy="${py(s.y)}" r="4" fill="${c}"/>`;
    })
    .join("");
  const glowDefs = (Object.keys(TIERS) as Tier[])
    .map(
      (t) =>
        `<radialGradient id="glow-${t}"><stop offset="0" stop-color="${TIER_HEX[t]}" stop-opacity="0.55"/><stop offset="1" stop-color="${TIER_HEX[t]}" stop-opacity="0"/></radialGradient>`,
    )
    .join("");

  const gems = tiers
    .map((t, i) => gem(100 + i * 62, 494, 20, TIER_HEX[t ?? "miss"], t !== null))
    .join("");

  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI - Math.PI;
    const x2 = 600 + Math.cos(a) * 900;
    const y2 = 700 + Math.sin(a) * 900;
    return `<line x1="600" y1="700" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.w}" height="${CARD.h}" viewBox="0 0 ${CARD.w} ${CARD.h}">
<defs>
<radialGradient id="bg" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="#123a36"/><stop offset="0.55" stop-color="#121722"/><stop offset="1" stop-color="${INK}"/></radialGradient>
${glowDefs}
</defs>
<rect width="${CARD.w}" height="${CARD.h}" fill="url(#bg)"/>
<g stroke="${BRASS}" stroke-opacity="0.07" stroke-width="2">${rays}</g>
<rect x="24" y="24" width="${CARD.w - 48}" height="${CARD.h - 48}" fill="none" stroke="${BRASS}" stroke-opacity="0.75" stroke-width="2"/>
<rect x="34" y="34" width="${CARD.w - 68}" height="${CARD.h - 68}" fill="none" stroke="${BRASS}" stroke-opacity="0.3" stroke-width="1"/>
<path d="M34 74V34H74M${CARD.w - 74} 34H${CARD.w - 34}V74M34 ${CARD.h - 74}V${CARD.h - 34}H74M${CARD.w - 74} ${CARD.h - 34}H${CARD.w - 34}V${CARD.h - 74}" fill="none" stroke="${GOLD}" stroke-width="3"/>
<text x="80" y="118" font-family="Limelight" font-size="54" fill="${GOLD}">Urn Run</text>
<text x="82" y="160" font-family="Jost" font-weight="500" font-size="22" letter-spacing="5" fill="${BRASS}">${label}</text>
<text x="76" y="300" font-family="Limelight" font-size="116" fill="${SOUL}">${fmt.format(total)} ft</text>
<text x="80" y="362" font-family="Limelight" font-size="46" fill="${GOLD}">${zone.replace("'", "’")}</text>
<text x="82" y="414" font-family="Jost" font-weight="700" font-size="26" letter-spacing="6" fill="${PARCHMENT}">${verdict.toUpperCase().replace("'", "’")}</text>
${gems}
<rect x="${box.x - 14}" y="${box.y - 14}" width="${box.w + 28}" height="${box.h + 28}" fill="${INK}" fill-opacity="0.55" stroke="${BRASS}" stroke-opacity="0.45" stroke-width="1.5"/>
${linkSvg}${starSvg}
<text x="${box.x + box.w / 2}" y="${box.y + box.h + 52}" text-anchor="middle" font-family="Jost" font-weight="500" font-size="20" letter-spacing="6" fill="${BRASS}">CONSTELLATION</text>
<text x="${CARD.w - 80}" y="${CARD.h - 62}" text-anchor="end" font-family="Jost" font-weight="500" font-size="18" fill="${PARCHMENT}" fill-opacity="0.55">Unofficial Deadlock fan game · play.urnrun.workers.dev</text>
</svg>`;
}
