import { useEffect, useState } from "react";

/** Animate a number from 0 up to `target` with an ease-out curve (instant under reduced motion). */
export function useRollUp(target: number, durationMs = 1400, delayMs = 250): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced || target <= 0) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now() + delayMs;
    const frame = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);
  return value;
}
