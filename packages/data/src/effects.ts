/** Heuristic effect tags from ability/item property keys. Curated overrides live in content. */

export type Effect =
  | "barrier"
  | "disarm"
  | "heal"
  | "immobilize"
  | "invisibility"
  | "knockup"
  | "silence"
  | "slow"
  | "stun";

/** [effect, include pattern, exclude pattern]. Excludes drop self-effects, resistances and
 * look-alike keys (e.g. "Health" contains "Heal", "SlowResistance" is not a slow). */
const RULES: readonly (readonly [Effect, RegExp, RegExp?])[] = [
  ["stun", /Stun/, /Reduce|Self$/],
  ["silence", /Silence/],
  ["slow", /Slow/, /Resist|Ignore|Channel|Zipline/],
  ["heal", /Heal(?!th)/, /Amp|Penalty|Disable|Effectiveness|Factor|Interval|Radius/],
  ["barrier", /Barrier|Shield/, /Vs|FlavorText|Window|MinTime/],
  ["immobilize", /Immobili[sz]e|Root|Bind/],
  ["invisibility", /Invis|Stealth/],
  ["disarm", /Disarm/],
  ["knockup", /KnockUp|Knockup|Launch|Lift/],
];

export function deriveEffects(propertyKeys: readonly string[]): Effect[] {
  const found = new Set<Effect>();
  for (const key of propertyKeys) {
    for (const [effect, include, exclude] of RULES) {
      if (include.test(key) && !exclude?.test(key)) found.add(effect);
    }
  }
  return [...found].sort();
}
