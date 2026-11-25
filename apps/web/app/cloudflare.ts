import { createContext } from "react-router";

/** Worker bindings for SSR loaders that read D1 (set per request in workers/app.ts). */
export const cloudflareContext = createContext<{ env: Env; ctx: ExecutionContext }>();
