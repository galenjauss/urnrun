import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("dive", "routes/dive.tsx")] satisfies RouteConfig;
