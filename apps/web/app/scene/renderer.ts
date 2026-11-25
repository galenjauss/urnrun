import type { Tier } from "@urnrun/core";
import {
  applyKick,
  calmJuice,
  ceremonyKick,
  kickFor,
  noise1,
  shakeOffset,
  stepJuice,
  type Juice,
} from "./juice";
import { paint, type LayerCtx } from "./motifs";
import { KIND_SOUL, KIND_WEATHER, Particles, WEATHER } from "./particles";
import { QUALITY, newMonitor, sampleFrame, type Quality, type QualityMonitor } from "./quality";
import { stepSpring, type Spring } from "./spring";
import { blendAt, mixRGB, rgb, type Weather, type ZoneLook } from "./zones";

/** What the React layer feeds the scene. Mutated in place; read every frame. */
export interface SceneInputs {
  /** Target depth in ft (= total souls). */
  depth: number;
  /** Last 5 seconds of a round: tighten the vignette and pulse with the heartbeat. */
  urgent: boolean;
  reducedMotion: boolean;
  /** Screen-space point (CSS px) the soul particles fly into — the Urn. */
  urn: { x: number; y: number } | null;
  /** Player's low-power choice: pins the lowest quality tier (fewer particles, 30 fps). */
  lowPower?: boolean;
}

const PARALLAX = [0.22, 0.55, 1] as const;
const CAMERA_OMEGA = 3.4;
const MAX_FRAME_MS = 100;

