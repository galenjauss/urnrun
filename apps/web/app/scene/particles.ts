import type { Weather } from "./zones";

/**
 * Pooled particle system on typed arrays: no per-frame allocation. Two families share the pool:
 * ambient weather (per zone) and soul bursts that home in on the Urn.
 */

export const KIND_WEATHER = 0;
export const KIND_SOUL = 1;

export class Particles {
  readonly cap: number;
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly size: Float32Array;
  readonly kind: Uint8Array;
  /** Per-particle phase for wobble/spiral. */
  readonly seed: Float32Array;

  constructor(cap: number) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.kind = new Uint8Array(cap);
    this.seed = new Float32Array(cap);
  }

  /** Adds one particle; returns false when the pool is full (callers just skip). */
  spawn(
    kind: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    limit = this.cap,
  ): boolean {
    if (this.count >= Math.min(limit, this.cap)) return false;
    const i = this.count++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.seed[i] = Math.random() * 1000;
    return true;
  }

  /** Swap-remove dead particles (order is irrelevant for additive drawing). */
  private kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.kind[i] = this.kind[last]!;
    this.x[i] = this.x[last]!;
    this.y[i] = this.y[last]!;
    this.vx[i] = this.vx[last]!;
    this.vy[i] = this.vy[last]!;
    this.life[i] = this.life[last]!;
    this.maxLife[i] = this.maxLife[last]!;
    this.size[i] = this.size[last]!;
    this.seed[i] = this.seed[last]!;
  }

  /**
   * Integrate by `dt` seconds. Weather wraps/falls; souls steer toward (tx, ty) and die on arrival.
   * `scroll` is the camera's screen-space motion this frame (px), so ambient weather streams past
   * during a plunge. Returns how many souls arrived (for the urn's pulse).
   */
  step(dt: number, w: number, h: number, tx: number, ty: number, scroll: number): number {
    let arrived = 0;
    for (let i = this.count - 1; i >= 0; i--) {
      const life = this.life[i]! - dt;
      if (life <= 0) {
        this.kill(i);
        continue;
      }
      this.life[i] = life;
      if (this.kind[i] === KIND_SOUL) {
        // Spiral in: steering force grows as the particle ages, plus a tangential swirl.
        const age = 1 - life / this.maxLife[i]!;
        const dx = tx - this.x[i]!;
        const dy = ty - this.y[i]!;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 14 && age > 0.25) {
          arrived++;
          this.kill(i);
          continue;
        }
        const pull = 900 + 2600 * age;
        const swirl = 260 * (1 - age);
        this.vx[i] = this.vx[i]! + ((dx / dist) * pull + (-dy / dist) * swirl) * dt;
        this.vy[i] = this.vy[i]! + ((dy / dist) * pull + (dx / dist) * swirl) * dt;
        const drag = Math.exp(-3.2 * dt);
        this.vx[i] = this.vx[i]! * drag;
        this.vy[i] = this.vy[i]! * drag;
      } else {
        this.y[i] = this.y[i]! - scroll;
      }
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      if (this.kind[i] === KIND_WEATHER) {
        const y = this.y[i]!;
        if (y > h + 40) this.y[i] = y - (h + 80);
        else if (y < -40) this.y[i] = y + (h + 80);
        const x = this.x[i]!;
        if (x > w + 20) this.x[i] = x - (w + 40);
        else if (x < -20) this.x[i] = x + (w + 40);
      }
    }
    return arrived;
  }

  countKind(kind: number): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.kind[i] === kind) n++;
    return n;
  }
}

/** Ambient motion per weather: base velocity (px/s), jitter, size, lifetime. */
export const WEATHER: Readonly<
  Record<Weather, { vx: number; vy: number; jitter: number; size: [number, number]; life: number }>
> = {
  rain: { vx: -60, vy: 900, jitter: 120, size: [0.8, 1.4], life: 60 },
  dust: { vx: 6, vy: 10, jitter: 14, size: [0.6, 1.6], life: 60 },
  sparks: { vx: 0, vy: 140, jitter: 90, size: [0.8, 1.8], life: 2.2 },
  motes: { vx: 4, vy: -8, jitter: 10, size: [0.8, 2.2], life: 60 },
  drips: { vx: 0, vy: 420, jitter: 20, size: [0.8, 1.4], life: 60 },
  embers: { vx: 0, vy: -36, jitter: 22, size: [0.8, 2], life: 6 },
  wisps: { vx: 12, vy: -14, jitter: 18, size: [2, 5], life: 60 },
  souls: { vx: 0, vy: -46, jitter: 26, size: [1, 2.6], life: 8 },
};
