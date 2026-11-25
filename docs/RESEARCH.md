# Urn Run — Research Digest

> Compiled 2026-11-25 from five parallel research passes (Krillion, Targon Climb, Deadlock data,
> monetization + polish, mods/portrait art). Claims carry source URLs; items marked *(unverified)*
> came from search snippets or blocked pages. Reddit was unreachable by all agents.

---

## 1. Krillion — the genre-defining original

**What it is.** <https://krillion.io> — "the daily dive." A once-a-day *rare-answer trivia* game:
7 prompts, 25 s each, name one valid answer; the *less common* your answer, the more points, and a
pixel-art krill sinks deeper. Obvious answers "float."

| Fact | Detail |
|---|---|
| Creator | Solo dev "kp", 23-yo American CS grad (<https://krillion.io/faq>) |
| Launch | 2026-07-16 (`/api/today` → `dayNumber:133` on 2026-11-25) |
| Reset | Midnight ET (`resetsAt 05:00Z`) |
| Stack | Next.js App Router (Turbopack) on Vercel, React, Tailwind, Firebase Auth (anon + Google), own API routes, GA4, Mediavine, Stripe Payment Links, Shopify merch |
| Rendering | Canvas 2D layered ocean (`ds-sea`, `ds-fore`), pixel sprites from palette data in code |
| Audio | 100% WebAudio oscillator synthesis — **zero audio files** |
| Font | VT323 |
| Traffic | Similarweb Oct 2026: global rank #231 (from #1,357 in 3 mo), +371% MoM, US 50%, 59.9% direct, YouTube top social. Creator claims **6M DAU** *(unverified)* |
| Press | Fast Company, Evening Standard/AOL ("challenging Wordle"), GameRant daily answer guides, classroom play |

### Core loop (from the bundle's state machine `intro → preview → answering → feedback → done`)
1. **Intro** — "dive #N", streak, ad slot, **▼ BEGIN DESCENT ▼**. Rules: 7 prompts/day, same for
   everyone; 25 s; rare scores big; "the pick that feels clever? the school thought of it too";
   every point sinks you 10 m, 700 = the trench; one dive per day.
2. **Preview 3 s** — prompt shown before clock (`PREVIEW_MS=3000`).
3. **Answering 25 s** — free-text; invalid → `"X": no echo. try again` (unlimited retries until
   time); near-miss → "X corrects to Y — submit again to confirm".
4. **Feedback** — krill sinks, tier + points; timeout → 0 (⬛).
5. ×7 → **Results** — total, verdict band (Plankton ≤150 … One in a Krillion 450+), percentile
   curve, "the catch" (every answer + how many picked it), share, friends board, rating, ads.

| Tier | Pts | Emoji | Note |
|---|---|---|---|
| Plankton | 10 | 🫧 | most common |
| **Too Clever** | 15 | 🤡 | *penalty* for the go-to "obscure" pick everyone reaches for |
| Schooler | 30 | 🐟 | |
| Rare | 60 | 🦑 | |
| Deep Cut | 85 | 🏮 | |
| One in a Krillion | 100 | 🌟 | one hand-picked answer per prompt, chosen for fun |

Depth landmarks scroll by (332 m deepest scuba … Titanic 3,800 m … Hadal 6,000 m … trench 7,000 m).

**Modes:** Daily (free) · Archive (replays don't extend streak) · Endless ($5) · Themed packs ($5
each, currently "free for now · BETA") · **Puffer Party** (2–16 player live hot-potato, Elo quick
play, inspired by JKLM BombParty) · 60-s blitz beta.

**Meta:** streak-unlocked cosmetic "dive buddies" (5/14/30/45/60/75/100/150 days) + gold variants;
optional Google sign-in syncs.

**Monetization:** Mediavine (160×600 rail, 300×250 results, adhesion units) · $5 unlocks remove ads
sitewide · merch store · Youtooz plush deposit campaign · cross-promo to sibling game Chainle.

**Why it sticks:** daily reset + streaks + streak cosmetics; spoiler-free emoji share
(`Krillion #133 🦐 / 412 / 🦑🐟🌟⬛🏮🫧🦑`); "the catch" social reveal; *being more individual than
others*; ~3.5 min session (Similarweb avg 5:16, 4.48 pages/visit).

**Complaints:** US-centric prompts; valid answers rejected; Enter/loading bugs; party mode
stressful; paying for more than one game/day (Trustpilot, n=5).

**Origins/clones:** BBC *Pointless* *(unverified quote)*; "second DLE renaissance" — 34+ clones by
2026-11-20 (<https://dles.gg/blog/games-like-krillion>): Wormillion, Fumbillion, Daily Delve,
Noillirk (inverse), Rarely (RPG damage), Minecraft/NBA variants.

---

## 2. Targon Climb — the polish bar (League of Legends)

<https://targonclimb.com> · "Daily League of Legends Quiz" · launched **2026-11-12** · anonymous
creator ("I vibecoded ts ✌️"; page carries a `claude:` meta tag → likely Claude-built).

**Stack:** one ~596 KB hand-written HTML file, no framework, Cloudflare-served; **every visual is
procedural Canvas 2D** (21 contexts, no images); **all sound synthesized**; Supabase RPCs
(`targon_day_answers`, `targon_daily_rank`, …); anon localStorage id; answer data XOR-obfuscated.

**Loop:** painted Mount Targon title (time-of-day from local clock, weather seeded by date) →
mandatory How-to-play → 7 prompts × 30 s (5 gameplay + 2 lore; no-repeat windows 4 / 8 days) →
wrong guesses only cost time; shorthand accepted (MF, J4, PTA); 1–2-letter typo → "Did you mean";
**plausible wrong answers get a specific "why not"**; "This should count" flag (+5 s first time) →
altimeter + 7 progress gems, camera climbs.

| Tier (jungle monsters) | Altitude |
|---|---|
| Krug | +100 m |
| Scuttle Crab ("sounds rare, loads said it") | +150 m |
| Raptor | +200 m |
| Gromp | +350 m |
| Rift Herald | +550 m |
| Baron | +750 m |
| Elder Dragon ("almost nobody") | +1,000 m |

10 named lore zones with rank titles and unique arrival FX; scripted **ceremonies** (summit, perfect
7, Elder chains draw a dragon constellation).

**Rarity engine (best-in-class):** seeded tiers from op.gg pick rates + wikis → **live recount every
10 min** from player answers; tier from share of players who said something more common; **max +1
tier above seed**; obvious answers locked at bottom; Elder needs <1.5% + rare seed + sample size;
tiers frozen mid-climb.

**Modes:** Daily · Free Climb (after daily) · Past climbs · Avalanche (endless, 3 lives) ·
**Summit Showdown** (live lobbies, 5-letter code, server clock, +50 m for unique answer) · hidden admin.

**Retention:** 4-line share (score, zone, colorblind-safe bar row, percentile, URL) · streaks that
survive maintenance · percentile · crowd answer reveal · friends codes (beta) · badges · polls ·
feedback with dev replies · **streamer spoiler mode** · colorblind palettes · reduced motion.

**Monetization:** none ("no accounts, no ads, no tracking"). Copycat domains (.net clone, .org SEO
guide) run Adsterra — proof of search demand.

**Visual:** full-bleed painted mountain right, UI left on scrim; Marcellus SC + Barlow Semi
Condensed; critically-damped spring camera; staged quality degradation; per-tier synthesized voices.

**Legal:** uses **zero Riot imagery**; Riot "Legal Jibber Jabber" disclaimer verbatim.

---

## 3. Direct Deadlock competitors

| Site | Format | Notes |
|---|---|---|
| **deadlockrillion.site** | Krillion clone, launched ~2026-11-22 | 7 × 25 s; souls 100→1,000 via `100 + 900×rarity`; theme = **lane push to enemy Patron**; result tiers = **Deadlock ranks** (Initiate…Eternus); weekly packs; data from deadlock-api nightly + wiki; ads "when shown"; plain server HTML, **low polish** |
| deadlock-api.com Deadlockdle | dle hub | hero/item/sound/ability, higher-lower, guess the rank; Patreon |
| deadlockdle.day (Taxon Games) | 4 dle modes | Ko-fi, "nothing for sale" |
| deadlocklabs.gg Deadle | 14 modes | |
| deadlockle.com, deadlockdle.net, lockdle.net | dle modes | |

**Implication:** the obvious theme (souls/lanes/ranks) is taken. We win on (1) a distinct fantasy,
(2) Targon-level craft, (3) a better rarity engine seeded with *real match data*, (4) multiplayer.

---

## 4. Deadlock data & assets

**Primary source: deadlock-api** — `https://api.deadlock-api.com` (OpenAPI 3.1, 126 paths; MIT code;
no auth; CORS `*`). ⚠ `assets.deadlock-api.com` is **dead** — use `/v1/assets/*` on the api host.

| Endpoint | Content |
|---|---|
| `/v1/assets/heroes?only_active=true&client_version=N` | 65 records (44 selectable; Violet & Baba in-dev): tags, `hero_type`, complexity, gun_tag, lore/role/playstyle, starting stats, ability slot map |
| `/v1/assets/items` (+ `/by-slot-type/{weapon,vitality,spirit}`) | 782 entries: 437 abilities, 250 upgrades (**173 shopable**: weapon 56 / vitality 61 / spirit 56), 95 weapons. Tiers: 800 / 1,600 / 3,200 / 6,400 / **9,999 (17 legendaries)** |
| `/v1/assets/ranks` | 12 tiers × 6 subranks (Obscurus … Eternus) |
| `/v1/assets/map`, `/generic-data` | lanes, objectives, bounties (T1 guardian 1,375; T2 3,675; shrines 2,000), ziplines, camps |
| `/v1/assets/steam-info` | live build (`client_version 6868`, 2026-11-24) — pin snapshots to it |
| `/v1/patches`, `/v2/patches` | changelog RSS + Steam news |
| `/v1/analytics/hero-stats`, `item-stats`, … | **pick/win/purchase rates** (~577k matches/day ingested) → rarity priors |

Rate limits: assets cached (1 h); analytics budgeted per IP (26 GB-read/min); `/v1/sql` 2/min.
Descriptions contain raw HTML/SVG → sanitize. **No hi-res splash art exists** (max hero card 280×380).

**Fallback/complement:** <https://github.com/deadlock-wiki/deadlock-data> (MIT, daily pushes):
hero/item/ability JSON, localizations, changelogs, **`HeroReleases` dates** (not in deadlock-api).
Upstream: SteamDatabase/GameTracking-Deadlock (hours after each build).

**Wiki** (deadlock.wiki): MediaWiki + Bucket (Bucket data empty today); Cloudflare-blocks scripts;
**text is CC BY-NC-SA → no commercial reuse of prose**. Facts are fine; rewrite in our words.

**Audio:** deadlock-api lists 133,860 MP3s (119,632 VO). All Valve copyright → **we use none.**

**Status:** still invite-only beta, release TBA; Ranked Beta S2 from 2026-11-05; all-time peak
~303k CCU (Oct 2026), Nov avg ~157–165k CCU.

**Community:** Deadlock Community Discord ~350k members; r/DeadlockTheGame (size unverified);
forums.playdeadlock.com; Liquipedia; Deadfrag.

---

## 5. Legal posture (not legal advice)

- **Valve has no published fan-content policy.** Steam Subscriber Agreement §2.D: fan art allowed
  "solely on a non-commercial basis." Commercial use of Valve IP formally needs approval.
- **Practice:** ad-supported Valve fan/stat sites run openly (Dotadle, Dotabuff, Tracker.gg $3 ad-free,
  Statlocker, Tracklock). Enforcement targets *asset redistribution in games* (TF2:Source 2 DMCA 2024)
  and *real-money sales on Valve IP* (Dota custom-game battle passes 2023).
- **Risk ladder:** display ads on free game (low) → tip jar w/ no perks (low) → ad-free tier (medium)
  → selling anything with Valve art/names (high).
- **Riot's policy** (the closest written analogue): free only, passive ads OK, no paywalls.

---

## 6. Monetization benchmarks

| Data point | Figure |
|---|---|
| LoLdle family | ~5M PV/mo; full-time income; switched to Venatus → +30% RPM (<https://www.venatus.com/case-studies/loldle-case-study>). Dotadle = Valve-IP dle running ads at scale |
| Actorle/Moviedle | ~$3–4k/mo after press |
| Small site | 40,920 visits → $261 (~$6 RPM) |
| Nitro (Nov 2026, 806 domains) | browser games earn **2.8× network avg per session**; trivia/pop-culture **$20–28 / 1k sessions (US)**; dle games 55–70% mobile |
| Realistic for global, young, Deadlock audience | **$2–6 / 1k sessions AdSense; $8–15 gaming network** |

| Network | 2026 entry bar |
|---|---|
| AdSense | none (needs real content pages; H5 rewarded = closed beta) |
| Journey by Mediavine | 1k sessions/mo |
| Raptive | 25k PV/mo **and** ≥50% tier-1 geo under 100k |
| Ezoic | 250k MAU (new sites) |
| Playwire | 500k PV/mo |
| Venatus / Nitro / Snigel | gaming specialists, no published minimums |

**Projection** (1.3 sessions/DAU/day): 1k DAU → $40–250/mo · 10k → $1.5–5k · 100k → $25–60k.
Virality ≫ ad optimization.

---

## 7. Polish & tech findings

- Talks: *Juice It or Lose It* (Jonasson & Purho, GDC EU 2012); *The Art of Screenshake* (Nijman,
  INDIGO 2013); *Juicing Your Cameras With Math* (Eiserloh); Swink's *Game Feel*.
- Techniques: spring easing, anticipation/overshoot, staggered reveals, hit-stop 50–120 ms,
  trauma² noise shake, particles, number roll-ups, pitch-randomized layered SFX, haptics
  (`navigator.vibrate` Android; iOS needs `<input type=checkbox switch>` hack), reduced-motion gates.
- Bundle sizes (min+gz, full import): GSAP 3.15 **27 KB (free incl. plugins since 2025)** · Motion 63 KB
  (mini `animate` few KB) · Howler 9 KB · canvas-confetti 4 KB · PixiJS 8 276 KB · Phaser 4 348 KB ·
  Tone.js 81 KB · Rive 88 KB + WASM.
- Both reference games prove **Canvas 2D + WebAudio synthesis** reaches "AAA-indie" feel at near-zero
  asset weight.
- Cloudflare: D1 free tier daily read/write limits **enforced since 2026-09-01**; Durable Objects free
  100k req/day (SQLite-backed) — ideal for lobbies and per-day tallies.
- Anti-cheat: server-authoritative scoring + server-side timing + signed run tokens + plausibility.

---

## 8. Mods & portrait art

- GameBanana Deadlock: ~12.8k mods. Popular portrait packs: DEADLOCK TOASTED (~157k dl), Catlock
  (~166k), DARKEST DEADLOCK gothic-ink (~48k; artist "eyehead" open to commissions).
- Top skins are mostly **crossovers** (Gojo Doorman/JJK, Gordon Freeman Venator, 2B Yamato, One Piece
  Ace Infernus, DK & Diddy Mo & Krill, Bloodborne Silver) or **celebrities** (LeBron James Abrams
  ~71k views, 50 Cent Warden), plus many NSFW-leaning.
- **Default GameBanana license: "Use commercially: NO"** (verified on Gojo Doorman).
- ⇒ Mod skins as portraits would stack third-party IP + right-of-publicity risk on top of Valve's.
  **Decision:** original art-deco *sigil medallions* as default portraits; meme mods used as
  *content* (prompts, credited "Mod of the Week" link-outs); alt skins only with written creator
  permission and original designs.
- Commission math for later: 44 deco busts ≈ $1.8k (budget) – $5.3k (mid-tier).
- AI-generated portraits: not copyrightable (USCO Part 2, Jan 2025), still derivative, fan backlash → avoid.
- Deadlock ships **Jost** (OFL) among its fonts — legit shared typographic DNA. Valve Pulp/Oracle/
  Radiance/Reaver/Retail are proprietary → don't use.
