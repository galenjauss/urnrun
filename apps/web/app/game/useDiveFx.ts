import { ZONES, zoneFor } from "@urnrun/core";
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import type { ScenePulse } from "../scene/Scene";
import { totalSouls, type DiveState } from "./machine";

export interface Arrival {
  seq: number;
  name: string;
}

/** Small beat after the reveal clears before the arrival lands. */
const ARRIVAL_DELAY_MS = 250;

const URGENT_MS = 5000;

/**
 * Bridges the dive state machine to the scene and audio: one pulse + tier voice per reveal,
 * a heartbeat each second of the last five, a reject blip for wrong guesses, zone arrivals
 * (banner + stinger) and the zone's ambience bed while a dive is in progress.
 */
export function useDiveFx(
  state: DiveState,
  now: number,
): { pulse: ScenePulse | null; urgent: boolean; arrival: Arrival | null } {
  const { phase, lastIdx, slots, current, feedback } = state;
  const [pulse, setPulse] = useState<ScenePulse | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const seq = useRef(0);
  const arrivalSeq = useRef(0);
  const prevZone = useRef<number | null>(null);

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

  const zoneIdx = ZONES.indexOf(zoneFor(totalSouls(slots)));
  const [pendingZone, setPendingZone] = useState<number | null>(null);
  useEffect(() => {
    const prev = prevZone.current;
    prevZone.current = zoneIdx;
    if (prev !== null && zoneIdx > prev) setPendingZone(zoneIdx);
  }, [zoneIdx]);

  // Announce the arrival once the tier stamp has cleared, so the two never overlap.
  const revealing = phase === "reveal";
  useEffect(() => {
    if (pendingZone === null || revealing) return;
    const timer = setTimeout(() => {
      arrivalSeq.current += 1;
      setArrival({ seq: arrivalSeq.current, name: ZONES[pendingZone]!.name });
      setPendingZone(null);
      audio.stinger(pendingZone);
    }, ARRIVAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingZone, revealing]);

  const diving = phase !== "boot" && phase !== "howto" && phase !== "closed" && phase !== "error";
  useEffect(() => {
    if (diving) audio.ambience(zoneIdx);
  }, [diving, zoneIdx]);
  useEffect(() => () => audio.stopAmbience(), []);

  return { pulse, urgent, arrival };
}
