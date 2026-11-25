/** Minimal raw API payloads for tests (shapes mirror api.deadlock-api.com v1). */
export const rawSteamInfo = { client_version: 6868, version_date: "Nov 24 2026" };

export const rawHeroes = [
  {
    id: 1,
    name: "Infernus",
    class_name: "hero_inferno",
    hero_type: "mystic",
    tags: ["Arsonist", "Explosive"],
    complexity: 1,
    gun_tag: "Rapid Fire",
    gender: "male",
    player_selectable: true,
    disabled: false,
    in_development: false,
    items: {
      weapon_primary: "citadel_weapon_inferno_set",
      signature1: "ability_incendiary_projectile",
      signature2: "ability_flame_dash",
      signature3: "ability_afterburn",
      signature4: "ability_fire_bomb",
    },
  },
  {
    id: 99,
    name: "Baba",
    class_name: "hero_baba",
    hero_type: "brawler",
    tags: [],
    complexity: 2,
    gun_tag: "Shotgun",
    gender: "female",
    player_selectable: true,
    disabled: false,
    in_development: true,
    items: { signature1: "ability_baba_brew" },
  },
];

const ability = (class_name: string, name: string, ability_type: string, props: string[]) => ({
  type: "ability",
  id: class_name.length * 1000 + name.length,
  class_name,
  name,
  ability_type,
  description: {
    desc: `<span class="highlight">${name}</span> does things.<svg><path d="M1"/></svg>`,
  },
  properties: Object.fromEntries(props.map((p) => [p, { value: 1 }])),
});

export const rawItems = [
  ability("ability_incendiary_projectile", "Catalyst", "signature", [
    "AbilityCooldown",
    "SlowPercent",
  ]),
  ability("ability_flame_dash", "Flame Dash", "signature", ["AbilityCooldown"]),
  ability("ability_afterburn", "Afterburn", "innate", ["DPS"]),
  ability("ability_baba_brew", "Baba's Brew", "signature", ["SilenceDuration"]),
  ability("ability_fire_bomb", "Concussive Combustion", "ultimate", [
    "StunDuration",
    "AbilityCooldown",
  ]),
  {
    type: "upgrade",
    id: 1548066885,
    class_name: "upgrade_clip_size",
    name: "Extended Magazine",
    item_slot_type: "weapon",
    item_tier: 1,
    cost: 800,
    is_active_item: false,
    shopable: true,
    description: { desc: "More <span>ammo</span>." },
    properties: {},
  },
  {
    type: "upgrade",
    id: 7,
    class_name: "upgrade_refresher",
    name: "Refresher",
    item_slot_type: "spirit",
    item_tier: 4,
    cost: 6400,
    is_active_item: true,
    shopable: true,
    description: {},
    properties: { AbilityCooldown: {} },
  },
  {
    type: "upgrade",
    id: 8,
    class_name: "upgrade_hidden",
    name: "Hidden Thing",
    item_slot_type: "vitality",
    item_tier: 2,
    cost: 1600,
    is_active_item: false,
    shopable: false,
    description: {},
    properties: {},
  },
  { type: "weapon", id: 9, class_name: "citadel_weapon_inferno_set", name: "Inferno Gun" },
];

export const rawHeroStats = [
  { hero_id: 1, matches: 750 },
  { hero_id: 99, matches: 250 },
];

export const rawItemStats = [
  { item_id: 1548066885, matches: 900, players: 600 },
  { item_id: 7, matches: 100, players: 80 },
];
