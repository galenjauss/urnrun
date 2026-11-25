import { Hono } from "hono";
import { dayNumber, nextResetAt } from "@urnrun/core";
import { fail, ok } from "./envelope";
import { gameRoutes } from "./routes/game";
import { lobbyRoutes } from "./routes/lobby";

export { fail, ok, type Envelope } from "./envelope";

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

  api.route("/", gameRoutes());
  api.route("/", lobbyRoutes());

  api.notFound((c) => c.json(fail("not_found", "Unknown API route"), 404));

  api.onError((err, c) => {
    console.error("api_error", { path: c.req.path, message: err.message });
    return c.json(fail("internal", "Something went wrong"), 500);
  });

  return api;
}
