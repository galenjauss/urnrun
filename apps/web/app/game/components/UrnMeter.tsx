import { MAX_SOULS, zoneFor } from "@urnrun/core";
import { useEffect, useRef } from "react";
import { stepSpring, type Spring } from "../../scene/spring";
import type { Slot } from "../machine";
import { formatFt, tierView } from "../tiers";

interface UrnMeterProps {
  total: number;
  slots?: readonly Slot[];
  /** Wise Guy reveal sequence: the Urn coughs a puff of smoke each time it changes. */
  coughSeq?: number | null;
}

const URN_PATH =
  "M22 6h20l-3 6c8 4 13 11 13 20 0 13-9 22-20 23v5h8v5H24v-5h8v-5C21 54 12 45 12 32c0-9 5-16 13-20z";
/** Liquid spans y = 66 (empty) up to y = 8 (full) inside the urn's clip. */
const EMPTY_Y = 66;
const FULL_Y = 8;
const GEM_Y = 44;

function surfacePath(level: number, amp: number, t: number): string {
  const y = EMPTY_Y - level * (EMPTY_Y - FULL_Y);
  let d = `M0 80L0 ${y.toFixed(2)}`;
  for (let x = 0; x <= 64; x += 4) {
    const wave = Math.sin(x * 0.22 + t * 5.2) * amp + Math.sin(x * 0.11 - t * 3.1) * amp * 0.5;
    d += `L${x} ${(y + wave).toFixed(2)}`;
  }
  return `${d}L64 80Z`;
}

/**
 * The Urn: fills with soul-light as souls accrue. The level springs to each new total and the
 * surface sloshes with the spring's velocity (calm idle ripple otherwise). Seven gem slots on the
 * band show each round's tier — "your crown for the day".
 */
export function UrnMeter({ total, slots = [], coughSeq = null }: UrnMeterProps) {
  // Square-root curve: early souls visibly fill the Urn; a perfect dive still tops it off.
  const target = Math.sqrt(Math.min(1, Math.max(0, total) / MAX_SOULS));
  const liquidRef = useRef<SVGPathElement>(null);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const path = liquidRef.current;
    if (!path) return;
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let spring: Spring = { value: targetRef.current, velocity: 0 };
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      if (reduced) {
        spring = { value: targetRef.current, velocity: 0 };
      } else {
        // Slightly under-critical feel comes from the slosh amplitude, not overshoot.
        spring = stepSpring(spring, targetRef.current, 4.5, dt);
      }
      const slosh = reduced ? 0 : Math.min(3.2, Math.abs(spring.velocity) * 9);
      const idle = reduced || spring.value <= 0.001 ? 0 : 0.45;
      path.setAttribute("d", surfacePath(spring.value, idle + slosh, t));
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const zone = zoneFor(total).name;
  return (
    <figure
      className={`urn-meter${total >= MAX_SOULS ? " is-overflowing" : ""}`}
      aria-label={`Depth ${formatFt(total)}, ${zone}`}
    >
      {coughSeq !== null ? (
        <span key={coughSeq} className="urn-smoke" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <svg viewBox="0 0 64 80" aria-hidden="true">
        <defs>
          <clipPath id="urn-body">
            <path d={URN_PATH} />
          </clipPath>
          <linearGradient id="urn-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--soul-400)" />
            <stop offset="1" stopColor="var(--soul-600)" />
          </linearGradient>
        </defs>
        <g clipPath="url(#urn-body)">
          <rect x="0" y="0" width="64" height="80" className="urn-void" />
          <path ref={liquidRef} className="urn-liquid" d={surfacePath(target, 0, 0)} />
        </g>
        <path className="urn-outline" d={URN_PATH} />
        <path className="urn-band" d="M15.5 44.5Q32 47.5 48.5 44.5" />
        {Array.from({ length: 7 }, (_, i) => {
          const slot = slots[i];
          const closed = slot && (slot.status === "answered" || slot.status === "expired");
          const tone = closed ? tierView(slot.status === "answered" ? slot.tier : null).tone : "";
          const x = 18.5 + i * 4.5;
          const y = GEM_Y + 1.4 - Math.abs(i - 3) * 0.35;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={closed ? 1.9 : 1.5}
              className={closed ? `urn-gem tone-${tone}` : "urn-gem is-empty"}
            />
          );
        })}
      </svg>
      <figcaption>
        <span className="depth">{formatFt(total)}</span>
        <span className="zone">{zone}</span>
      </figcaption>
    </figure>
  );
}