export class SceneRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  readonly inputs: SceneInputs;
  private raf = 0;
  private last = 0;
  private time = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private camera: Spring;
  private juice: Juice = calmJuice();
  private monitor: QualityMonitor;
  private particles: Particles;
  private weather: Weather | null = null;
  private urnPulse = 0;
  private grain: CanvasPattern | null = null;
  private kicks: (Tier | null)[] = [];
  private ceremonies: number[] = [];
  private drawnTier: Quality = 2;
  private readonly onVisibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };

  constructor(canvas: HTMLCanvasElement, inputs: SceneInputs, startQuality: Quality = 2) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.inputs = inputs;
    this.camera = { value: inputs.depth, velocity: 0 };
    this.monitor = newMonitor(startQuality);
    this.particles = new Particles(QUALITY[2].particles);
    this.drawnTier = this.quality;
    this.resize();
    this.grain = this.makeGrain();
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** Effective tier: the auto-tiered quality, pinned to low when the player asks for it. */
  get quality(): Quality {
    return this.inputs.lowPower ? 0 : this.monitor.tier;
  }

  /** Queue a reveal beat (tier, or null for a miss). Applied on the next frame. */
  kick(tier: Tier | null): void {
    this.kicks.push(tier);
  }

  /** Ceremony beat (I–III) on arriving at the Veil, Sanctum or Hearth. */
  ceremony(level: number): void {
    this.ceremonies.push(level);
  }

  resize(): void {
    const cfg = QUALITY[this.quality];
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(globalThis.devicePixelRatio || 1, cfg.maxDpr);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resume(): void {
    if (!document.hidden) this.start();
  }

  destroy(): void {
    this.pause();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  /** px of scroll per ft of depth: a zone boundary is ~1.5 screens apart. */
  private get pxPerFt(): number {
    return (this.h * 1.5) / 500;
  }

  private frame(now: number): void {
    const realMs = Math.min(MAX_FRAME_MS, now - this.last);
    const cfg = QUALITY[this.quality];
    // Frame cap (low-power tier runs at 30 fps). Small tolerance so 60 Hz displays don't skip.
    if (realMs < 1000 / cfg.fpsCap - 2) return;
    this.last = now;

    this.monitor = sampleFrame(this.monitor, realMs);
    if (this.quality !== this.drawnTier) {
      this.drawnTier = this.quality;
      this.resize();
    }

    const reduced = this.inputs.reducedMotion;
    for (const tier of this.kicks.splice(0)) {
      const k = kickFor(tier);
      this.juice = applyKick(this.juice, k, reduced);
      if (!reduced) this.camera.velocity += k.plunge / this.pxPerFt;
      this.burst(k.souls);
    }

    for (const level of this.ceremonies.splice(0)) {
      this.juice = applyKick(this.juice, ceremonyKick(level), reduced);
      this.burst(40 + 40 * level);
    }

    const { juice, sceneMs } = stepJuice(this.juice, realMs);
    this.juice = juice;
    const dt = sceneMs / 1000;
    this.time += dt;

    const prevScroll = this.camera.value * this.pxPerFt;
    if (reduced) {
      // No plunge: glide gently (a crossfade-like drift) instead of springing.
      this.camera = {
        value: this.camera.value + (this.inputs.depth - this.camera.value) * Math.min(1, dt * 2.5),
        velocity: 0,
      };
    } else {
      this.camera = stepSpring(this.camera, this.inputs.depth, CAMERA_OMEGA, dt);
    }
    const scroll = this.camera.value * this.pxPerFt;

    const urn = this.inputs.urn ?? { x: this.w / 2, y: this.h - 60 };
    const blend = blendAt(this.camera.value);
    this.tendWeather(blend.t < 0.5 ? blend.from : blend.to, cfg.particles);
    const arrived = this.particles.step(
      dt,
      this.w,
      this.h,
      urn.x,
      urn.y,
      (scroll - prevScroll) * 0.6,
    );
    this.urnPulse = Math.min(1, this.urnPulse * Math.exp(-3 * (realMs / 1000)) + arrived * 0.04);

    this.draw(scroll, blend, urn, cfg.glow, cfg.grain, reduced);
  }

  private burst(n: number): void {
    const limit = QUALITY[this.quality].particles;
    const scale = [0.5, 0.8, 1][this.quality]!;
    const cx = this.w / 2;
    const cy = this.h * 0.26;
    for (let i = 0; i < Math.round(n * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 260;
      this.particles.spawn(
        KIND_SOUL,
        cx + Math.cos(a) * 30,
        cy + Math.sin(a) * 20,
        Math.cos(a) * v,
        Math.sin(a) * v - 60,
        2.4 + Math.random() * 0.8,
        1.6 + Math.random() * 2.2,
        limit,
      );
    }
  }

  /** Keep ambient weather at its density target; swap it out when the zone changes. */
  private tendWeather(look: ZoneLook, budget: number): void {
    const p = this.particles;
    if (look.weather !== this.weather) {
      for (let i = 0; i < p.count; i++) {
        if (p.kind[i] === KIND_WEATHER) p.life[i] = Math.min(p.life[i]!, 0.5 + Math.random() * 0.5);
      }
      this.weather = look.weather;
    }
    const spec = WEATHER[look.weather];
    const target = Math.floor(budget * (look.weather === "rain" ? 0.55 : 0.35));
    const have = p.countKind(KIND_WEATHER);
    const add = Math.min(target - have, 12);
    for (let i = 0; i < add; i++) {
      p.spawn(
        KIND_WEATHER,
        Math.random() * this.w,
        Math.random() * this.h,
        spec.vx + (Math.random() - 0.5) * spec.jitter,
        spec.vy + (Math.random() - 0.5) * spec.jitter,
        spec.life * (0.5 + Math.random() * 0.5),
        spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]),
        budget,
      );
    }
  }

  private draw(
    scroll: number,
    blend: ReturnType<typeof blendAt>,
    urn: { x: number; y: number },
    glow: boolean,
    grain: boolean,
    reduced: boolean,
  ): void {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const top = mixRGB(blend.from.skyTop, blend.to.skyTop, blend.t);
    const bottom = mixRGB(blend.from.skyBottom, blend.to.skyBottom, blend.t);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(top));
    sky.addColorStop(1, rgb(bottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (!reduced && this.juice.trauma > 0) {
      const s = shakeOffset(this.juice.trauma, this.time, 18, noise1);
      ctx.translate(w / 2 + s.x, h / 2 + s.y);
      ctx.rotate(s.rot);
      ctx.translate(-w / 2, -h / 2);
    }

    for (let layer = 0; layer < 3; layer++) {
      const base: Omit<LayerCtx, "look"> = {
        ctx,
        w,
        h,
        scroll: scroll * PARALLAX[layer]!,
        layer,
        t: this.time,
        glow,
      };
      if (blend.t < 1) {
        ctx.globalAlpha = 1 - blend.t;
        paint({ ...base, look: blend.from });
      }
      if (blend.t > 0) {
        ctx.globalAlpha = blend.t;
        paint({ ...base, look: blend.to });
      }
      ctx.globalAlpha = 1;
    }

    this.drawParticles(mixRGB(blend.from.accent, blend.to.accent, blend.t), glow);
    ctx.restore();

    // Urn halo: brightens as souls land.
    if (glow || this.urnPulse > 0) {
      const r = 70 + 50 * this.urnPulse;
      const g = ctx.createRadialGradient(urn.x, urn.y, 0, urn.x, urn.y, r);
      g.addColorStop(0, `rgba(110,235,210,${0.1 + 0.35 * this.urnPulse})`);
      g.addColorStop(1, "rgba(110,235,210,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.fillRect(urn.x - r, urn.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = "source-over";
    }

    // Flash (photosensitivity-safe: a single decaying wash, never strobing).
    if (this.juice.flash > 0.01) {
      ctx.fillStyle = `rgba(200,255,240,${this.juice.flash * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }

    this.drawVignette();
    if (grain && this.grain) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      const ox = Math.floor(Math.random() * 128);
      const oy = Math.floor(Math.random() * 128);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = this.grain;
      ctx.fillRect(0, 0, w + 128, h + 128);
      ctx.restore();
    }
  }

  private drawParticles(accent: readonly [number, number, number], glow: boolean): void {
    const { ctx } = this;
    const p = this.particles;
    const weather = this.weather;
    ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
    for (let i = 0; i < p.count; i++) {
      const fade = Math.min(1, p.life[i]! / 0.5, (p.maxLife[i]! - p.life[i]!) / 0.3 + 0.2);
      const x = p.x[i]!;
      const y = p.y[i]!;
      const s = p.size[i]!;
      if (p.kind[i] === KIND_SOUL) {
        ctx.fillStyle = `rgba(150,245,225,${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
        if (glow) {
          ctx.fillStyle = `rgba(110,235,210,${0.18 * fade})`;
          ctx.beginPath();
          ctx.arc(x, y, s * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === "rain" || weather === "drips") {
        ctx.strokeStyle = `rgba(170,190,220,${0.22 * fade})`;
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.vx[i]! * 0.018, y - p.vy[i]! * 0.018);
        ctx.stroke();
      } else {
        const a = (weather === "sparks" || weather === "embers" ? 0.7 : 0.28) * fade;
        ctx.fillStyle = rgb(accent, a);
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  private drawVignette(): void {
    const { ctx, w, h } = this;
    const urgent = this.inputs.urgent;
    const beat = urgent ? Math.pow(Math.max(0, Math.sin(this.time * Math.PI * 2 * 1.2)), 8) : 0;
    const inner = Math.max(w, h) * (urgent ? 0.3 - beat * 0.03 : 0.42);
    const outer = Math.max(w, h) * 0.78;
    const g = ctx.createRadialGradient(w / 2, h * 0.45, inner, w / 2, h * 0.45, outer);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, urgent ? `rgba(40,0,4,${0.78 + beat * 0.1})` : "rgba(0,0,0,0.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  private makeGrain(): CanvasPattern | null {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!g) return null;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return this.ctx.createPattern(c, "repeat");
  }
}
