# Urn Run — Product & Technical Spec

> **Status:** v0.1 draft · 2026-11-25 · Owner: Galen (direction) · Builder: Claude
> **Working repo:** `souldive` (rename optional) · **Brand:** **Urn Run** · **Launch URL:**
> `play.urnrun.workers.dev` (free). **Later, at traction:** `urnrun.gg` (primary) + `urnrun.com`
> (redirect) — both unregistered as of 2026-11-25.
> Research backing every decision lives in [`RESEARCH.md`](./RESEARCH.md). Build sequencing lives in
> [`PLAN.md`](./PLAN.md).

---

## 0. Decisions log (from the founder interview)

| # | Decision | Choice |
|---|---|---|
| D1 | Core hook | **Knowledge test** — reward deep Deadlock knowledge; experts feel smart |
| D2 | 6-month goal | **Real side income ($1k+/mo)** |
| D3 | Who builds | **Claude builds, Galen directs/playtests** |
| D4 | Founder Deadlock depth | Casual/lapsed → data-driven content + expert beta reviewers |
| D5 | Platform | **Mobile-first web**, desktop fully polished |
| D6 | Monetization | **Display ads only** (AdSense → gaming network). No paid unlocks |
| D7 | Accounts | **Anonymous by default + optional login** for sync/leaderboards |
| D8 | Infra | **New Cloudflare-only stack**, isolated from Konjo |
| D9 | Visual direction | **Deco occult noir** |
| D10 | Audio | **Full soundscape** |
| D11 | Positioning | **Out-polish + ship fast** vs deadlockrillion.site |
| D12 | Fantasy | **Carry the Soul Urn down** through the city's occult underworld |
| D13 | Launch modes | **All at launch:** Daily, Free Dive, Archive, Live Lobbies + Friends |
| D14 | Rarity | **Data priors + live crowd recalibration** |
| D15 | Content | Heroes & abilities · Items & economy · Lore & world · Community & pro scene |
| D16 | "Too Clever" penalty | **Keep** (ours: **Wise Guy**) |
| D17 | Ads rollout | AdSense day 1 → Venatus/Nitro/Snigel/Raptive as traffic qualifies |
| D18 | Portraits | **Original deco sigil medallions**; meme mods as content w/ credit; no Valve art |
| D19 | Budget/date | **ASAP, < $100 to launch** |
| D20 | Spec home | In repo (`docs/`) |

---

## 1. Product vision

**One line:** *A daily Deadlock knowledge dive — name the answer nobody else thinks of, pour rarer
souls into the Urn, and carry it deeper beneath the city than anyone else today.*

**Why it wins**
1. **Genre with proven pull.** Krillion went from launch (Jul 2026) to global rank #231 in four months
   and spawned 34+ clones; daily/dle games earn 2.8× network-average ad revenue per session.
2. **Underserved, engaged audience.** Deadlock: ~160k avg CCU, ~350k-member community Discord, a
   crowded *dle* niche but only **one** Krillion-style game — 3 days old, low polish.
3. **Data edge.** deadlock-api exposes real pick/purchase rates from ~577k matches/day, so our rarity
   tiers are grounded on day one instead of guessed.
4. **Craft edge.** Targon Climb proved a solo, AI-assisted build can feel AAA-indie with procedural
   canvas art + synthesized audio. We match that bar and add a distinct, beautiful fantasy.

**Non-goals (v1):** native apps, paid unlocks/cosmetics, Valve imagery or audio, real-money anything,
user-generated prompts, non-English localization, Twitch extension (post-launch candidate).

---

## 2. Players & jobs-to-be-done

| Persona | Share (est.) | Wants | We give |
|---|---|---|---|
| **The Grinder** — ranked player, knows patch notes | 30% | prove expertise, flex | rare-answer scoring, percentile, Rejuvenator gems, global daily rank |
| **The Lurker** — watches streams, plays casually | 45% | quick fun, learn trivia | 3-min session, "the reveal" teaches answers, Free Dive |
| **The Streamer/Creator** | 5% | content, chat engagement | streamer mode, live lobbies, spoiler-free share |
| **The Squad** — Discord friend groups | 20% | compete with friends | friend codes, friends board, lobbies, share cards |

---

## 3. Game design

### 3.1 Fantasy & framing
You are a courier for the occult underworld of a 1920s–30s New York. Each day the **Soul Urn**
surfaces at street level. Your job: carry it **down** — through the subway, the tunnels, the sewers,
the speakeasy cellars, the vaults — as deep as the souls you've gathered will take you. **Each prompt
answered pours souls into the Urn; souls are weight; weight is depth.** Common answers barely sink
you. A rare answer drops you through a floor.

