/**
 * Day numbering for the Daily Dive. Every player shares one puzzle per UTC day.
 * Day 1 = launch day. Change DAY_ONE_UTC if the launch date moves (before launch only).
 */

export const MS_PER_DAY = 86_400_000;

/** 00:00 UTC on launch day (target: 2026-12-09, ≈ Day 14 of the build plan). */
export const DAY_ONE_UTC: number = Date.UTC(2026, 11, 9);

/** 1-based day number for `now`; values ≤ 0 mean "before launch". */
export function dayNumber(now: Date, epochUtc: number = DAY_ONE_UTC): number {
  return Math.floor((now.getTime() - epochUtc) / MS_PER_DAY) + 1;
}

/** 00:00 UTC at the start of the given day number. */
export function dayStart(day: number, epochUtc: number = DAY_ONE_UTC): Date {
  return new Date(epochUtc + (day - 1) * MS_PER_DAY);
}

/** The next 00:00 UTC strictly after `now` (when the Daily resets). */
export function nextResetAt(now: Date): Date {
  const startOfToday = Math.floor(now.getTime() / MS_PER_DAY) * MS_PER_DAY;
  return new Date(startOfToday + MS_PER_DAY);
}
