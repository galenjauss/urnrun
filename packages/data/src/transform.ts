import { z } from "zod";
import { deriveEffects, type Effect } from "./effects";
import { sanitizeText, slugify } from "./sanitize";
import {
  RawHeroSchema,
  RawHeroStatSchema,
  RawItemSchema,
  RawItemStatSchema,
  SlotSchema,
  SteamInfoSchema,
  type Slot,
} from "./schemas";

export interface HeroAbility {
  slot: 1 | 2 | 3 | 4;
  slug: string;
  name: string;
}

export interface Hero {
  id: number;
  slug: string;
  name: string;
  type: string | null;
  tags: string[];
  complexity: number | null;
  gunTag: string | null;
  gender: string | null;
  released: boolean;
  pickShare: number;
  abilities: HeroAbility[];
}

export interface Ability {
  slug: string;
  name: string;
  heroSlug: string;
  heroName: string;
  slot: 1 | 2 | 3 | 4;
  isUltimate: boolean;
  effects: Effect[];
  description: string;
}

export interface Item {
  id: number;
  slug: string;
  name: string;
  slot: Slot;
  tier: number;
  cost: number;
  active: boolean;
  effects: Effect[];
  description: string;
  purchaseShare: number;
}

export interface Snapshot {
  schemaVersion: 1;
  clientVersion: number;
  versionDate: string | null;
  fetchedAt: string;
  heroes: Hero[];
  abilities: Ability[];
  items: Item[];
}

export interface RawPayloads {
  steamInfo: unknown;
  heroes: unknown;
  items: unknown;
  heroStats: unknown;
  itemStats: unknown;
}

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Invalid ${label}: ${issue?.path.join(".") || "(root)"} ${issue?.message ?? ""}`.trim(),
    );
  }
  return result.data;
}

function shares<K extends number>(rows: readonly { id: K; n: number }[]): Map<K, number> {
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  return new Map(rows.map((r) => [r.id, total > 0 ? r.n / total : 0]));
}

const SLOTS = [1, 2, 3, 4] as const;

export function buildSnapshot(raw: RawPayloads, fetchedAt: string): Snapshot {
  const steam = parse(SteamInfoSchema, raw.steamInfo, "steam-info (client_version)");
  const heroes = parse(z.array(RawHeroSchema), raw.heroes, "heroes");
  const items = parse(z.array(RawItemSchema), raw.items, "items");
  const heroStats = parse(z.array(RawHeroStatSchema), raw.heroStats, "hero-stats");
  const itemStats = parse(z.array(RawItemStatSchema), raw.itemStats, "item-stats");

  const byClass = new Map(items.map((i) => [i.class_name, i]));
  const pick = shares(heroStats.map((s) => ({ id: s.hero_id, n: s.matches })));
  const buy = shares(itemStats.map((s) => ({ id: s.item_id, n: s.matches })));

  const outHeroes: Hero[] = [];
  const outAbilities: Ability[] = [];
  for (const h of heroes.filter((x) => x.player_selectable !== false && !x.disabled)) {
    const heroSlug = slugify(h.name);
    const abilities: HeroAbility[] = [];
    for (const slot of SLOTS) {
      const raw = byClass.get(h.items?.[`signature${slot}`] ?? "");
      if (!raw?.name) continue;
      const slug = slugify(raw.name);
      abilities.push({ slot, slug, name: raw.name });
      outAbilities.push({
        slug,
        name: raw.name,
        heroSlug,
        heroName: h.name,
        slot,
        isUltimate: slot === 4,
        effects: deriveEffects(Object.keys(raw.properties ?? {})),
        description: sanitizeText(raw.description?.desc),
      });
    }
    outHeroes.push({
      id: h.id,
      slug: heroSlug,
      name: h.name,
      type: h.hero_type ?? null,
      tags: h.tags ?? [],
      complexity: h.complexity ?? null,
      gunTag: h.gun_tag ?? null,
      gender: h.gender ?? null,
      released: !h.in_development,
      pickShare: pick.get(h.id) ?? 0,
      abilities,
    });
  }

  const outItems: Item[] = items
    .filter((i) => i.type === "upgrade" && i.shopable && i.name)
    .flatMap((i) => {
      const slot = SlotSchema.safeParse(i.item_slot_type);
      if (!slot.success || i.item_tier == null || i.cost == null) return [];
      return [
        {
          id: i.id,
          slug: slugify(i.name!),
          name: i.name!,
          slot: slot.data,
          tier: i.item_tier,
          cost: i.cost,
          active: i.is_active_item ?? false,
          effects: deriveEffects(Object.keys(i.properties ?? {})),
          description: sanitizeText(
            i.description?.desc ?? i.description?.active ?? i.description?.passive,
          ),
          purchaseShare: buy.get(i.id) ?? 0,
        },
      ];
    });

  return {
    schemaVersion: 1,
    clientVersion: steam.client_version,
    versionDate: steam.version_date ?? null,
    fetchedAt,
    heroes: outHeroes.sort((a, b) => (a.slug < b.slug ? -1 : 1)),
    abilities: outAbilities,
    items: outItems,
  };
}
