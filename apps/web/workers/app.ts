import { RouterContextProvider, createRequestHandler } from "react-router";
import { cloudflareContext } from "../app/cloudflare";
import { makeNonce, nonceContext, withSecurityHeaders } from "../app/security";
import { createApi } from "./api";
import { recomputeRarity } from "./game/rarity-job";
import { CARD_PNG, handleCardPng } from "./og/handler";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const api = createApi();

async function route(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  nonce: string,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return api.fetch(request, env, ctx);
  }
  if (CARD_PNG.test(pathname)) return handleCardPng(request, ctx);
  const context = new RouterContextProvider();
  context.set(cloudflareContext, { env, ctx });
  context.set(nonceContext, nonce);
  return requestHandler(request, context);
}

export default {
  async fetch(request, env, ctx) {
    const nonce = makeNonce();
    const res = await route(request, env, ctx, nonce);
    return withSecurityHeaders(res, {
      nonce,
      https: new URL(request.url).protocol === "https:",
      // Vite's dev server injects inline HMR scripts; enforce the CSP on real builds only.
      csp: !import.meta.env.DEV,
    });
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      recomputeRarity(env.DB).catch((err: unknown) => {
        console.error("rarity_job_failed", err instanceof Error ? err.message : err);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
