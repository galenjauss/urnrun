import { rgb, type Motif, type RGB, type ZoneLook } from "./zones";

/**
 * Procedural parallax layers, one painter per zone motif. Everything is drawn as dark ink
 * silhouettes with accent-colored light sources, tiled vertically so the camera can descend
 * forever. Painters keep the centre column quiet: the prompt card and Urn live there.
 */

export interface LayerCtx {
  ctx: CanvasRenderingContext2D;
  look: ZoneLook;
  w: number;
  h: number;
  /** Vertical scroll for this layer, in px (already multiplied by the parallax factor). */
  scroll: number;
  /** 0 = far, 1 = mid, 2 = near. */
  layer: number;
  /** Scene time in seconds (for flicker and rotation). */
  t: number;
  glow: boolean;
}

/** Deterministic hash → [0, 1). */
export const hash = (n: number): number => {
  const s = Math.sin(n * 91.345 + 17.17) * 47453.5453;
  return s - Math.floor(s);
};

const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

/** Iterate tiles of height `period` covering the viewport for a given scroll. */
function tiles(l: LayerCtx, period: number, fn: (y: number, index: number) => void): void {
  const offset = ((l.scroll % period) + period) % period;
  const first = Math.floor(l.scroll / period);
  for (let k = -1; k * period - offset < l.h + period; k++) {
    fn(k * period - offset, first + k);
  }
}

/** Soft light: additive radial gradient. */
export function light(l: LayerCtx, x: number, y: number, r: number, c: RGB, a: number): void {
  if (!l.glow || a <= 0.002) return;
  const g = l.ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(c, a));
  g.addColorStop(1, rgb(c, 0));
  const prev = l.ctx.globalCompositeOperation;
  l.ctx.globalCompositeOperation = "lighter";
  l.ctx.fillStyle = g;
  l.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  l.ctx.globalCompositeOperation = prev;
}

const layerInk = (l: LayerCtx): string =>
  rgb(shade(l.look.ink, [2.4, 1.5, 1][l.layer] ?? 1), [0.55, 0.8, 1][l.layer] ?? 1);

const sideWidth = (l: LayerCtx): number => l.w * [0.16, 0.2, 0.14][l.layer]! + 12;

function flicker(t: number, seed: number): number {
  const f = Math.sin(t * (7 + seed * 5) + seed * 40) * 0.5 + 0.5;
  return hash(Math.floor(t * 9 + seed * 100)) > 0.94 ? 0.35 : 0.75 + f * 0.25;
}

