import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { hmac, randomId, verifyHmac } from "./crypto";

/** Anonymous player identity: `urn_uid=<id>.<hmac>` (httpOnly, signed). Login merge comes later. */

export const UID_COOKIE = "urn_uid";
const MAX_AGE_S = 400 * 24 * 60 * 60;

export async function readUserId(
  cookie: string | undefined,
  secret: string,
): Promise<string | null> {
  if (!cookie) return null;
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookie.slice(0, dot);
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) return null;
  return (await verifyHmac(secret, `uid:${id}`, cookie.slice(dot + 1))) ? id : null;
}

export async function issueUserCookie(id: string, secret: string): Promise<string> {
  return `${id}.${await hmac(secret, `uid:${id}`)}`;
}

/** Returns the caller's user id, minting (and setting) a new anonymous one when absent/invalid. */
export async function resolveUser<E extends { Bindings: Env }>(c: Context<E>): Promise<string> {
  const secret = c.env.SESSION_SECRET;
  const existing = await readUserId(getCookie(c, UID_COOKIE), secret);
  if (existing) return existing;
  const id = randomId();
  setCookie(c, UID_COOKIE, await issueUserCookie(id, secret), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return id;
}
