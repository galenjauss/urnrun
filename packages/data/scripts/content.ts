/**
 * pnpm --filter @urnrun/data content [--drafts] [--start-day N] [--days N] [--no-repeat N] [--seed S]
 *
 * Compiles content/prompts/*.yaml (PRIVATE repo, git-ignored here) against the latest data
 * snapshot, builds the daily schedule and writes content/build/seed.sql for
 * `wrangler d1 execute urnrun-db --remote --file ../../content/build/seed.sql`.
 * Already-published days (content/schedule/published.json) are never rewritten.
 */
import { buildSchedule, dayNumber, type ScheduledDay } from "@urnrun/core";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { compilePrompt, parsePromptFile, type CompiledPrompt } from "../src/prompts";
import { sqlInsert } from "../src/sql";
import type { Snapshot } from "../src/transform";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CONTENT = join(ROOT, "content");
const DATA = join(ROOT, "packages", "data", "data");

const { values: args } = parseArgs({
  options: {
    drafts: { type: "boolean", default: false },
    "start-day": { type: "string" },
    days: { type: "string", default: "60" },
    "no-repeat": { type: "string", default: "30" },
    seed: { type: "string", default: "urnrun-v1" },
  },
});

async function loadSnapshot(): Promise<Snapshot> {
  const pointer = JSON.parse(await readFile(join(DATA, "latest.json"), "utf8")) as { file: string };
  return JSON.parse(await readFile(join(DATA, pointer.file), "utf8")) as Snapshot;
}

async function loadGlobalAliases(): Promise<Record<string, string[]>> {
  const path = join(CONTENT, "aliases.yaml");
  if (!existsSync(path)) return {};
  const parsed = z
    .record(z.string(), z.array(z.string()))
    .safeParse(parseYaml(await readFile(path, "utf8")));
  if (!parsed.success) throw new Error(`aliases.yaml: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
}

async function loadPrompts(snapshot: Snapshot): Promise<CompiledPrompt[]> {
  const globalAliases = await loadGlobalAliases();
  const dir = join(CONTENT, "prompts");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();
  const compiled: CompiledPrompt[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const name of files) {
    try {
      const file = parsePromptFile(await readFile(join(dir, name), "utf8"), name);
      if (file.status === "retired" || (file.status === "draft" && !args.drafts)) continue;
      if (seen.has(file.id)) throw new Error(`${name}: duplicate id ${file.id}`);
      seen.add(file.id);
      compiled.push(compilePrompt(file, snapshot, globalAliases));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (errors.length) throw new Error(`Prompt validation failed:\n- ${errors.join("\n- ")}`);
  return compiled;
}

async function loadPublished(): Promise<ScheduledDay[]> {
  const path = join(CONTENT, "schedule", "published.json");
  return existsSync(path) ? (JSON.parse(await readFile(path, "utf8")) as ScheduledDay[]) : [];
}

function promptSql(prompts: readonly CompiledPrompt[]): string[] {
  const lines = [
    "DELETE FROM prompt_why_nots;",
    "DELETE FROM prompt_answers;",
    "UPDATE prompts SET active = 0;",
  ];
  for (const p of prompts) {
    lines.push(
      sqlInsert(
        "prompts",
        { id: p.id, category: p.category, text: p.text, difficulty: p.difficulty, active: 1 },
        "INSERT OR REPLACE",
      ),
    );
    for (const a of p.answers) {
      lines.push(
        sqlInsert("prompt_answers", {
          prompt_id: p.id,
          answer_id: a.id,
          display: a.display,
          aliases_json: JSON.stringify(a.aliases),
          seed_tier: a.seedTier,
          locked: a.locked,
          is_rejuv: a.isRejuvenator,
        }),
      );
    }
    for (const [guess, reason] of Object.entries(p.whyNot)) {
      lines.push(sqlInsert("prompt_why_nots", { prompt_id: p.id, guess, reason }));
    }
  }
  return lines;
}

async function main(): Promise<void> {
  const snapshot = await loadSnapshot();
  const prompts = await loadPrompts(snapshot);
  const published = await loadPublished();
  const lastPublished = published.reduce((m, d) => Math.max(m, d.day), 0);
  const today = dayNumber(new Date());
  const startDay = Number(args["start-day"] ?? Math.max(today + 1, lastPublished + 1, 1));
  if (published.length > 0 && startDay <= lastPublished)
    throw new Error(`start-day ${startDay} would rewrite published days`);

  const schedule = buildSchedule({
    prompts: prompts.map((p) => ({
      id: p.id,
      category: p.category,
      answerIds: p.answers.map((a) => a.id),
    })),
    startDay,
    days: Number(args.days),
    seed: args.seed!,
    history: published,
    noRepeatDays: Number(args["no-repeat"]),
  });

  const now = Date.now();
  const lines = [
    `-- generated ${new Date(now).toISOString()} · snapshot v${snapshot.clientVersion} · ${prompts.length} prompts`,
    ...promptSql(prompts),
    `DELETE FROM daily_schedule WHERE day >= ${startDay};`,
    ...schedule.map((d) =>
      sqlInsert("daily_schedule", {
        day: d.day,
        prompt_ids_json: JSON.stringify(d.promptIds),
        published_at: now,
      }),
    ),
  ];

  const outDir = join(CONTENT, "build");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "seed.sql"), `${lines.join("\n")}\n`);
  await writeFile(join(outDir, "compiled.json"), `${JSON.stringify(prompts, null, 1)}\n`);
  const counts = prompts.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.category]: (acc[p.category] ?? 0) + 1 }),
    {},
  );
  console.warn(
    `compiled ${prompts.length} prompts ${JSON.stringify(counts)} → days ${startDay}..${startDay + schedule.length - 1}`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
