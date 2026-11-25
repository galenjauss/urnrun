/** Pure stats derived from the local day → souls history (stats page, SPEC §3.11). */

export interface StatsSummary {
  played: number;
  best: number;
  average: number;
  /** Consecutive days ending today (or yesterday, if today isn't played yet). */
  streak: number;
  longest: number;
  /** Oldest → newest, one entry per day in the window (null = not played). */
  recent: { day: number; souls: number | null }[];
}

export function summarize(
  history: Readonly<Record<string, number>>,
  today: number,
  window = 30,
): StatsSummary {
  const days = Object.keys(history)
    .map(Number)
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
  const totals = days.map((d) => history[d]!);
  const played = days.length;
  const best = played ? Math.max(...totals) : 0;
  const average = played ? Math.round(totals.reduce((a, b) => a + b, 0) / played) : 0;

  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1]! + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const has = new Set(days);
  let streak = 0;
  let d = has.has(today) ? today : today - 1;
  while (has.has(d)) {
    streak++;
    d--;
  }

  const recent = Array.from({ length: window }, (_, i) => {
    const day = today - window + 1 + i;
    return { day, souls: has.has(day) ? history[day]! : null };
  });
  return { played, best, average, streak, longest, recent };
}
