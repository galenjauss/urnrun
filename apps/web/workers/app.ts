import { RouterContextProvider, createRequestHandler } from "react-router";
import { cloudflareContext } from "../app/cloudflare";
import { createApi } from "./api";
import { recomputeRarity } from "./game/rarity-job";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const api = createApi();

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return api.fetch(request, env, ctx);
    }
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      recomputeRarity(env.DB).catch((err: unknown) => {
        console.error("rarity_job_failed", err instanceof Error ? err.message : err);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
