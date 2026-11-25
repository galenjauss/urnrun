import { createRequestHandler } from "react-router";
import { createApi } from "./api";

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
    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
