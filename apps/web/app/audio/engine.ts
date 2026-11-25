import type { Tier } from "@urnrun/core";
import { bedFor, startBed } from "./ambience";
import { jitter, loadAudioSettings, saveAudioSettings, type AudioSettings } from "./settings";

/**
 * Synth-only SFX on the raw Web Audio API (SPEC §5.6): no samples, no library, ~0 KB of assets.
 * The context is created lazily inside the first user gesture (iOS requirement).
 */

type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private bedZone: number | null = null;
  private stopBed: ((fadeS?: number) => void) | null = null;
  private noiseBuf: AudioBuffer | null = null;
  settings: AudioSettings = { muted: false, sfx: 0.8, music: 0.4 };
  private listeners = new Set<(s: AudioSettings) => void>();
  private loaded = false;

  /** Load preferences once (client only; idempotent). */
  init(): void {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    this.settings = loadAudioSettings();
  }

  /** Create/resume the context. Must run inside a user gesture handler. */
  unlock(): void {
    const AC =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      try {
        this.ctx = new AC({ latencyHint: "interactive" });
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.applyGains();
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // A bed requested before the first gesture starts now.
    if (this.bedZone !== null && !this.stopBed) this.ambience(this.bedZone);
  }

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    saveAudioSettings(this.settings);
    this.applyGains();
    for (const l of this.listeners) l(this.settings);
  }

  subscribe(fn: (s: AudioSettings) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private applyGains(): void {
    if (!this.ctx || !this.master || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.02);
    this.musicBus?.gain.setTargetAtTime(this.settings.music, t, 0.05);
  }

  /** Crossfade the ambience bed to a zone (index into ZONES). Remembered until unlocked. */
  ambience(zoneIndex: number): void {
    const same = this.bedZone === zoneIndex && this.stopBed;
    this.bedZone = zoneIndex;
    if (same || !this.ctx || !this.musicBus || !this.noiseBuf) return;
    this.stopBed?.(2.5);
    this.stopBed = startBed(this.ctx, this.noiseBuf, this.musicBus, bedFor(zoneIndex));
  }

  stopAmbience(fadeS = 1.5): void {
    this.stopBed?.(fadeS);
    this.stopBed = null;
    this.bedZone = null;
  }

  /** Zone arrival stinger: a struck low chord that climbs with depth, plus an air whoosh. */
  stinger(zoneIndex: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const root = 55 * Math.pow(2, (zoneIndex * 2) / 12);
    for (const [m, a] of [
      [1, 0.3],
      [1.5, 0.14],
      [2, 0.1],
      [3, 0.04],
    ] as const) {
      this.tone(root * m, "sine", t, 2.4, a, { attack: 0.01 });
    }
    this.noise(t, 0.9, 0.06, 700, 0.5);
  }

  private ready(): AudioContext | null {
    if (!this.ctx || this.settings.muted || this.ctx.state !== "running") return null;
    return this.ctx;
  }

  // ── primitives ───────────────────────────────────────────────

  private tone(
    freq: number,
    wave: Wave,
    at: number,
    dur: number,
    peak: number,
    opts: {
      attack?: number;
      to?: number;
      filter?: { type: BiquadFilterType; freq: number; q?: number; to?: number };
    } = {},
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
    const g = ctx.createGain();
    const attack = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let node: AudioNode = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filter.type;
      f.frequency.setValueAtTime(opts.filter.freq, at);
      if (opts.filter.to) f.frequency.exponentialRampToValueAtTime(opts.filter.to, at + dur);
      f.Q.value = opts.filter.q ?? 1;
      node = node.connect(f);
    }
    node.connect(g).connect(this.sfxBus!);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  private noise(at: number, dur: number, peak: number, band: number, q = 1.5): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = band;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(this.sfxBus!);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  // ── voices ───────────────────────────────────────────────────

  /** Reveal voice per tier (SPEC §3.3). `null` is a miss. */
  tier(tier: Tier | null): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    switch (tier) {
      case null: // muted thud
        this.tone(120, "sine", t, 0.28, 0.35, { to: 60 });
        this.noise(t, 0.08, 0.08, 300);
        break;
      case "trooper": // dull brass clink
        this.tone(660, "triangle", t, 0.22, 0.22, { filter: { type: "lowpass", freq: 2200 } });
        this.tone(990, "square", t, 0.12, 0.05, { filter: { type: "lowpass", freq: 1800 } });
        this.noise(t, 0.03, 0.12, 4000, 3);
        break;
      case "wise_guy": // sly muted trombone wah
        this.tone(196, "sawtooth", t, 0.32, 0.18, {
          to: 185,
          attack: 0.03,
          filter: { type: "lowpass", freq: 500, q: 6, to: 1500 },
        });
        this.tone(185, "sawtooth", t + 0.3, 0.45, 0.16, {
          to: 165,
          attack: 0.03,
          filter: { type: "lowpass", freq: 1400, q: 6, to: 420 },
        });
        break;
      case "guardian": // warm bell
        for (const [m, a] of [
          [1, 0.3],
          [2, 0.12],
          [2.76, 0.08],
          [5.4, 0.03],
        ] as const) {
          this.tone(523.25 * m, "sine", t, 1.5 / Math.sqrt(m), a);
        }
        break;
      case "walker": // low gong + rising shimmer
        for (const [f, a, d] of [
          [98, 0.35, 2.6],
          [147.5, 0.16, 2.2],
          [233, 0.08, 1.6],
        ] as const) {
          this.tone(f, "sine", t, d, a, { attack: 0.01 });
        }
        this.tone(1046, "triangle", t + 0.15, 1.1, 0.05, { to: 2093, attack: 0.3 });
        this.tone(1568, "sine", t + 0.25, 1.0, 0.03, { to: 3136, attack: 0.3 });
        break;
      case "mid_boss": // choir swell + sub thump
        this.tone(80, "sine", t, 0.5, 0.6, { to: 38 });
        for (const f of [220, 261.6, 329.6, 440]) {
          for (const d of [-6, 6]) {
            this.tone(f * Math.pow(2, d / 1200), "sawtooth", t + 0.05, 1.6, 0.035, {
              attack: 0.45,
              filter: { type: "lowpass", freq: 900, q: 0.7, to: 1600 },
            });
          }
        }
        break;
      case "rejuvenator": {
        // full fanfare + glass chime cascade
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(f, "sawtooth", t + i * 0.07, 0.9 - i * 0.1, 0.08, {
            attack: 0.02,
            filter: { type: "lowpass", freq: 2400, q: 1 },
          });
        });
        this.tone(130.8, "sine", t, 1.2, 0.35, { to: 65.4 });
        const chimes = [1568, 1760, 2093, 2349, 2637, 3136, 3520, 4186];
        chimes.forEach((f, i) => {
          this.tone(f, "sine", t + 0.32 + i * 0.065, 0.9, 0.07);
          this.tone(f * 2.01, "sine", t + 0.32 + i * 0.065, 0.4, 0.02);
        });
        break;
      }
    }
  }

  /** Ceremony I–III: the zone stinger under a rising chime bloom that lengthens with depth. */
  ceremony(level: number, zoneIndex: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.stinger(zoneIndex);
    const t = ctx.currentTime + 0.25;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
    notes.slice(0, 3 + level).forEach((f, i) => {
      this.tone(f, "sine", t + i * 0.11, 1.4 + level * 0.3, 0.06);
      this.tone(f * 2, "sine", t + i * 0.11, 0.6, 0.015);
    });
  }

  /** Typing tick: short filtered noise, ±6% pitch; tenser (higher) in the last seconds. */
  tick(urgent = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const band = (urgent ? 3600 : 2600) * jitter(0.06);
    this.noise(ctx.currentTime, 0.025, 0.09, band, 4);
  }

  /** Heartbeat for the last 5 seconds: lub-dub. */
  heartbeat(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(62, "sine", t, 0.16, 0.55, { to: 42 });
    this.tone(58, "sine", t + 0.19, 0.2, 0.4, { to: 40 });
  }

  /** Wrong guess: a soft, short downward blip (wrong guesses only cost time). */
  reject(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(330, "triangle", ctx.currentTime, 0.14, 0.08, { to: 220 });
  }

  /** UI press. */
  press(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(1200, "sine", ctx.currentTime, 0.06, 0.05, { to: 900 });
  }
}

/** One engine per page. */
export const audio = new AudioEngine();
