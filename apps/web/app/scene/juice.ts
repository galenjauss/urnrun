import type { Tier } from "@urnrun/core";

/**
 * Juice state for the scene (SPEC §3.5): trauma-based shake, hit-stop and time dilation.
 * Pure — the renderer advances it with real frame time and reads the derived values.
 */

export interface Juice {
  /** 0..1; shake amplitude is trauma². Decays linearly. */
  trauma: number;
  /** Remaining hit-stop in ms: scene time is frozen while > 0. */
  hitStopMs: number;
  /** Remaining dilation in ms, and the time scale applied while it lasts. */
  dilateMs: number;
  dilateScale: number;
  /** Remaining additive flash (0..1), for gem/rejuvenator glints. Decays fast. */
  flash: number;
}

export const calmJuice = (): Juice => ({
  trauma: 0,
  hitStopMs: 0,
  dilateMs: 0,
  dilateScale: 1,
  flash: 0,
});

export interface Kick {
  trauma: number;
  hitStopMs: number;
  dilateMs: number;
  dilateScale: number;
  flash: number;
  /** Camera plunge: extra downward impulse (world px/s) on top of the depth spring. */
  plunge: number;
  /** Soul particles to burst toward the urn. */
  souls: number;
}

const NONE: Kick = {
  trauma: 0,
  hitStopMs: 0,
  dilateMs: 0,
  dilateScale: 1,
  flash: 0,
  plunge: 0,
  souls: 0,
};

/** The reveal choreography per tier. Miss (null) is a small, dull thud. */
export function kickFor(tier: Tier | null): Kick {
  switch (tier) {
    case null:
      return { ...NONE, trauma: 0.12 };
    case "trooper":
      return { ...NONE, trauma: 0.1, souls: 10 };
    case "wise_guy":
      return { ...NONE, trauma: 0.25, hitStopMs: 90, souls: 12 };
    case "guardian":
      return { ...NONE, trauma: 0.18, souls: 22, flash: 0.15 };
    case "walker":
      return { ...NONE, trauma: 0.35, hitStopMs: 110, plunge: 900, souls: 36, flash: 0.2 };
    case "mid_boss":
      return { ...NONE, trauma: 0.45, hitStopMs: 110, plunge: 1200, souls: 48, flash: 0.25 };
    case "rejuvenator":
      return {
        ...NONE,
        trauma: 0.3,
        dilateMs: 400,
        dilateScale: 0.3,
        plunge: 1400,
        souls: 72,
        flash: 0.45,
      };
  }
}

/** Apply a kick. Reduced motion keeps the flash and souls but drops shake, stops and plunges. */
export function applyKick(j: Juice, k: Kick, reducedMotion: boolean): Juice {
  if (reducedMotion) return { ...j, flash: Math.min(1, j.flash + k.flash * 0.5) };
  return {
    trauma: Math.min(1, j.trauma + k.trauma),
    hitStopMs: Math.max(j.hitStopMs, k.hitStopMs),
    dilateMs: Math.max(j.dilateMs, k.dilateMs),
    dilateScale: k.dilateMs > 0 ? k.dilateScale : j.dilateScale,
    flash: Math.min(1, j.flash + k.flash),
  };
}

const TRAUMA_DECAY_PER_S = 1.4;
const FLASH_DECAY_PER_S = 3;

/**
 * Advance by real elapsed ms. Returns the next juice state and the *scene* dt (ms) to simulate —
 * zero during hit-stop, scaled during dilation.
 */
export function stepJuice(j: Juice, realMs: number): { juice: Juice; sceneMs: number } {
  let remaining = realMs;
  let sceneMs = 0;
  let hitStopMs = j.hitStopMs;
  if (hitStopMs > 0) {
    const used = Math.min(hitStopMs, remaining);
    hitStopMs -= used;
    remaining -= used;
  }
  let dilateMs = j.dilateMs;
  if (remaining > 0 && dilateMs > 0) {
    const used = Math.min(dilateMs, remaining);
    dilateMs -= used;
    remaining -= used;
    sceneMs += used * j.dilateScale;
  }
  sceneMs += remaining;
  const s = realMs / 1000;
  return {
    juice: {
      trauma: Math.max(0, j.trauma - TRAUMA_DECAY_PER_S * s),
      hitStopMs,
      dilateMs,
      dilateScale: dilateMs > 0 ? j.dilateScale : 1,
      flash: Math.max(0, j.flash - FLASH_DECAY_PER_S * s),
    },
    sceneMs,
  };
}

/** Shake offset in px for the current trauma; `noise` gives smooth values in [-1, 1]. */
export function shakeOffset(
  trauma: number,
  t: number,
  maxPx: number,
  noise: (x: number) => number,
): { x: number; y: number; rot: number } {
  const amt = trauma * trauma;
  return {
    x: maxPx * amt * noise(t * 23.1),
    y: maxPx * amt * noise(t * 19.7 + 100),
    rot: 0.02 * amt * noise(t * 13.3 + 200),
  };
}

/** Cheap smooth 1-D value noise in [-1, 1] (deterministic). */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}
