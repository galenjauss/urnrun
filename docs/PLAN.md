# Urn Run — Build Plan

> Companion to [`SPEC.md`](./SPEC.md). Paced for AI-assisted building (Claude builds, Galen
> directs and playtests). **Target: public launch ≈ Day 14**, with every launch mode included (D13).
> P0 = must ship at launch · P1 = ship at launch if on schedule, else ≤ 5 days after.

## Critical path
```
P0 Setup ─► P1 Core engine ─► P2 Vertical slice ─┬─► P3 Scene/juice/audio ─┐
            P1b Data+content ─────────────────────┤                         ├─► P6 Hardening ─► P7 Beta ─► LAUNCH
                                                  ├─► P4 Modes/social ──────┤
                                                  └─► P5 Lobbies ───────────┘
```
P3, P4, P5 run in parallel (separate agents/worktrees) once the vertical slice defines the contracts.
Content (P1b) runs continuously from Day 1 to launch — it's the longest pole.

---

## Phase 0 — Accounts & scaffold (Day 0–1)
**Galen (≈ 1 h, needs you):**
- [ ] Create a **new Cloudflare account** (separate from Konjo) on a new email/alias.
- [ ] Claim the account's workers.dev subdomain **`urnrun`** → game ships at `play.urnrun.workers.dev`.
- [ ] *(Deferred until traction)* Register `urnrun.gg` (Porkbun/Namecheap) + `urnrun.com` (Cloudflare Registrar).
- [ ] Create a GitHub repo (or use this one) + add Cloudflare API token as repo secret.
- [ ] Create a Discord app (OAuth) and get a Steam Web API key (for Steam OpenID profile lookups).
- [ ] Create an Anthropic API key with a small spend cap for prompt drafting.
- [ ] Reserve socials: X/Bluesky/TikTok `@urnrun`, Discord server "Urn Run".

**Claude:**
- [ ] pnpm monorepo: `apps/web` (React Router v7 + Cloudflare Workers template), `packages/core`, `packages/data`.
- [ ] TS strict, ESLint, Prettier, Vitest, Playwright, `@cloudflare/vitest-pool-workers`.
- [ ] Wrangler config: D1, KV, DO bindings (`LobbyRoom`, `DayTally`), Cron triggers, Rate Limiting.
- [ ] GitHub Actions: lint → typecheck → test → build → deploy preview (per PR) / prod (main).
- [ ] Design tokens + fonts (Limelight/Marcellus SC + Jost, subset, self-hosted).
**Exit:** "hello Urn Run" deployed at a `*.workers.dev` preview from CI.

## Phase 1 — Core engine, TDD (Day 1–3) · `packages/core`
- [ ] Seeded RNG (sfc32) + date→day-number + UTC reset helpers.
- [ ] Normalization (case, diacritics, punctuation, `&`/and, articles) + alias resolution.
- [ ] Fuzzy matcher (Damerau-Levenshtein thresholds, "did you mean" ranking, never auto-accept).
- [ ] Scoring: tier table → souls; verdict bands; zone-from-depth.
- [ ] Rarity: prior blending, live `cum`-share tiering, guards (+1/−2, locked Troopers, Wise Guy
      stickiness, n ≥ 200), snapshot-at-submit semantics.
- [ ] Schedule builder: category mix 3/2/1/1, 30-day no-repeat, overlap ≤ 60%, deterministic.
- [ ] Share string builder (emoji + colorblind variant).
**Exit:** ≥ 90% coverage; property tests for matcher/schedule determinism.

## Phase 1b — Data & content pipeline (Day 1 → launch, continuous) · `packages/data`, `content/`
- [ ] `data:snapshot` from deadlock-api (`/v1/assets/*` pinned to `client_version`) + analytics
      hero/item rates + deadlock-data release dates; zod schemas; sanitized descriptions.
- [ ] Answer-set query DSL (`heroes.where(...)`, `items.where(slot=spirit, tier=3)`, `abilities.where(...)`).
- [ ] `prompts:draft` (Claude API) → drafts with answer queries, aliases, why-nots, Wise Guy and
      Rejuvenator candidates.
- [ ] `prompts:validate` + `schedule:build`.
- [ ] Admin review page (`/admin`, gated by a secret + Discord-ID allowlist): approve/edit/reject,
      flag queue, rarity table viewer.
- [ ] **Recruit 2–3 expert reviewers** from the Deadlock Community Discord (credit on the About page).
- [ ] Content milestones: 60 approved prompts by Day 5 · 120 by Day 10 · **≥ 180 by launch**.
- [ ] Hero sigil set: 44+ SVG medallions (Claude drafts paths in batches of 8; Galen approves).
**Exit:** 180 approved prompts, 60-day schedule in D1, all sigils approved.

## Phase 2 — Vertical slice (Day 3–5)
- [ ] Worker API: `/api/today`, run lifecycle (`run`, `serve`, `guess`, `finish`), HMAC run tokens,
      server-side timing, rate limits, envelope responses, input validation (zod).
- [ ] D1 migrations (schema in SPEC §6.3); `DayTally` DO with 60 s flush; rarity cron (10 min).
- [ ] Client game state machine (`title → howto → preview → answering → reveal → ceremony → ledger`)
      with placeholder visuals; mobile input docking (VisualViewport); keyboard flow.
- [ ] Ledger with crowd reveal + percentile; share string; local stats/streak.
**Exit:** Galen can play a full scored Daily on his phone against real prompts on the preview URL.
**🔎 Galen playtest #1** — feel of timer, matching generosity, prompt quality.

