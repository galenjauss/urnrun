/** Secrets and bindings not captured by `wrangler types` (set via `wrangler secret put`). */
interface Env {
  RUN_TOKEN_SECRET: string;
  SESSION_SECRET: string;
}
