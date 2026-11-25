/** Per-device conveniences in localStorage. Every access is guarded: storage can throw or be empty. */

const HOWTO_KEY = "urnrun:howto:v1";
const STATS_KEY = "urnrun:stats:v1";
const MAX_HISTORY = 400;

export interface LocalStats {
  played: number;
  best: number;
  /** day → total souls */
  history: Record<string, number>;
}

const EMPTY: LocalStats = { played: 0, best: 0, history: {} };

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private mode / quota — conveniences only, safe to drop.
  }
}

export const hasSeenHowTo = (): boolean => read(HOWTO_KEY) === "1";
export const markHowToSeen = (): void => write(HOWTO_KEY, "1");

function isStats(v: unknown): v is LocalStats {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.played === "number" &&
    typeof s.best === "number" &&
    !!s.history &&
    typeof s.history === "object"
  );
}

export function loadStats(): LocalStats {
  const raw = read(STATS_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStats(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Pure: returns stats with this day's result folded in (a replayed day is not double counted). */
export function withResult(stats: LocalStats, day: number, total: number): LocalStats {
  const key = String(day);
  const isNew = !(key in stats.history);
  const entries = Object.entries({ ...stats.history, [key]: total })
    .sort(([a], [b]) => Number(b) - Number(a))
    .slice(0, MAX_HISTORY);
  return {
    played: stats.played + (isNew ? 1 : 0),
    best: Math.max(stats.best, total),
    history: Object.fromEntries(entries),
  };
}

export function recordResult(day: number, total: number): LocalStats {
  const next = withResult(loadStats(), day, total);
  write(STATS_KEY, JSON.stringify(next));
  return next;
}

const FREE_BEST_KEY = "urnrun:freebest:v1";

/** Free Dive personal best (separate from the Daily, SPEC §3.8). Returns the best after folding in. */
export function recordFreeBest(total: number): number {
  const prev = Number(read(FREE_BEST_KEY)) || 0;
  const best = Math.max(prev, total);
  if (best !== prev) write(FREE_BEST_KEY, String(best));
  return best;
}

export const loadFreeBest = (): number => Number(read(FREE_BEST_KEY)) || 0;

const ARCHIVE_BEST_KEY = "urnrun:archivebest:v1";

function loadArchiveBests(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(read(ARCHIVE_BEST_KEY) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Best replay score per archived day (SPEC §3.9). Returns the best after folding in. */
export function recordArchiveBest(day: number, total: number): number {
  const all = loadArchiveBests();
  const best = Math.max(Number(all[day]) || 0, total);
  all[day] = best;
  write(ARCHIVE_BEST_KEY, JSON.stringify(all));
  return best;
}

export const loadArchiveBest = (day: number): number => Number(loadArchiveBests()[day]) || 0;
