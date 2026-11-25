import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import type { ScenePulse } from "../scene/Scene";
import type { DiveState } from "./machine";

const URGENT_MS = 5000;

/**
 * Bridges the dive state machine to the scene and audio: one pulse + tier voice per reveal,
 * a heartbeat each second of the last five, and a reject blip for wrong guesses.
 */
export function useDiveFx(
  state: DiveState,
  now: number,
): { pulse: ScenePulse | null; urgent: boolean } {
  const { phase, lastIdx, slots, current, feedback } = state;
  const [pulse, setPulse] = useState<ScenePulse | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    audio.init();
    const unlock = () => audio.unlock();
    globalThis.addEventListener("pointerdown", unlock, { passive: true });
    globalThis.addEventListener("keydown", unlock);
    return () => {
      globalThis.removeEventListener("pointerdown", unlock);
      globalThis.removeEventListener("keydown", unlock);
    };
  }, []);

  const revealSlot = phase === "reveal" && lastIdx !== null ? slots[lastIdx] : undefined;
  useEffect(() => {
    if (!revealSlot) return;
    const tier = revealSlot.status === "answered" ? revealSlot.tier : null;
    seq.current += 1;
    setPulse({ seq: seq.current, tier });
    audio.tier(tier);
    // One beat per reveal of a given round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastIdx]);

  const remaining = current ? current.deadline - now : Infinity;
  const urgent = phase === "answering" && remaining > 0 && remaining <= URGENT_MS;
  const second = urgent ? Math.ceil(remaining / 1000) : 0;
  useEffect(() => {
    if (second > 0) audio.heartbeat();
  }, [second]);

  const invalidSeq = feedback?.kind === "invalid" ? feedback.seq : null;
  useEffect(() => {
    if (invalidSeq !== null || feedback?.kind === "whyNot") audio.reject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidSeq, feedback?.kind === "whyNot" ? feedback.guess : null]);

  return { pulse, urgent };
}
