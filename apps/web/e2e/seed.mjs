/* global process */
// Synthetic, public-safe fixture bank for E2E runs (CI can't see the private answer repo).
// Prints SQL: 14 prompts, today's + yesterday's dailies use e2e-p0..p6; p7..p13 feed Free Dive.
// Usage: node e2e/seed.mjs > .wrangler/e2e-seed.sql
export const DAY_ONE_UTC = Date.UTC(2026, 11, 9); // must equal @urnrun/core DAY_ONE_UTC (tested)
export const dayNumber = (now = new Date()) =>
  Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY_ONE_UTC) /
      86_400_000,
  ) + 1;

const CATS = ["heroes", "heroes", "heroes", "items", "items", "lore", "community"];
export const ANSWERS = [
  ["alpha", "Alpha", "trooper", 1, 0],
  ["bravo", "Bravo", "wise_guy", 0, 0],
  ["charlie", "Charlie", "guardian", 0, 0],
  ["delta", "Delta", "walker", 0, 0],
  ["echo", "Echo", "mid_boss", 0, 0],
  ["omega", "Omega", "rejuvenator", 0, 1],
];

export function seedSql(today = dayNumber()) {
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const lines = [];
  for (let i = 0; i < 14; i++) {
    const id = `e2e-p${i}`;
    lines.push(
      `INSERT OR REPLACE INTO prompts (id, category, text, difficulty, version, active) VALUES (${q(id)}, ${q(CATS[i % 7])}, ${q(`E2E prompt ${i}: name a phonetic letter`)}, 2, 1, 1);`,
    );
    for (const [aid, display, tier, locked, rejuv] of ANSWERS) {
      lines.push(
        `INSERT OR REPLACE INTO prompt_answers (prompt_id, answer_id, display, aliases_json, seed_tier, locked, is_rejuv) VALUES (${q(id)}, ${q(aid)}, ${q(display)}, '[]', ${q(tier)}, ${locked}, ${rejuv});`,
      );
    }
  }
  const daily = JSON.stringify(Array.from({ length: 7 }, (_, i) => `e2e-p${i}`));
  for (const d of [today - 1, today]) {
    lines.push(
      `INSERT OR REPLACE INTO daily_schedule (day, prompt_ids_json, published_at) VALUES (${d}, ${q(daily)}, 0);`,
    );
  }
  return lines.join("\n") + "\n";
}

// Run directly: print the SQL (imports in tests don't trigger this).
if (process.argv[1]?.endsWith("seed.mjs")) {
  process.stdout.write(seedSql());
}
