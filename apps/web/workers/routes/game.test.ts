import { dayNumber } from "@urnrun/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createApi } from "../api";

/** Route-level checks for POST /api/run across modes, against a real (local) D1. */

type Proxy = Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let proxy: Proxy;
let env: Env;
const today = dayNumber(new Date());

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  const db = proxy.env.DB;
  const sql = readFileSync(join(__dirname, "../../migrations/0001_init.sql"), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (const stmt of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await db.prepare(stmt).run();
  }
  const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);
  await db.batch([
    ...ids.map((id) =>
      db.prepare("INSERT INTO prompts (id, category, text) VALUES (?, 'heroes', ?)").bind(id, id),
    ),
    ...[today - 1, today].map((d) =>
      db
        .prepare("INSERT INTO daily_schedule (day, prompt_ids_json, published_at) VALUES (?, ?, 0)")
        .bind(d, JSON.stringify(ids)),
    ),
  ]);
  env = {
    ...proxy.env,
    RUN_TOKEN_SECRET: "test-run-secret-test-run-secret!",
    SESSION_SECRET: "test-session-secret-test-session",
  } as unknown as Env;
});

afterAll(async () => {
  await proxy?.dispose();
});

const start = async (body: unknown) => {
  const res = await createApi().request(
    "/api/run",
    { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
    env,
  );
  return {
    status: res.status,
    json: (await res.json()) as {
      ok: boolean;
      data: { day: number } | null;
      error: { code: string } | null;
    },
  };
};

describe("POST /api/run", () => {
  it("starts today's daily by default", async () => {
    const r = await start({});
    expect(r.status).toBe(200);
    expect(r.json.data?.day).toBe(today);
  });

  it("gates Free Dive behind today's daily", async () => {
    const r = await start({ mode: "free" });
    expect(r.status).toBe(403);
    expect(r.json.error?.code).toBe("daily_first");
  });

  it("replays a past day and refuses today or a missing day", async () => {
    const past = await start({ mode: "archive", day: today - 1 });
    expect(past.status).toBe(200);
    expect(past.json.data?.day).toBe(today - 1);
    expect((await start({ mode: "archive", day: today })).json.error?.code).toBe("not_archived");
    expect((await start({ mode: "archive" })).status).toBe(400);
  });

  it("rejects unknown modes", async () => {
    expect((await start({ mode: "lobby" })).status).toBe(400);
  });
});