- Score unit: **souls**. Depth unit: **feet below street level** (1 soul = 1 ft). Max 7 × 1,000 =
  **7,000 souls / 7,000 ft** (Deadlock's Urn is literally a soul-delivery objective — the fit is native).
- Tone: noir-wry microcopy in 1920s slang ("Wise guy, eh?", "Down the stairs you go", "The city
  swallows another one"). **Never** copy Krillion's microcopy, tier names, pixel style, or VT323.

### 3.2 Daily Dive — the core loop
```
Title (street, rain, the Urn on the curb)
  └─ "PICK UP THE URN" ─► How-to-play (first visit; dismissible after)
       └─ ×7 rounds:
            Preview 3s  (prompt card unfurls; clock not yet running)
            Answer 25s  (type → DROP IT; invalid = time cost only; near-miss = "Did you mean…")
            Reveal ~1.8s (tier stamp, souls pour, camera plunges, zone landmark passes)
       └─ Ceremony (if a milestone zone was crossed or perfect run)
       └─ Results ("THE LEDGER")
            total souls / depth / zone reached · percentile curve · per-round "the crowd said…"
            share card · friends board · streak · ad slot (300×250) · Free Dive CTA · countdown
```

**Rules**
- 7 prompts/day, identical worldwide. Reset **00:00 UTC** (global audience; countdown shown in local time).
- 25 s per prompt; 3 s preview before the clock starts.
- Unlimited guesses within the window; wrong guesses cost only time. Reusing the same entity across
  rounds is allowed (prompts are designed so no single answer dominates a day).
- Timeout or no valid answer = 0 souls (⬛ in share grid).
- One scored Daily per day per player. Score **locks at submission** (rarity used = snapshot at that moment).
- Mix per day: **3 Heroes & abilities · 2 Items & economy · 1 Lore & world · 1 Community/pro/wildcard**.
  No prompt repeats within 30 days; no two prompts with >60% answer-set overlap on the same day.

### 3.3 Tiers (objective-themed — deliberately distinct from competitor's rank tiers)

| Tier | Souls | Glyph (share) | Meaning | Reveal voice |
|---|---|---|---|---|
| **Trooper** | 100 | 🪖 | common, the lane fodder answer | dull brass clink |
| **Wise Guy** | 150 | 🎩 | *the "too clever" trap* — the "obscure" pick everyone reaches for | sly muted trombone wah |
| **Guardian** | 300 | 🛡️ | uncommon | warm bell |
| **Walker** | 600 | 🗼 | rare | low gong + rising shimmer |
| **Mid Boss** | 850 | 👹 | deep cut | choir swell + sub thump |
| **Rejuvenator** | 1,000 | 💠 | *the gem* — one hand-picked answer per prompt (rare **and** delightful) | full fanfare + glass chime cascade |

Verdict bands on total: 0–1,500 *Street Rat* · 1,501–2,500 *Subway Runner* · 2,501–3,500 *Tunnel Rat* ·
3,501–4,499 *Vault Breaker* · 4,500+ *Patron's Courier*. (Final names subject to lore pass.)

### 3.4 Depth zones (the descent map)
Each zone has its own painted parallax set, palette, ambience bed, particle system, and an **arrival
moment** (camera beat + stinger). Names are evocative originals that echo Deadlock's world; a lore pass
against the wiki confirms nothing contradicts canon.

| Depth (ft) | Zone | Visual signature | Arrival moment |
|---|---|---|---|
| 0 | **The Curb** | rain-slick street, neon speakeasy sign, steam vents | Urn lifted, thunder |
| 300 | **The Platform** | green subway tile, flickering bulbs, a train roars past | train headlight sweep |
| 750 | **The Tunnels** | brick arches, third-rail sparks, rats' eyes | sparks shower |
| 1,250 | **The Cellar** | speakeasy bootleg barrels, jazz bleeding through walls | music swells muffled → clear |
| 1,900 | **The Sewers** | green fog, dripping, phosphorescent fungus | fog parts |
| 2,600 | **The Catacombs** | ossuary niches, candles, chalk sigils | candles ignite in a wave |
| 3,500 | **The Vault** | brass gears, safe doors, ledger pages floating | vault door spins open |
| 4,500 | **The Veil** | reality thins; ink-wash water, floating masks | *ceremony I:* "Through the Veil" |
| 5,750 | **The Sanctum** | colossal deco gates, teal soul-fire | *ceremony II:* gates part |
| 7,000 | **The Patron's Hearth** | the Urn overflows; sunburst of souls | *ceremony III (perfect):* Urn erupts, constellation of your 7 answers |

### 3.5 Signature moments ("juice spec")
- **Urn fill:** the Urn (bottom-center, always visible) fills with luminous teal liquid light; level
  tracks total souls; sloshes with camera motion (spring-driven surface).
- **Wise Guy:** hit-stop 90 ms → urn *coughs* smoke → small screen shake (trauma 0.25) → fedora stamp.
- **Walker+:** floor cracks open beneath → hit-stop 110 ms → camera plunge with motion-blur streaks.
- **Rejuvenator:** time dilates (0.3×) for 400 ms, glass-chime cascade, souls spiral into urn, gem
  icon embeds in the urn's brass band (7 slots = your crown for the day).
- **Back-to-back Mid Boss+:** "chain" counter, ascending pitch, chain-link sigils draw between gems.
- **Timer last 5 s:** heartbeat bass, vignette tightens, typing sounds get pitch-up, clock hand trembles.
- **Results:** ledger page stamps each round in staggered 120 ms beats; numbers roll up; percentile
  curve draws with your marker dropping in.
- **Constellation card:** your 7 answers rendered as stars at depths by rarity — unique per player per
  day; becomes the share image.

### 3.6 Answer matching
- Canonical answer sets per prompt, generated from structured data (see §6) plus curated additions.
- **Aliases:** community shorthand (`M&K`, `Mo`, `Krill` → Mo & Krill; `GT` → Grey Talon; item
  shorthand like `BB` → Boundless Spirit *(alias list built + verified by expert reviewers)*).
- **Normalization:** case/diacritics/punctuation/whitespace folding, `&`↔`and`, article stripping.
- **Fuzzy:** Damerau-Levenshtein ≤1 (≤6 chars) / ≤2 (longer) → "Did you mean **X**?" confirm chip
  (one tap). Never auto-accept fuzzy.
- **Near-miss explanations ("why not"):** per prompt, a curated map of *plausible wrong answers* →
  one-line reason ("Lash's Grapple pulls *him*, not enemies"). Shown inline; costs no extra time.
- **"This should count" flag:** queues to admin review; first flag per round refunds 5 s; accepted
  flags retro-score that player (and add the answer for everyone).

### 3.7 Rarity engine (D14)
1. **Priors (build time).** For each answer, compute a prior rarity score from:
   - *Heroes:* pick rate from `/v1/analytics/hero-stats` (normalized within the answer set).
   - *Items:* purchase rate from `/v1/analytics/item-stats`.
   - *Abilities/lore/community:* Claude-assisted salience estimate + expert-reviewer adjustment.
   - Blend: `prior = 0.6·dataSalience + 0.4·curatorSalience` where data exists.
   → map to seed tier. **Wise Guy** candidates are curated explicitly (the answer people *think* is clever).
   **Rejuvenator** is hand-picked per prompt.
2. **Live recalibration (every 10 min, Cron + Durable Object tallies).** For answer *a* with share
   `p(a)` among valid answers today, compute `cum(a)` = share of players who gave a *more common*
   answer. Tier thresholds on `cum`: <12% Trooper · <30% Guardian · <55% Walker · ≥55% Mid Boss
   (Rejuvenator stays hand-picked; Wise Guy is a curated overlay, see guards).
3. **Guards:** max **+1 tier above seed**, max **−2 below** (data can demote faster than promote);
   **locked Troopers** (top-3 obvious answers never rise); Wise Guy status is sticky unless its live
   share drops below 1%; minimum sample n ≥ 200 before live tiers override priors.
4. **Score lock:** a player's round is scored with the tier table *at submission time*; the Ledger
   later shows "now: Walker ↑" if it moved, but score never changes (except accepted flags).
5. **Cold start:** closed beta answers (see PLAN Phase 7) seed the first 2 weeks of prompts.

### 3.8 Free Dive (endless)
- Unlocked after today's Daily (or immediately if Daily done). Random 7-prompt sets from the full bank
  excluding the next 30 days of scheduled dailies. Rarity = current live table for that prompt.
- Same descent presentation; separate personal best; **no streak/leaderboard impact.**
- An interstitial-free ad slot on each Ledger. (Primary engine of extra sessions → ad impressions.)

### 3.9 Archive ("Past Dives")
- Every past Daily replayable; best score kept; no streak credit.
- **Public "Yesterday's Ledger" pages** (SSR, indexable): prompts + the crowd's top answers + rarest
  valid answers + our own short explanations. Purpose: SEO ("deadlock daily answers"), AdSense content
  requirements, and creator-friendly reference. Today's answers never published until reset.

### 3.10 Live Lobbies (D13)
**Mode A — "Séance" (simultaneous, P0).** 2–16 players, 5-letter room code / link `?room=ABCDE`.
Host picks 5/7/10 rounds and 15/25 s timers. All answer the same prompt at once on a server clock;
scoring = global rarity tier **+250 souls if nobody else in the room gave it** (room uniqueness);
duplicates within the room flagged with a "jinx!" animation. Podium ceremony; rematch.

**Mode B — "Hot Urn" (P1, can slip a few days post-launch).** Bomb-party style: the Urn is passed
around the circle; on your turn name a valid answer for the shared prompt (no repeats) to pass it; a
hidden fuse (10–30 s, min 8 s on receipt) — when it blows you lose a life (2 lives); rare answers fill a
meter toward an extra life. Last courier standing wins.

**Streamer support:** "Host as streamer" hides room code behind click-to-reveal; spoiler mode;
large-text overlay layout at `/overlay/{room}` for OBS browser source.

### 3.11 Friends, streaks, stats, badges
- **Friend codes** (6 chars) + invite links `?f=CODE`; friends board for today (score + optional answers
  after you've played).
- **Streak** = consecutive Dailies; **maintenance days don't break streaks**; one free **streak
  freeze** earned per 7-day streak (max 2 banked).
- **Stats:** games, avg souls, best depth, tier histogram, zone reached distribution, favorite answers.
- **Badges (cosmetic only, never sold):** First Delivery, Wise Guy ×10 ("Made Man"), Rejuvenator
  Hunter, Patron's Courier, 7-day / 30-day / 100-day streaks, Night Shift (played 00:00–04:00 local),
  Perfect Ledger.
- **Urn skins** unlocked by streak milestones (brass → silver → obsidian → jade → soul-glass → gold
  filigree). Original designs — our only cosmetic system, earned not bought.

### 3.12 Share
```
Urn Run #42 · 4,215 ft · The Vault
🛡️🪖💠🗼🎩👹⬛
Deeper than 87% of couriers today
urnrun.gg
```
- Colorblind-safe: emoji differ in shape, not only color; optional bar-height row variant.
- `navigator.share` on mobile, clipboard fallback; URL last for link previews.
- **Dynamic OG image** per result at `/s/{day}/{code}` → constellation card (rendered server-side).

### 3.13 Accessibility & comfort
Keyboard-only play · visible focus · screen-reader live regions for tier results · 3 colorblind palettes
· `prefers-reduced-motion` (no shake/plunge, crossfades instead) · photosensitivity-safe (no >3 Hz
flashes) · adjustable timer *in Free Dive only* (Relaxed 40 s) · text scaling to 200% · low-power mode
(halves particles, 30 fps cap) · mute + separate music/SFX sliders.

---

## 4. Content system

### 4.1 Prompt schema (`content/prompts/*.yaml`)
```yaml
id: hero-stun-001
category: heroes            # heroes | items | lore | community
text: "Name a hero with a stun"
answer_source:              # generated from data snapshot…
  kind: query
  query: heroes.where(abilities.any(tags contains 'stun'))
extra_answers: []           # …plus curated additions
exclude: []
aliases: { "mo and krill": ["m&k", "mo", "krill"] }
seed_overrides: { haze: wise_guy }
rejuvenator: "viscous"
why_not:
  lash: "Lash's Ground Strike knocks up — no stun."
difficulty: 2               # 1–5, used for daily mix balancing
min_answers: 6              # validator: reject prompts with too few answers
last_reviewed: 2026-11-30
reviewer: "beta:expert-1"
```

### 4.2 Pipeline
1. `pnpm data:snapshot` → pulls deadlock-api assets (+ analytics rates) pinned to `client_version`,
   plus deadlock-data release dates → zod-validated, normalized `data/v{build}.json` (< 100 KB gz).
2. `pnpm prompts:draft --category heroes --n 40` → Claude API drafts prompt candidates, answer-set
   queries, aliases, why-nots, Wise Guy/Rejuvenator picks → `content/drafts/`.
3. **Review queue** (admin page) — Galen + 2–3 expert beta reviewers approve/edit/reject.
4. `pnpm prompts:validate` → every approved prompt resolves to ≥ `min_answers`, no orphan aliases,
   seeds computed, overlap rules satisfied.
5. `pnpm schedule:build` → deterministic schedule for next 60 days (seeded shuffle with mix + no-repeat
   constraints) → written to D1 `daily_schedule` (answers **server-side only**).
6. **Patch watch:** Cron every 2 h compares `steam-info.client_version`; on change, re-snapshot, diff,
   flag affected prompts (e.g., item removed) for review; never alter a prompt already scheduled within
   48 h without manual approval.

### 4.3 Launch content targets
- **≥ 210 approved prompts** — split **90 heroes/abilities, 60 items/economy, 30 lore, 30 community/pro**.
  This is the hard minimum for the 3/2/1/1 daily mix under the 30-day no-repeat rule (3 × 30 = 90
  heroes, etc.); the schedule builder throws if a category runs dry. Aim for ~250 for headroom.
- Community prompts include meme-mod culture (text only), e.g. "Name a hero with a famous meme mod".
- **Mod of the Week** card on the title screen: creator credit + GameBanana link, **only with written
  permission**, original-design mods only (no celebrity/crossover/NSFW).

### 4.4 Content rules (legal hygiene)
No Valve images, logos, fonts, audio, or videos. Facts only, written in our words (wiki prose is CC
BY-NC-SA). No real-person likenesses. Hero visuals = our sigils. Item visuals = our slot-colored tier
glyphs (weapon/vitality/spirit color coding is generic UI convention — use our own hues).

---

## 5. Visual & audio design system

### 5.1 Direction: *Deco Occult Noir*
1920s–30s New York art-deco geometry (sunbursts, stepped ziggurat frames, chevrons, guilloché)
crossed with occult iconography (sigils, tarot roundels, astrolabes), lit by teal soul-fire in smoke
and rain. Film grain, vignette, ink-wash shadows. Reference touchstones: Targon Climb's
painted-scene-plus-scrim layout; Darkest Dungeon's ink density; *BioShock* deco signage; *Hellboy*
occult noir. **Explicitly avoid:** Deadlock's wordmark, Valve UI frames, Valve fonts.

### 5.2 Tokens (CSS custom properties; canvas reads the same values)
```css
:root {
  --ink-950: oklch(13% 0.01 250);   /* night */
  --ink-900: oklch(17% 0.015 250);
  --soot-700: oklch(28% 0.01 60);
  --brass-500: oklch(66% 0.09 75);  /* frames, rules */
  --gold-400: oklch(80% 0.13 85);   /* highlights, Rejuvenator */
  --soul-400: oklch(84% 0.13 175);  /* the glow — primary accent */
  --soul-600: oklch(62% 0.12 180);
  --oxblood-600: oklch(38% 0.12 25);/* danger, timer */
  --amber-500: oklch(74% 0.15 60);  /* warm faction accent */
  --sapphire-500: oklch(58% 0.15 265);/* cool faction accent */
  --parchment-100: oklch(94% 0.03 85);/* ledger paper */
  --tier-trooper: var(--soot-700); --tier-wise: oklch(70% 0.14 320);
  --tier-guardian: var(--brass-500); --tier-walker: var(--sapphire-500);
  --tier-midboss: var(--oxblood-600); --tier-rejuv: var(--soul-400);
  --font-display: "Limelight", "Marcellus SC", serif;  /* deco caps */
  --font-ui: "Jost", system-ui, sans-serif;            /* Futura-like; ships in Deadlock, OFL */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms; --dur-normal: 300ms;
}
```
Two font families max, self-hosted, subset, `font-display: swap`; preload only display weight.
Dark scene is the product's identity (deliberate, not default); the Ledger uses parchment light.

### 5.3 Layout
- **Mobile (primary):** scene fills viewport; prompt card top third; Urn bottom-center; input docked
  above the on-screen keyboard (VisualViewport API), 52 px tall; DROP button thumb-reachable.
- **Desktop:** scene right ~60%, UI column left over a smoke scrim (Targon pattern), ad rail far left
  only on Ledger/title screens.
- Breakpoints tested: 320, 375, 768, 1024, 1440, 1920.

### 5.4 Hero sigils (D18)
44+ original SVG medallions in a shared deco frame system (roundel + sunburst + brass bevel), each
built from the hero's signature motif (e.g., flame, dagger, hook, arrow-and-owl, top hat). Generated
as hand-authored SVG paths (Claude drafts, Galen approves), animated on reveal (stroke draw-on →
fill → glint). Hero name always printed beneath. Later: commissioned engraved busts as an upgrade.

### 5.5 Rendering tech
- **Scene:** custom Canvas 2D renderer (procedural painted layers per zone, parallax, particles,
  bloom approximation via additive blur layer), critically-damped spring camera, 60/120 Hz paced,
  automatic quality tiers (FPS sampling → drop particle counts/blur passes).
- **UI:** React DOM over canvas (accessible, crisp text); **Motion** (mini `animate` + layout) for UI
  transitions; **GSAP** for choreographed sequences (reveals, ceremonies). canvas-confetti-style soul
  particles implemented in our own renderer.
- No PixiJS/Phaser/Three in v1 (budget). Optional WebGL soul-fire shader behind feature flag.

### 5.6 Audio (D10)
- **Engine:** Web Audio API directly (tiny, synth-capable) + Howler for sample sprites.
- **Synthesized:** per-tier reveal voices (§3.3), typing ticks (pitch ±6% random), timer heartbeat,
  UI hovers/presses, zone stingers.
- **Ambience beds per zone:** rain/steam, subway rumble, dripping tunnels, muffled jazz cellar, sewer
  drips, catacomb wind, vault ticking, Veil reverse-swells, Sanctum choir pad — built from CC0 sources
  (Freesound CC0, Kenney) + synthesis; crossfade on zone change.
- **Music:** one looping deco-jazz/noir theme (piano + upright bass + brushed drums + theremin
  accent), stems layered by depth (deeper → more occult instrumentation). Source: CC0/royalty-free
  library or procedural (Tone.js lazy-loaded *only* if procedural route chosen). Budget $0–30.
- Unlock on first gesture; music default ON at 40%, SFX 80%; remember choice.

### 5.7 Performance budgets
| Metric | Target |
|---|---|
| Initial JS (gz) | **< 150 KB** (game route), < 60 KB (content pages) |
| CSS (gz) | < 30 KB |
| LCP / INP / CLS | < 2.0 s / < 200 ms / < 0.05 |
| Fonts | 2 families, ≤ 3 files preloaded total ≤ 90 KB |
| Audio | ambience/music streamed lazily after first round starts |
| Frame time | 60 fps on iPhone 12 / mid Android at default quality |

---

## 6. Technical architecture (Cloudflare-only, D8)

### 6.1 Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **React Router v7 (framework mode) + Vite + React 19 + TypeScript** on **Cloudflare Workers** (static assets) | SSR/prerender for SEO pages (Archive, About, FAQ, Ledger pages), SPA game route, one deploy |
| API | Hono routes inside the same Worker (`/api/*`) | small, typed, fast |
| DB | **D1** (SQLite) | users, runs, answers, schedule, aggregates |
| Realtime | **Durable Objects** (SQLite-backed) | `LobbyRoom` per room; `DayTally` per day (hot counters, flushed to D1 every 60 s to save D1 writes) |
| Cache/config | **KV** | today's public puzzle payload (prompts only), rarity tables per prompt |
| Jobs | **Cron Triggers** | rarity recompute (10 min), tally flush, patch watch (2 h), schedule build (daily) |
| Images | `workers-og` / Satori + resvg-wasm in Worker, cached via Workers Cache API + KV (R2 later) | per-result OG cards |
| Auth | Optional: **Discord OAuth** + **Steam OpenID** (via `arctic`/custom), signed session cookie | Deadlock players live on Steam/Discord |
| Analytics | Cloudflare Web Analytics (cookieless) + **Workers Analytics Engine** custom events | free, privacy-friendly |
| Errors | Workers Logs + client error beacon → Analytics Engine; Sentry free tier optional | |
| Package mgr | pnpm workspaces | |
| Tests | Vitest (unit/integration via `@cloudflare/vitest-pool-workers`), Playwright (E2E + visual), axe | |

### 6.2 Repo layout
```
souldive/
├── apps/web/                 # RR7 app + Worker entry (exports DOs)
│   ├── app/routes/           # _index (game), archive.$day, ledger.$day, about, faq, privacy, s.$day.$code
│   ├── app/game/             # state machine, rounds, input, results
│   ├── app/scene/            # canvas renderer: zones/, particles/, camera.ts, urn.ts
│   ├── app/audio/            # synth voices, ambience, music
│   ├── app/ui/               # design-system components (deco frames, buttons, ledger)
│   ├── app/styles/           # tokens.css, typography.css, global.css
│   └── worker/               # api (hono), durable-objects/{LobbyRoom,DayTally}.ts, cron.ts
├── packages/core/            # PURE TS: matching, normalization, scoring, rarity, seeded RNG, schedule
├── packages/data/            # snapshot scripts, zod schemas, data/v{build}.json
├── content/  (git-ignored; synced from private repo galenjauss/urnrun-content)
├── docs/                     # SPEC, PLAN, RESEARCH
└── e2e/                      # Playwright specs + visual baselines
```

### 6.3 Data model (D1)
```sql
users(id TEXT PK, created_at, display_name, discord_id UNIQUE NULL, steam_id UNIQUE NULL,
      friend_code UNIQUE, settings_json)
prompts(id TEXT PK, category, text, difficulty, version, active)
prompt_answers(prompt_id, answer_id, display, aliases_json, seed_tier, is_rejuv, why_not NULL,
      PRIMARY KEY(prompt_id, answer_id))
daily_schedule(day INTEGER PK, prompt_ids_json, published_at)
runs(id TEXT PK, user_id, mode CHECK(mode IN ('daily','free','archive','lobby')), day NULL,
      started_at, finished_at NULL, total_souls, depth_zone, client_meta_json)
run_rounds(run_id, idx, prompt_id, answer_id NULL, tier NULL, souls, served_at, answered_at,
      guesses INTEGER, PRIMARY KEY(run_id, idx))
answer_tallies(day, prompt_id, answer_id, count, PRIMARY KEY(day,prompt_id,answer_id))
rarity_tables(prompt_id, computed_at, table_json, PRIMARY KEY(prompt_id))
streaks(user_id PK, current, best, last_day, freezes)
friends(user_id, friend_id, created_at, PRIMARY KEY(user_id, friend_id))
flags(id PK, run_id, prompt_id, raw_text, status CHECK(status IN ('open','accepted','rejected')))
badges(user_id, badge_id, earned_at, PRIMARY KEY(user_id,badge_id))
```
Anonymous users get a `users` row on first run (random id in an httpOnly cookie + localStorage
mirror); logging in merges the anon row.

### 6.4 API (envelope `{ ok, data, error, meta }`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/today` | day number, reset time, prompt **texts** only (no answers) |
| POST | `/api/run` | start run `{mode, day?}` → `runId`, signed run token |
| POST | `/api/run/:id/round/:idx/serve` | server stamps `served_at`, returns prompt (+ preview) |
| POST | `/api/run/:id/round/:idx/guess` | `{text}` → `{valid, didYouMean?, whyNot?, tier?, souls?}`; valid ends round |
| POST | `/api/run/:id/finish` | totals, percentile, crowd reveal, share code |
| GET | `/api/ledger/:day` | public reveal (only for past days) |
| GET/POST | `/api/me`, `/api/friends`, `/api/flags` | account features |
| GET | `/api/lobby/:code` (WebSocket upgrade → `LobbyRoom` DO) | live lobbies |
| GET | `/s/:day/:code` | share page with OG card |

**Server-authoritative by design:** answers and tiers never reach the client before a guess resolves;
all scoring happens in the Worker. This simultaneously solves anti-cheat and spoilers.

### 6.5 Anti-cheat & integrity
- Timing enforced server-side (`answered_at − served_at ≤ 25 s + 1.5 s grace`).
- Run token = HMAC(runId, userId, day) with server secret; one Daily run per user per day; per-IP +
  per-user rate limits on guesses (Workers Rate Limiting binding).
- Plausibility: flag runs with sub-600 ms valid answers on long prompts, or many accounts from one IP
  topping the board; flagged runs excluded from percentiles pending review.
- Leaderboards: percentile is computed from all runs; *global top-N list* only for logged-in users.

### 6.6 Live lobby protocol (DO `LobbyRoom`)
WebSocket (Hibernation API). Messages: `join{name}`, `start{rounds,timer}`, `guess{text}`,
server→`state{phase,round,deadline,players}`, `reveal{results}`, `podium`. Server owns clocks;
clients render deadline countdowns from server timestamps (clock-offset handshake). Max 16 players,
idle room GC after 15 min.

### 6.7 Cost model (D19: < $100 to launch)
| Item | Cost |
|---|---|
| `urnrun.gg` (Porkbun/Namecheap; Cloudflare Registrar doesn't sell .gg) | ~$35–70/yr |
| `urnrun.com` (Cloudflare Registrar at cost) | ~$10/yr |
| Cloudflare Workers Free → **Workers Paid $5/mo** once D1/DO free limits bind (~10k+ runs/day) | $0–5/mo |
| Fonts, CC0 audio | $0 |
| Claude API for prompt drafting | ~$5–15 one-off |
| **Total to launch** (domains deferred; workers.dev subdomain is free) | **≈ $5–15** |

---

## 7. Monetization

1. **Launch:** Google AdSense (requires real content pages → Archive Ledgers, About, How to Play, FAQ,
   Privacy, Terms). Placements:
   - Ledger (results) 300×250 below the fold-line of the score.
   - Mobile sticky bottom adhesion **only on title/Ledger screens**, never during a round.
   - Desktop left rail 160×600 on title/Ledger.
   - Archive/Ledger SEO pages: in-content units.
   - **Never** ads inside the answer phase or ceremonies.
2. **Consent:** Google-certified CMP (Google Privacy & Messaging, free) for EEA/UK/CH; US state
   privacy opt-out link.
3. **Graduate:** apply to **Venatus** (LoLdle's network; game-native) and **Nitro/Snigel** as soon as
   traffic is meaningful; **Raptive** at 25k PV/mo if tier-1 share ≥ 50%; **Playwire** at 500k PV.
4. **Never:** paid unlocks, ad-free subscriptions, cosmetics for sale, Patreon gating (Valve risk —
   see RESEARCH §5). Optional later: no-perk Ko-fi tip link.
5. **Revenue model targets:** 1k DAU → ~$100/mo · 10k DAU → $1.5–5k/mo (goal D2 met) · 100k DAU →
   $25k+/mo.

---

## 8. Growth plan

- **Launch posts:** r/DeadlockTheGame (GIF of a Rejuvenator plunge + "made a daily game"), Deadlock
  Community Discord (~350k) #fan-creations, Deadlock forums, Steam community hub.
- **Creators:** DM 20 mid-size Deadlock streamers with a lobby link + streamer mode/OBS overlay;
  "Streamer Séance" weekly event.
- **Mod creators:** Mod of the Week features → creators repost to their audiences.
- **Short-form:** auto-generated daily clip (canvas recording of the "rarest answer of the day"
  ceremony) for TikTok/Shorts/X.
- **SEO:** "deadlock daily game", "deadlock krillion", "deadlock answers today" → Ledger pages.
- **Virality loops:** share card with constellation OG image; friend invites; lobby links.

---

## 9. Analytics & success metrics

Events: `title_view, run_start, round_serve, guess, round_result{tier}, run_finish, share{channel},
freedive_start, lobby_create/join, signup, flag_submit, ad_impression`.

| Metric | 30-day target | 90-day target |
|---|---|---|
| Daily completion rate | ≥ 80% | ≥ 85% |
| Share rate (per completion) | ≥ 12% | ≥ 15% |
| D1 / D7 retention | 35% / 18% | 40% / 22% |
| Free Dive sessions per Daily player | 0.6 | 1.0 |
| DAU | 2k | 10k |
| Ad RPM (per 1k sessions) | $3 | $8 (gaming network) |

---

## 10. Legal & trust

- Footer + About + share page: *"Urn Run is an unofficial fan game. It is not affiliated with,
  endorsed, sponsored, or approved by Valve Corporation. Deadlock and all related names are
  trademarks of Valve."*
- Takedown/contact email on every page; respond within 48 h.
- No Valve logos/art/fonts/audio; no "Deadlock" in the domain or logo; no real-person likenesses.
- Don't use "Krillion" anywhere (name, copy, metadata, SEO keywords limited to descriptive genre use
  in blog-style text only).
- Privacy: anon by default, minimal data, IP hashes ≤ 48 h, CMP for ads.
- Get a one-time 30-min IP lawyer review before ads go live *(optional; cost outside launch budget)*.

---

## 11. Quality bar & testing (per global rules)

- **TDD** for `packages/core` (matching, normalization, scoring, rarity, schedule, RNG) → ≥ 90% coverage.
- Worker integration tests (vitest-pool-workers): run lifecycle, timing enforcement, rarity recompute,
  lobby DO protocol. ≥ 80% coverage overall.
- **E2E (Playwright):** daily flow, free dive, archive, share, lobby (2 browser contexts), login merge.
- **Visual regression:** title, round, each tier reveal (frozen frame), each zone, Ledger — at 320 /
  768 / 1024 / 1440.
- **A11y:** axe on all routes; keyboard-only run; reduced-motion snapshot set.
- **Perf:** Lighthouse CI budgets in §5.7; frame-time probe on throttled mobile profile.
- **Cross-browser:** Chrome, Firefox, Safari (incl. iOS audio unlock).

---

## 12. Risks & mitigations

| Risk | L | I | Mitigation |
|---|---|---|---|
| Valve takedown | L | H | no Valve assets; disclaimers; no sales; fast takedown response; brand not "Deadlock" |
| Competitor entrenches first | M | M | ship in ~2 weeks; out-polish; multiplayer + data-grounded rarity |
| Prompt quality (founder casual) | M | H | data-generated answer sets; 2–3 expert reviewers from Discord; flag queue |
| Valid answers rejected (top Krillion complaint) | M | M | generous aliases, fuzzy confirm, flag + 5 s refund, retro-scoring |
| Patch drift breaks prompts | M | M | patch watch cron; 48 h freeze on scheduled prompts; version-pinned snapshots |
| AdSense rejection | M | M | content pages before applying; fallback Journey (1k sessions) |
| D1 write limits | M | L | DO tallies batch-flush; Workers Paid $5 |
| Cheating on leaderboard | M | L | server-authoritative scoring; percentile not raw boards |
| Polish scope creep delays launch | M | M | P0/P1 tagging; Hot Urn may slip; zone art can ship at 80% |
