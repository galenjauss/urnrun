import { Hono } from "hono";
import { dayNumber, nextResetAt } from "@urnrun/core";

/** Consistent API envelope (SPEC §6.4). */
export type Envelope<T> =
  | { ok: true; data: T; error: null; meta?: Record<string, unknown> }
  | { ok: false; data: null; error: { code: string; message: string } };

export const ok = <T>(data: T, meta?: Record<string, unknown>): Envelope<T> =>
  meta ? { ok: true, data, error: null, meta } : { ok: true, data, error: null };

export const fail = (code: string, message: string): Envelope<never> => ({
  ok: false,
  data: null,
  error: { code, message },
});

export function createApi() {
  const api = new Hono<{ Bindings: Env }>().basePath("/api");

  api.get("/health", (c) => {
    const now = new Date();
    return c.json(
      ok({
        status: "ok",
        day: Math.max(dayNumber(now), 0),
        launched: dayNumber(now) >= 1,
        nextResetAt: nextResetAt(now).toISOString(),
      }),
    );
  });

  api.notFound((c) => c.json(fail("not_found", "Unknown API route"), 404));

  api.onError((err, c) => {
    console.error("api_error", { path: c.req.path, message: err.message });
    return c.json(fail("internal", "Something went wrong"), 500);
  });

  return api;
}
