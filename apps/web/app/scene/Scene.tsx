import type { Tier } from "@urnrun/core";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { getPrefs, subscribePrefs } from "../game/prefs";
import type { Quality } from "./quality";
import { SceneRenderer, type SceneInputs } from "./renderer";

export interface ScenePulse {
  /** Increments per reveal so the same tier twice still fires. */
  seq: number;
  tier: Tier | null;
}

interface SceneProps {
  depth: number;
  urgent: boolean;
  pulse: ScenePulse | null;
  /** Ceremony beat: re-fires when `seq` changes. */
  ceremony?: { seq: number; level: number } | null;
  /** CSS selector for the element soul particles fly into. */
  urnSelector?: string;
}

function startQuality(): Quality {
  const nav = globalThis.navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav?.connection?.saveData) return 0;
  if ((nav?.deviceMemory ?? 8) <= 2 || (nav?.hardwareConcurrency ?? 8) <= 2) return 0;
  if ((nav?.hardwareConcurrency ?? 8) <= 4) return 1;
  return 2;
}

/**
 * The descent: a full-viewport canvas behind the DOM game layer. Purely decorative
 * (aria-hidden); if Canvas 2D is unavailable the CSS background remains.
 */
export function Scene({
  depth,
  urgent,
  pulse,
  ceremony = null,
  urnSelector = ".urn-meter svg",
}: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const inputs = useRef<SceneInputs>({ depth, urgent, reducedMotion: false, urn: null });
  const lowPower = useSyncExternalStore(
    subscribePrefs,
    () => getPrefs().lowPower,
    () => false,
  );
  useEffect(() => {
    inputs.current.depth = depth;
    inputs.current.urgent = urgent;
    inputs.current.lowPower = lowPower;
  }, [depth, urgent, lowPower]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    inputs.current.reducedMotion = motion?.matches ?? false;
    const onMotion = (e: MediaQueryListEvent) => {
      inputs.current.reducedMotion = e.matches;
    };
    motion?.addEventListener?.("change", onMotion);

    let renderer: SceneRenderer;
    try {
      renderer = new SceneRenderer(canvas, inputs.current, startQuality());
    } catch {
      return () => motion?.removeEventListener?.("change", onMotion);
    }
    rendererRef.current = renderer;
    renderer.start();
    if (import.meta.env.DEV) {
      // Dev-only handle for visual checks (jump depth, fire reveals). Stripped from prod builds.
      (globalThis as { __urnScene?: unknown }).__urnScene = { renderer, inputs: inputs.current };
    }

    const locateUrn = () => {
      const el = document.querySelector(urnSelector);
      if (!el) {
        inputs.current.urn = null;
        return;
      }
      const r = el.getBoundingClientRect();
      inputs.current.urn = { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    };
    locateUrn();
    const urnTimer = setInterval(locateUrn, 500);
    const ro = new ResizeObserver(() => {
      renderer.resize();
      locateUrn();
    });
    ro.observe(canvas);

    return () => {
      clearInterval(urnTimer);
      ro.disconnect();
      motion?.removeEventListener?.("change", onMotion);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [urnSelector]);

  const seq = pulse?.seq;
  useEffect(() => {
    if (seq === undefined || !pulse) return;
    rendererRef.current?.kick(pulse.tier);
    // Fire once per reveal sequence number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  const ceremonySeq = ceremony?.seq;
  useEffect(() => {
    if (ceremonySeq === undefined || !ceremony) return;
    rendererRef.current?.ceremony(ceremony.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonySeq]);

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}
