/** Display preferences (SPEC §3.13): low-power mode halves particles and caps at 30 fps. */

export interface Prefs {
  lowPower: boolean;
}

const KEY = "urnrun:prefs:v1";
const DEFAULT: Prefs = { lowPower: false };

export function parsePrefs(raw: string | null): Prefs {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Record<keyof Prefs, unknown>>) : null;
    return { lowPower: typeof v?.lowPower === "boolean" ? v.lowPower : DEFAULT.lowPower };
  } catch {
    return { ...DEFAULT };
  }
}

let current: Prefs | null = null;
const listeners = new Set<() => void>();

export function getPrefs(): Prefs {
  if (!current) {
    let raw: string | null = null;
    try {
      raw = globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      raw = null;
    }
    current = parsePrefs(raw);
  }
  return current;
}

export function setPrefs(patch: Partial<Prefs>): void {
  current = { ...getPrefs(), ...patch };
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(current));
  } catch {
    // Convenience only.
  }
  for (const l of listeners) l();
}

export function subscribePrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
