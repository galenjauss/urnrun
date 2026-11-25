import { MAX_GUESS_LENGTH } from "@urnrun/core";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { fail, ok } from "../envelope";
import { createD1Repo } from "../game/d1-repo";
import { createGameService, GameError, type GameService } from "../game/service";
import { resolveUser } from "../lib/identity";

type AppEnv = { Bindings: Env; Variables: { userId: string; game: GameService } };

const RunParams = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{22}$/) });
const RoundParams = RunParams.extend({ idx: z.coerce.number().int().min(0).max(6) });
const GuessBody = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_GUESS_LENGTH * 2),
  confirm: z.string().min(1).max(64).optional(),
});
const StartBody = z.object({ mode: z.literal("daily") });

function token(c: Context<AppEnv>): string {
  const t = c.req.header("x-run-token");
  if (!t || t.length > 128) throw new GameError("forbidden", 403, "Missing run token");
  return t;
}

async function limited(c: Context<AppEnv>): Promise<boolean> {
  const limiter = c.env.GUESS_LIMITER;
  if (!limiter) return false;
  const { success } = await limiter.limit({ key: c.get("userId") });
  return !success;
}

export function gameRoutes() {
  const app = new Hono<AppEnv>();

  const setup = async (c: Context<AppEnv>, next: () => Promise<void>) => {
    c.set("userId", await resolveUser(c));
    c.set(
      "game",
      createGameService({
        repo: createD1Repo(c.env.DB),
        secret: c.env.RUN_TOKEN_SECRET,
        now: Date.now,
        shareUrl: new URL(c.req.url).origin,
      }),
    );
    await next();
    c.header("cache-control", "no-store");
  };
  for (const path of ["/today", "/run", "/run/*"]) app.use(path, setup);

  app.onError((err, c) => {
    if (err instanceof GameError) return c.json(fail(err.code, err.message), err.status);
    if (err instanceof z.ZodError) return c.json(fail("bad_request", "Invalid request"), 400);
    console.error("game_error", { path: c.req.path, message: err.message });
    return c.json(fail("internal", "Something went wrong"), 500);
  });

  app.get("/today", async (c) => c.json(ok(await c.get("game").today(c.get("userId")))));

  app.post("/run", async (c) => {
    StartBody.parse(await c.req.json().catch(() => ({})));
    return c.json(ok(await c.get("game").startDaily(c.get("userId"))));
  });

  app.post("/run/:id/round/:idx/serve", async (c) => {
    const { id, idx } = RoundParams.parse(c.req.param());
    if (await limited(c)) return c.json(fail("rate_limited", "Slow down, courier"), 429);
    return c.json(ok(await c.get("game").serveRound(c.get("userId"), id, token(c), idx)));
  });

  app.post("/run/:id/round/:idx/guess", async (c) => {
    const { id, idx } = RoundParams.parse(c.req.param());
    const body = GuessBody.parse(await c.req.json().catch(() => ({})));
    if (await limited(c)) return c.json(fail("rate_limited", "Slow down, courier"), 429);
    const result = await c
      .get("game")
      .guess(c.get("userId"), id, token(c), idx, body.text, body.confirm);
    return c.json(ok(result));
  });

  app.post("/run/:id/round/:idx/expire", async (c) => {
    const { id, idx } = RoundParams.parse(c.req.param());
    return c.json(ok(await c.get("game").expireRound(c.get("userId"), id, token(c), idx)));
  });

  app.post("/run/:id/finish", async (c) => {
    const { id } = RunParams.parse(c.req.param());
    return c.json(ok(await c.get("game").finish(c.get("userId"), id, token(c))));
  });

  return app;
}
