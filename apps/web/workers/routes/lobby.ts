import { Hono, type Context } from "hono";
import { z } from "zod";
import { fail, ok } from "../envelope";
import { hmac } from "../lib/crypto";
import { resolveUser } from "../lib/identity";

/** Séance lobbies: create a room, look one up, and upgrade to its WebSocket (SPEC §6.6). */

type LobbyEnv = { Bindings: Env };

/** No vowels or look-alikes: codes can't spell words and are easy to read aloud. */
export const CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
export const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{5}$/;

export function newCode(rand: () => number = Math.random): string {
  return Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(rand() * 20)]).join("");
}

/** Display names: printable, trimmed, 1–20 chars; falls back to "Courier". */
export function cleanName(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const cleaned = s
    .normalize("NFKC")
    .replace(/[\p{C}<>]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  return cleaned || "Courier";
}

/** Lobby-scoped player id: never exposes the anonymous cookie id to other players. */
async function playerId(c: Context<LobbyEnv>, code: string): Promise<string> {
  const uid = await resolveUser(c);
  return (await hmac(c.env.SESSION_SECRET, `lobby:${code}:${uid}`)).slice(0, 16);
}

const stub = (env: Env, code: string) => env.LOBBY.get(env.LOBBY.idFromName(code));

const CreateBody = z.object({ name: z.string().max(60).optional() });

export function lobbyRoutes() {
  const app = new Hono<LobbyEnv>();

  app.post("/lobby", async (c) => {
    const limiter = c.env.GUESS_LIMITER;
    if (limiter && !(await limiter.limit({ key: `lobby:${await resolveUser(c)}` })).success) {
      return c.json(fail("rate_limited", "Slow down, courier"), 429);
    }
    const { name } = CreateBody.parse(await c.req.json().catch(() => ({})));
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = newCode();
      const res = await stub(c.env, code).fetch(`https://lobby/init?code=${code}`, {
        method: "POST",
        headers: { "x-urn-player": await playerId(c, code), "x-urn-name": cleanName(name) },
      });
      if (res.ok) return c.json(ok({ code }));
    }
    return c.json(fail("busy", "Couldn't open a room — try again"), 503);
  });

  app.get("/lobby/:code", async (c) => {
    const code = c.req.param("code").toUpperCase();
    if (!CODE_RE.test(code)) return c.json(fail("not_found", "No séance with that code"), 404);
    const res = await stub(c.env, code).fetch("https://lobby/info", {
      headers: { "x-urn-player": await playerId(c, code) },
    });
    const info = (await res.json()) as { exists: boolean; phase?: string; players?: number };
    if (!info.exists) return c.json(fail("not_found", "No séance with that code"), 404);
    c.header("cache-control", "no-store");
    return c.json(ok(info));
  });

  app.get("/lobby/:code/ws", async (c) => {
    if (c.req.header("Upgrade") !== "websocket") {
      return c.json(fail("bad_request", "Expected a WebSocket"), 426);
    }
    const code = c.req.param("code").toUpperCase();
    if (!CODE_RE.test(code)) return c.json(fail("not_found", "No séance with that code"), 404);
    const headers = new Headers(c.req.raw.headers);
    headers.set("x-urn-player", await playerId(c, code));
    headers.set("x-urn-name", cleanName(c.req.query("name")));
    return stub(c.env, code).fetch(new Request("https://lobby/ws", { headers }));
  });

  return app;
}
