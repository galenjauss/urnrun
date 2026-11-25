import { z } from "zod";

/** Raw API subsets we depend on (unknown keys are stripped). */

export const SteamInfoSchema = z.object({
  client_version: z.number().int().positive(),
  version_date: z.string().optional(),
});

const Description = z
  .object({
    desc: z.string().optional(),
    active: z.string().optional(),
    passive: z.string().optional(),
  })
  .partial()
  .nullish();

export const RawHeroSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  class_name: z.string(),
  hero_type: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  complexity: z.number().int().nullish(),
  gun_tag: z.string().nullish(),
  gender: z.string().nullish(),
  player_selectable: z.boolean().nullish(),
  disabled: z.boolean().nullish(),
  in_development: z.boolean().nullish(),
  items: z.record(z.string(), z.string()).nullish(),
});

export const RawItemSchema = z.object({
  type: z.string(),
  id: z.number().int(),
  class_name: z.string(),
  name: z.string().nullish(),
  ability_type: z.string().nullish(),
  item_slot_type: z.string().nullish(),
  item_tier: z.number().int().nullish(),
  cost: z.number().nullish(),
  is_active_item: z.boolean().nullish(),
  shopable: z.boolean().nullish(),
  description: Description,
  properties: z.record(z.string(), z.unknown()).nullish(),
});

export const RawHeroStatSchema = z.object({
  hero_id: z.number().int(),
  matches: z.number().nonnegative(),
});
export const RawItemStatSchema = z.object({
  item_id: z.number().int(),
  matches: z.number().nonnegative(),
});

export const SlotSchema = z.enum(["weapon", "vitality", "spirit"]);
export type Slot = z.infer<typeof SlotSchema>;
