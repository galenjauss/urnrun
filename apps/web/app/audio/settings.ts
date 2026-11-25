/** Audio preferences (SPEC §5.6): music 40%, SFX 80% by default; remembered per device. */

export interface AudioSettings {
  muted: boolean;
  /** 0..1 */
  sfx: number;
  /** 0..1 */
  music: number;
}

export const DEFAULT_AUDIO: AudioSettings = { muted: false, sfx: 0.8, music: 0.4 };
const KEY = "urnrun:audio:v1";

const clamp01 = (n: unknown, fallback: number): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;

export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO };
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof AudioSettings, unknown>>;
    if (!v || typeof v !== "object") return { ...DEFAULT_AUDIO };
    return {
      muted: typeof v.muted === "boolean" ? v.muted : DEFAULT_AUDIO.muted,
      sfx: clamp01(v.sfx, DEFAULT_AUDIO.sfx),
      music: clamp01(v.music, DEFAULT_AUDIO.music),
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    return parseAudioSettings(globalThis.localStorage?.getItem(KEY) ?? null);
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

export function saveAudioSettings(s: AudioSettings): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode / quota: preference is a convenience.
  }
}

/** Random pitch factor within ±spread (typing ticks use ±6%). */
export const jitter = (spread: number, rand: () => number = Math.random): number =>
  1 + (rand() * 2 - 1) * spread;
