/**
 * Zone ambience beds (SPEC §5.6), synthesized: filtered noise for weather/air plus a slow,
 * LFO-breathing drone chord. One recipe per zone, in ZONES order.
 */

export interface BedRecipe {
  /** Filtered noise layers: [band Hz, Q, gain]. */
  noise: readonly (readonly [number, number, number])[];
  /** Drone chord (Hz) through a lowpass. */
  drones: readonly number[];
  droneGain: number;
  droneCutoff: number;
  /** Breathing LFO on the drone level (Hz) and its depth (0..1). */
  lfoHz: number;
  lfoDepth: number;
}

export const BEDS: readonly BedRecipe[] = [
  // The Curb — rain hiss + distant traffic
  {
    noise: [
      [5200, 0.5, 0.11],
      [380, 0.7, 0.05],
    ],
    drones: [55],
    droneGain: 0.025,
    droneCutoff: 220,
    lfoHz: 0.08,
    lfoDepth: 0.4,
  },
  // The Platform — subway rumble
  {
    noise: [[110, 0.9, 0.1]],
    drones: [49, 98],
    droneGain: 0.035,
    droneCutoff: 260,
    lfoHz: 0.13,
    lfoDepth: 0.6,
  },
  // The Tunnels — dripping, hollow
  {
    noise: [[820, 2.2, 0.035]],
    drones: [41.2, 61.7],
    droneGain: 0.045,
    droneCutoff: 300,
    lfoHz: 0.2,
    lfoDepth: 0.35,
  },
  // The Cellar — muffled jazz through the wall (swung minor-sixth pad)
  {
    noise: [[300, 0.8, 0.025]],
    drones: [110, 130.8, 164.8, 185],
    droneGain: 0.022,
    droneCutoff: 520,
    lfoHz: 1.1,
    lfoDepth: 0.5,
  },
  // The Sewers — wet resonance
  {
    noise: [[2400, 4, 0.03]],
    drones: [36.7, 55],
    droneGain: 0.05,
    droneCutoff: 240,
    lfoHz: 0.1,
    lfoDepth: 0.4,
  },
  // The Catacombs — wind through bone
  {
    noise: [[620, 0.5, 0.06]],
    drones: [73.4, 110],
    droneGain: 0.022,
    droneCutoff: 400,
    lfoHz: 0.07,
    lfoDepth: 0.7,
  },
  // The Vault — brass hum and ticking air
  {
    noise: [[3200, 8, 0.015]],
    drones: [82.4, 123.5, 164.8],
    droneGain: 0.028,
    droneCutoff: 700,
    lfoHz: 0.25,
    lfoDepth: 0.3,
  },
  // The Veil — reverse-swell shimmer
  {
    noise: [[1200, 0.5, 0.02]],
    drones: [146.8, 220, 293.7],
    droneGain: 0.024,
    droneCutoff: 1400,
    lfoHz: 0.05,
    lfoDepth: 0.85,
  },
  // The Sanctum — choir pad
  {
    noise: [[900, 0.6, 0.015]],
    drones: [110, 164.8, 220, 277.2],
    droneGain: 0.02,
    droneCutoff: 1800,
    lfoHz: 0.09,
    lfoDepth: 0.5,
  },
  // The Patron's Hearth — warm major bloom
  {
    noise: [[2000, 0.5, 0.01]],
    drones: [130.8, 196, 261.6, 329.6],
    droneGain: 0.024,
    droneCutoff: 2200,
    lfoHz: 0.12,
    lfoDepth: 0.4,
  },
];

export const bedFor = (zoneIndex: number): BedRecipe =>
  BEDS[Math.max(0, Math.min(BEDS.length - 1, zoneIndex))]!;

/** Start a bed on `dest`, fading in. Returns a stopper that fades out and frees the nodes. */
export function startBed(
  ctx: AudioContext,
  noiseBuf: AudioBuffer,
  dest: AudioNode,
  r: BedRecipe,
  fadeS = 2.5,
): (fadeOutS?: number) => void {
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(1, t + fadeS);
  out.connect(dest);
  const sources: AudioScheduledSourceNode[] = [];

  for (const [band, q, gain] of r.noise) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = band;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random());
    sources.push(src);
  }

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = r.droneCutoff;
  const droneBus = ctx.createGain();
  droneBus.gain.value = r.droneGain;
  lp.connect(droneBus).connect(out);
  for (const f of r.drones) {
    for (const cents of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      sources.push(o);
    }
  }
  const lfo = ctx.createOscillator();
  lfo.frequency.value = r.lfoHz;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = r.droneGain * r.lfoDepth;
  lfo.connect(lfoAmt).connect(droneBus.gain);
  lfo.start(t);
  sources.push(lfo);

  let stopped = false;
  return (fadeOutS = 2) => {
    if (stopped) return;
    stopped = true;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutS);
    for (const s of sources) s.stop(now + fadeOutS + 0.05);
    setTimeout(() => out.disconnect(), (fadeOutS + 0.2) * 1000);
  };
}
