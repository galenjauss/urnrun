/**
 * Automatic quality tiering from frame-time samples (SPEC §5.5). Hysteresis: drop fast when
 * frames are slow, climb back slowly, so the scene never oscillates between tiers.
 */

export type Quality = 0 | 1 | 2; // 0 = low (low-power), 1 = medium, 2 = high

export interface QualityConfig {
  /** Particle budget and blur passes per tier. */
  particles: number;
  glow: boolean;
  grain: boolean;
  maxDpr: number;
  fpsCap: number;
}

export const QUALITY: Readonly<Record<Quality, QualityConfig>> = {
  0: { particles: 90, glow: false, grain: false, maxDpr: 1, fpsCap: 30 },
  1: { particles: 220, glow: true, grain: true, maxDpr: 1.5, fpsCap: 60 },
  2: { particles: 420, glow: true, grain: true, maxDpr: 2, fpsCap: 120 },
};

export interface QualityMonitor {
  tier: Quality;
  /** Rolling window of recent frame times (ms). */
  samples: number[];
  /** Consecutive good windows, used to step back up. */
  goodWindows: number;
}

const WINDOW = 45;
const SLOW_MS = 24; // < ~42 fps average → drop a tier
const FAST_MS = 14; // > ~70 fps average for several windows → climb a tier
const CLIMB_AFTER = 4;

export const newMonitor = (start: Quality = 2): QualityMonitor => ({
  tier: start,
  samples: [],
  goodWindows: 0,
});

/** Feed one frame time. Returns the (possibly new) monitor; tier changes only at window ends. */
export function sampleFrame(m: QualityMonitor, frameMs: number): QualityMonitor {
  // Ignore stalls (tab switches, GC pauses) so one hitch never downgrades the scene.
  if (frameMs <= 0 || frameMs > 250) return m;
  const samples = [...m.samples, frameMs];
  if (samples.length < WINDOW) return { ...m, samples };
  const sorted = [...samples].sort((a, b) => a - b);
  // Use the 75th percentile: robust to a few spikes, still sees sustained slowness.
  const p75 = sorted[Math.floor(sorted.length * 0.75)]!;
  if (p75 > SLOW_MS && m.tier > 0) {
    return { tier: (m.tier - 1) as Quality, samples: [], goodWindows: 0 };
  }
  if (p75 < FAST_MS) {
    const goodWindows = m.goodWindows + 1;
    if (goodWindows >= CLIMB_AFTER && m.tier < 2) {
      return { tier: (m.tier + 1) as Quality, samples: [], goodWindows: 0 };
    }
    return { ...m, samples: [], goodWindows };
  }
  return { ...m, samples: [], goodWindows: 0 };
}