## Phase 3 — Scene, juice & audio (Day 5–11) · the "AAA feel" phase
- [ ] Canvas renderer core: layer stack, parallax, spring camera, particles, additive glow, grain/vignette,
      quality auto-tiering, low-power mode, reduced-motion path.
- [ ] Urn: liquid-light fill with spring surface, gem slots, Wise Guy smoke cough, overflow.
- [ ] 10 zones (SPEC §3.4) — order of build: Curb, Platform, Tunnels, Cellar, Vault (MVP five) → Sewers,
      Catacombs, Veil, Sanctum, Hearth.
- [ ] Tier reveal choreography × 6; hit-stop; shake; chain counter; timer last-5 s tension.
- [ ] Ceremonies I–III + constellation results card.
- [ ] Audio: synth tier voices, typing/UI SFX, heartbeat, zone ambience beds (CC0 + synth),
      music theme with depth-layered stems, mixer + settings.
- [ ] Title screen: rain street scene, Urn on the curb, countdown, Mod-of-the-Week card slot.
**Exit:** visual regression baselines captured; 60 fps on mid devices. **🔎 Galen playtest #2** (feel pass).

## Phase 4 — Modes, accounts & social (Day 6–11)
- [ ] Free Dive (post-daily unlock, relaxed timer option) · Archive (replays, best score).
- [ ] SSR Ledger pages for past days (`/ledger/:day`) + About/How-to/FAQ/Privacy/Terms (AdSense prerequisites).
- [ ] OG card renderer (`/s/:day/:code`, Satori/resvg-wasm in Worker, Cache API + KV).
- [ ] Optional login: Discord OAuth + Steam OpenID; anon→account merge; sessions.
- [ ] Friends codes/invites, friends board, badges, streak freezes, urn skins, stats page.
- [ ] Streamer mode + `?spoilers=off`.
**Exit:** E2E specs green for daily/free/archive/share/login-merge.

## Phase 5 — Live lobbies (Day 6–11)
- [ ] `LobbyRoom` DO (WebSocket Hibernation): join/start/guess/reveal/podium, server clocks, clock-offset sync,
      reconnection, host migration, 16-player cap, GC.
- [ ] **Séance** mode (P0): room uniqueness bonus, jinx animation, podium ceremony, rematch.
- [ ] **Hot Urn** mode (P1): fuse, lives, rare-answer life meter.
- [ ] OBS overlay route `/overlay/:room`.
**Exit:** 8-client load test (Playwright multi-context) stable; latency-tolerant at 300 ms RTT.

## Phase 6 — Hardening & launch readiness (Day 10–13)
- [ ] AdSense application (after content pages live) + CMP + ad slots (feature-flagged off until approved).
- [ ] Analytics events (Workers Analytics Engine) + Cloudflare Web Analytics + error beacon.
- [ ] Security review (security-reviewer agent): auth, rate limits, admin gating, input validation, CSP
      (nonce-based), headers (HSTS, nosniff, frame-ancestors none except overlay).
- [ ] A11y audit (axe + keyboard + screen reader), colorblind palettes, reduced-motion set.
- [ ] Lighthouse CI budgets; bundle analysis; image/audio lazy-loading.
- [ ] PWA manifest + service worker (offline title + cached assets; no offline scoring).
- [ ] Legal: disclaimers, takedown email, privacy policy, terms.
- [ ] Code review pass (code-reviewer + typescript-reviewer agents) — fix CRITICAL/HIGH.

## Phase 7 — Closed beta (Day 11–14)
- [ ] 30–100 testers from Deadlock Discords + expert reviewers; private link; feedback widget.
- [ ] **Beta answers seed rarity priors** for the first 14 scheduled dailies (cold-start fix).
- [ ] Fix-list triage daily; alias/why-not expansion from flags.
- [ ] Prepare launch assets: 3 GIFs (Rejuvenator plunge, Wise Guy cough, Séance podium), 30-s trailer
      capture, Reddit/Discord post copy, creator DM template.

## Launch (Day 14) — playbook
1. Daily #1 goes live 00:00 UTC. 2. Reddit post ~14:00 UTC (US morning) with GIF.
3. Discord #fan-creations + forums + Steam hub. 4. DMs to 20 streamers with lobby link.
5. Watch: error rate, completion rate, flag queue (triage hourly day 1), D1 write usage.

## Post-launch ops (recurring)
| Cadence | Task | Owner |
|---|---|---|
| Daily | flag queue triage; check rarity tables; social clip of "rarest answer" | Claude-assisted, Galen approves |
| Weekly | 15+ new prompts approved; Mod of the Week (with permission); metrics review | Galen + reviewers |
| On patch | snapshot diff review; update affected prompts; "patch prompts" week | Claude |
| Monthly | ad network upgrade check (Venatus/Nitro/Raptive thresholds); retention review | Galen |
| Ideas backlog | Twitch extension / chat play-along, themed weeks, Night Shift hard mode, commissioned deco busts, localization (PT-BR, RU, ES — big Deadlock regions) | — |

## Open questions for Galen
1. Final verdict-band and zone names after the lore pass? (Placeholders in SPEC §3.3–3.4.)
2. OK to approach mod creators for "Mod of the Week" features from a brand account?
3. Who are the 2–3 expert reviewers? (I'll draft the Discord recruiting post.)
4. Keep repo name `souldive` or rename to `urnrun`?