const PAINTERS: Readonly<Record<Motif, (l: LayerCtx) => void>> = {
  street(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l) * 1.4;
    const period = l.h * (0.7 + l.layer * 0.25);
    ctx.fillStyle = layerInk(l);
    tiles(l, period, (y, i) => {
      for (const side of [0, 1]) {
        const bw = sw * (0.7 + hash(i * 3 + side) * 0.5);
        const x = side === 0 ? 0 : w - bw;
        ctx.fillRect(x, y, bw, period + 1);
        // Lit windows.
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 3; c++) {
            const s = hash(i * 97 + side * 13 + r * 7 + c);
            if (s < 0.55) continue;
            const wx = x + 8 + c * ((bw - 16) / 3);
            const wy = y + 16 + r * (period / 6.5);
            ctx.fillStyle = rgb(l.look.accent, 0.12 + 0.3 * flicker(l.t, s) * (l.layer / 2));
            ctx.fillRect(wx, wy, Math.max(3, bw / 9), 6 + l.layer * 2);
          }
        }
        ctx.fillStyle = layerInk(l);
      }
      if (l.layer === 1 && hash(i) > 0.4) {
        // Neon speakeasy sign glow.
        const nx = hash(i * 5) > 0.5 ? sw * 0.9 : w - sw * 0.9;
        light(l, nx, y + period * 0.35, 90, l.look.accent, 0.22 * flicker(l.t, hash(i * 7)));
      }
    });
  },

  tile(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l);
    const size = 10 + l.layer * 6;
    const period = size * 8;
    tiles(l, period, (y, i) => {
      for (const x0 of [0, w - sw]) {
        ctx.fillStyle = layerInk(l);
        ctx.fillRect(x0, y, sw, period + 1);
        ctx.strokeStyle = rgb(shade(l.look.skyTop, 1.6), 0.25 + l.layer * 0.1);
        ctx.lineWidth = 1;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c * size < sw; c++) {
            ctx.strokeRect(x0 + c * size + (r % 2) * (size / 2), y + r * size, size, size * 0.5);
          }
        }
      }
      if (l.layer === 2 && hash(i) > 0.3) {
        const bx = hash(i * 3) > 0.5 ? sw + 10 : w - sw - 10;
        light(l, bx, y + period / 2, 70, l.look.accent, 0.3 * flicker(l.t, hash(i)));
      }
    });
  },

  arches(l) {
    const { ctx, w } = l;
    const period = l.h * (0.45 + l.layer * 0.18);
    ctx.strokeStyle = layerInk(l);
    tiles(l, period, (y, i) => {
      ctx.lineWidth = 10 + l.layer * 10;
      ctx.beginPath();
      ctx.moveTo(0, y + period);
      ctx.lineTo(0, y + period * 0.45);
      ctx.quadraticCurveTo(0, y, w / 2, y + period * 0.08);
      ctx.quadraticCurveTo(w, y, w, y + period * 0.45);
      ctx.lineTo(w, y + period);
      ctx.stroke();
      if (l.layer === 2 && hash(i * 11) > 0.55) {
        light(
          l,
          w * hash(i * 4),
          y + period * 0.9,
          50,
          l.look.accent,
          0.35 * flicker(l.t, hash(i)),
        );
      }
    });
  },

  barrels(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l) * 1.2;
    const r = 14 + l.layer * 9;
    const period = r * 2.2;
    tiles(l, period, (y, i) => {
      for (const side of [0, 1]) {
        const n = Math.max(1, Math.floor(sw / (r * 2)));
        for (let k = 0; k < n; k++) {
          const cx = side === 0 ? r + k * r * 2 : w - r - k * r * 2;
          const cy = y + r + ((k + i) % 2) * 2;
          ctx.fillStyle = layerInk(l);
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.95, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = rgb(shade(l.look.accent, 0.35), 0.25 + l.layer * 0.1);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * 0.62, r * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (l.layer === 1 && hash(i * 9) > 0.7) {
        light(l, w / 2, y, 140, l.look.accent, 0.07);
      }
    });
  },

  pipes(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l);
    const period = l.h * 0.5;
    tiles(l, period, (y, i) => {
      ctx.fillStyle = layerInk(l);
      for (const side of [0, 1]) {
        const count = 2 + l.layer;
        for (let k = 0; k < count; k++) {
          const pw = 6 + l.layer * 5;
          const x = side === 0 ? 4 + k * (sw / count) : w - 4 - pw - k * (sw / count);
          ctx.fillRect(x, y, pw, period + 1);
          ctx.fillRect(x - 3, y + period * hash(i * 7 + k), pw + 6, 6);
        }
        if (hash(i * 3 + side) > 0.5) {
          const yy = y + period * hash(i + side);
          ctx.fillRect(side === 0 ? 0 : w - sw, yy, sw, 8 + l.layer * 4);
        }
      }
      if (l.layer === 2) {
        light(l, hash(i) > 0.5 ? sw : w - sw, y + period * 0.5, 80, l.look.accent, 0.18);
      }
    });
  },

  niches(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l) * 1.2;
    const period = 70 + l.layer * 40;
    tiles(l, period, (y, i) => {
      for (const x0 of [0, w - sw]) {
        ctx.fillStyle = layerInk(l);
        ctx.fillRect(x0, y, sw, period + 1);
        // Arched niche, cut back to the sky colour.
        const nw = sw * 0.5;
        const nx = x0 + sw * 0.25;
        ctx.fillStyle = rgb(shade(l.look.skyBottom, 0.9));
        ctx.beginPath();
        ctx.moveTo(nx, y + period * 0.85);
        ctx.lineTo(nx, y + period * 0.35);
        ctx.arc(nx + nw / 2, y + period * 0.35, nw / 2, Math.PI, 0);
        ctx.lineTo(nx + nw, y + period * 0.85);
        ctx.fill();
        if (hash(i * 13 + x0) > 0.45) {
          light(
            l,
            nx + nw / 2,
            y + period * 0.7,
            26 + l.layer * 10,
            l.look.accent,
            0.4 * flicker(l.t, hash(i + x0)),
          );
        }
      }
    });
  },

  gears(l) {
    const { ctx, w } = l;
    const period = l.h * (0.42 + l.layer * 0.12);
    tiles(l, period, (y, i) => {
      const r = 26 + l.layer * 22 + hash(i) * 20;
      const cx = hash(i * 3) > 0.5 ? r * 0.4 : w - r * 0.4;
      const cy = y + period * hash(i * 5);
      const dir = hash(i * 7) > 0.5 ? 1 : -1;
      const teeth = 10 + Math.floor(r / 8);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(l.t * 0.25 * dir * (1 - l.layer * 0.25));
      ctx.fillStyle = layerInk(l);
      ctx.beginPath();
      for (let k = 0; k < teeth * 2; k++) {
        const a = (k / (teeth * 2)) * Math.PI * 2;
        const rr = k % 2 === 0 ? r : r * 0.84;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgb(shade(l.look.accent, 0.4), 0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  },

  ink(l) {
    const { ctx, w } = l;
    const period = l.h * 0.6;
    tiles(l, period, (y, i) => {
      for (let k = 0; k < 3; k++) {
        const s = hash(i * 17 + k);
        const x = (s < 0.5 ? s * 0.4 : 0.6 + s * 0.4) * w;
        const yy = y + period * hash(i * 23 + k) + Math.sin(l.t * 0.4 + s * 9) * 12;
        const r = 40 + l.layer * 30 + s * 40;
        const g = ctx.createRadialGradient(x, yy, 0, x, yy, r);
        g.addColorStop(0, rgb(l.look.ink, 0.6));
        g.addColorStop(1, rgb(l.look.ink, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, yy - r, r * 2, r * 2);
      }
      if (l.layer === 1) light(l, w * hash(i * 29), y, 110, l.look.accent, 0.1);
    });
  },

  gates(l) {
    const { ctx, w } = l;
    const sw = sideWidth(l) * 1.3;
    const period = l.h * 0.55;
    tiles(l, period, (y) => {
      ctx.fillStyle = layerInk(l);
      for (const side of [0, 1]) {
        const x0 = side === 0 ? 0 : w - sw;
        const bars = 3 + l.layer;
        for (let k = 0; k < bars; k++) {
          ctx.fillRect(x0 + (k + 0.5) * (sw / bars) - 2, y, 4 + l.layer * 2, period + 1);
        }
        // Chevrons (deco stepped band).
        ctx.beginPath();
        ctx.moveTo(x0, y + period * 0.4);
        ctx.lineTo(x0 + sw / 2, y + period * 0.32);
        ctx.lineTo(x0 + sw, y + period * 0.4);
        ctx.lineTo(x0 + sw, y + period * 0.45);
        ctx.lineTo(x0 + sw / 2, y + period * 0.37);
        ctx.lineTo(x0, y + period * 0.45);
        ctx.fill();
      }
      if (l.layer === 2) light(l, w / 2, y + period * 0.4, w * 0.35, l.look.accent, 0.08);
    });
  },

  sunburst(l) {
    const { ctx, w, h } = l;
    if (l.layer !== 0) return;
    const cx = w / 2;
    const cy = h * 1.05;
    const rays = 28;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(l.t * 0.03);
    for (let k = 0; k < rays; k++) {
      const a = (k / rays) * Math.PI * 2;
      ctx.fillStyle = rgb(l.look.accent, k % 2 === 0 ? 0.07 : 0.03);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, h * 1.4, a, a + Math.PI / rays);
      ctx.fill();
    }
    ctx.restore();
    light(l, cx, cy - h * 0.1, h * 0.7, l.look.accent, 0.25);
  },
};

export const paint = (l: LayerCtx): void => PAINTERS[l.look.motif](l);
