/**
 * pnpm --filter @urnrun/data snapshot
 * Pulls Deadlock game facts from api.deadlock-api.com (MIT, no auth), validates them and writes
 * data/v{client_version}.json + data/latest.json. Contains public game facts only — no answers.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "../src/transform";

const API = "https://api.deadlock-api.com";
const TIMEOUT_MS = 30_000;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: { accept: "application/json", "user-agent": "urnrun-data-snapshot/1.0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
  return res.json();
}

async function main(): Promise<void> {
  const steamInfo = await getJson("/v1/assets/steam-info");
  const version = (steamInfo as { client_version?: number }).client_version;
  const pin = version ? `client_version=${version}` : "";
  const [heroes, items, heroStats, itemStats] = await Promise.all([
    getJson(`/v1/assets/heroes?only_active=true&${pin}`),
    getJson(`/v1/assets/items?${pin}`),
    getJson("/v1/analytics/hero-stats"),
    getJson("/v1/analytics/item-stats"),
  ]);

  const snapshot = buildSnapshot(
    { steamInfo, heroes, items, heroStats, itemStats },
    new Date().toISOString(),
  );

  await mkdir(OUT_DIR, { recursive: true });
  const body = `${JSON.stringify(snapshot, null, 1)}\n`;
  await writeFile(join(OUT_DIR, `v${snapshot.clientVersion}.json`), body);
  const pointer = {
    clientVersion: snapshot.clientVersion,
    file: `v${snapshot.clientVersion}.json`,
  };
  await writeFile(join(OUT_DIR, "latest.json"), `${JSON.stringify(pointer)}\n`);

  console.warn(
    `snapshot v${snapshot.clientVersion}: ${snapshot.heroes.length} heroes ` +
      `(${snapshot.heroes.filter((h) => h.released).length} released), ` +
      `${snapshot.abilities.length} abilities, ${snapshot.items.length} items`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
