import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dive", "routes/dive.tsx"),
  route("how-to-play", "routes/how-to-play.tsx"),
  route("about", "routes/about.tsx"),
  route("faq", "routes/faq.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("ledger", "routes/ledger-index.tsx"),
  route("ledger/:day", "routes/ledger-day.tsx"),
  route("s/:day/:code", "routes/share-card.tsx"),
  route("stats", "routes/stats.tsx"),
  route("lobby", "routes/lobby.tsx"),
  route("lobby/:code", "routes/lobby-room.tsx"),
  route("robots.txt", "routes/robots[.]txt.ts"),
  route("sitemap.xml", "routes/sitemap[.]xml.ts"),
] satisfies RouteConfig;
