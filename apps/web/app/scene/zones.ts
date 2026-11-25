import { ZONES } from "@urnrun/core";

/** Per-zone look for the canvas scene (SPEC §3.4). Colors are sRGB triples so they can be lerped. */

export type RGB = readonly [number, number, number];
export type Motif =
  | "street"
  | "tile"
  | "arches"
  | "barrels"
  | "pipes"
  | "niches"
  | "gears"
  | "ink"
  | "gates"
  | "sunburst";
export type Weather = "rain" | "dust" | "sparks" | "motes" | "drips" | "embers" | "wisps" | "souls";

export interface ZoneLook {
  id: string;
  skyTop: RGB;
  skyBottom: RGB;
  /** Silhouette color for parallax layers. */
  ink: RGB;
  /** Light source / glow accent. */
  accent: RGB;
  motif: Motif;
  weather: Weather;
}

export const LOOKS: readonly ZoneLook[] = [
  {
    id: "curb",
    skyTop: [22, 26, 40],
    skyBottom: [9, 11, 17],
    ink: [6, 7, 11],
    accent: [236, 170, 80],
    motif: "street",
    weather: "rain",
  },
  {
    id: "platform",
    skyTop: [18, 36, 31],
    skyBottom: [7, 15, 13],
    ink: [5, 10, 9],
    accent: [196, 226, 150],
    motif: "tile",
    weather: "dust",
  },
  {
    id: "tunnels",
    skyTop: [34, 20, 15],
    skyBottom: [12, 8, 8],
    ink: [8, 5, 5],
    accent: [255, 176, 88],
    motif: "arches",
    weather: "sparks",
  },
  {
    id: "cellar",
    skyTop: [38, 25, 15],
    skyBottom: [14, 9, 6],
    ink: [9, 6, 4],
    accent: [232, 162, 72],
    motif: "barrels",
    weather: "motes",
  },
  {
    id: "sewers",
    skyTop: [15, 34, 24],
    skyBottom: [5, 13, 10],
    ink: [3, 9, 7],
    accent: [120, 232, 150],
    motif: "pipes",
    weather: "drips",
  },
  {
    id: "catacombs",
    skyTop: [30, 25, 24],
    skyBottom: [10, 8, 8],
    ink: [6, 5, 5],
    accent: [250, 202, 120],
    motif: "niches",
    weather: "embers",
  },
  {
    id: "vault",
    skyTop: [34, 29, 15],
    skyBottom: [12, 10, 6],
    ink: [8, 7, 4],
    accent: [240, 200, 100],
    motif: "gears",
    weather: "motes",
  },
  {
    id: "veil",
    skyTop: [18, 20, 40],
    skyBottom: [6, 6, 16],
    ink: [4, 4, 11],
    accent: [146, 164, 255],
    motif: "ink",
    weather: "wisps",
  },
  {
    id: "sanctum",
    skyTop: [9, 34, 36],
    skyBottom: [4, 12, 14],
    ink: [2, 8, 9],
    accent: [110, 235, 210],
    motif: "gates",
    weather: "souls",
  },
  {
    id: "hearth",
    skyTop: [46, 34, 13],
    skyBottom: [14, 10, 4],
    ink: [10, 7, 2],
    accent: [255, 222, 140],
    motif: "sunburst",
    weather: "souls",
  },
];

/** Depth band (ft) over which one zone's look crossfades into the next, ending at the boundary
 * (so landing exactly on a zone's depth shows that zone fully). */
export const BLEND_FT = 120;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const smooth = (t: number) => t * t * (3 - 2 * t);

export interface Blend {
  from: ZoneLook;
  to: ZoneLook;
  /** 0 = fully `from`, 1 = fully `to`. */
  t: number;
}

/** Which looks are visible at a depth, and how far the crossfade has progressed. */
export function blendAt(depth: number): Blend {
  const d = Math.max(0, depth);
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i]!;
    if (d >= z.depth - BLEND_FT && i > 0) {
      const t = Math.min(1, (d - (z.depth - BLEND_FT)) / BLEND_FT);
      return { from: LOOKS[i - 1]!, to: LOOKS[i]!, t: smooth(t) };
    }
  }
  return { from: LOOKS[0]!, to: LOOKS[0]!, t: 0 };
}

export const rgb = (c: RGB, a = 1): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
