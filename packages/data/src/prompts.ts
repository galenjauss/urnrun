import { buildAnswerIndex, type Tier } from "@urnrun/core";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { resolveAnswerSource, type AnswerSource } from "./sources";
import type { Snapshot } from "./transform";

/** Prompt file format (content/prompts/*.yaml, private repo) — SPEC §4.1. */

const TierSchema = z.enum(["trooper", "wise_guy", "guardian", "walker", "mid_boss", "rejuvenator"]);
const Scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const Condition = z.union([
  Scalar,
  z.object({ includes: Scalar }),
  z.object({ contains: z.string().min(1) }),
  z.object({ in: z.array(Scalar) }),
  z.object({ gte: z.number() }),
  z.object({ lte: z.number() }),
]);

export const CategorySchema = z.enum(["heroes", "items", "lore", "community"]);

export const PromptFileSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes only"),
  status: z.enum(["draft", "approved", "retired"]).default("draft"),
  category: CategorySchema,
  text: z.string().min(8).max(120),
  answer_source: z
    .object({
      entity: z.enum(["heroes", "abilities", "items"]),
      where: z.record(z.string(), Condition).optional(),
      includeUnreleased: z.boolean().optional(),
    })
    .optional(),
  extra_answers: z
    .array(
      z.object({
        id: z.string().min(1),
        display: z.string().min(1),
        aliases: z.array(z.string()).optional(),
      }),
    )
    .default([]),
  exclude: z.array(z.string()).default([]),
  aliases: z.record(z.string(), z.array(z.string())).default({}),
  seed_overrides: z.record(z.string(), TierSchema).default({}),
  locked: z.array(z.string()).optional(),
  rejuvenator: z.string().optional(),
  why_not: z.record(z.string(), z.string()).default({}),
  difficulty: z.number().int().min(1).max(5).default(2),
  min_answers: z.number().int().min(1).default(6),
  last_reviewed: z.string().optional(),
  reviewer: z.string().optional(),
  notes: z.string().optional(),
});

export type PromptFile = z.infer<typeof PromptFileSchema>;

export interface CompiledAnswer {
  id: string;
  display: string;
  aliases: string[];
  seedTier: Tier;
  locked: boolean;
  isRejuvenator: boolean;
  /** Prior popularity in [0,1] used for seeding (0 when unknown). */
  prior: number;
}

export interface CompiledPrompt {
  id: string;
  category: z.infer<typeof CategorySchema>;
  text: string;
  difficulty: number;
  answers: CompiledAnswer[];
  whyNot: Record<string, string>;
}

const LOCKED_COUNT = 3;
const CURATED_DEFAULT_TIER: Tier = "guardian";

/** Rank quantiles for seeding: top 30% Trooper, next 25% Guardian, next 25% Walker, rest Mid Boss. */
export function seedTierForRank(rank: number, count: number): Tier {
  const q = count <= 1 ? 0 : rank / count;
  if (q < 0.3) return "trooper";
  if (q < 0.55) return "guardian";
  if (q < 0.8) return "walker";
  return "mid_boss";
}

export function parsePromptFile(source: string, fileName: string): PromptFile {
  const result = PromptFileSchema.safeParse(parseYaml(source));
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`${fileName}: ${issue?.path.join(".") ?? ""} ${issue?.message ?? "invalid"}`);
  }
  return result.data;
}

function priorsFor(snapshot: Snapshot, source: AnswerSource): Map<string, number> {
  switch (source.entity) {
    case "heroes":
      return new Map(snapshot.heroes.map((h) => [h.slug, h.pickShare]));
    case "items":
      return new Map(snapshot.items.map((i) => [i.slug, i.purchaseShare]));
    case "abilities": {
      const heroShare = new Map(snapshot.heroes.map((h) => [h.slug, h.pickShare]));
      return new Map(snapshot.abilities.map((a) => [a.slug, heroShare.get(a.heroSlug) ?? 0]));
    }
  }
}

function assertKnown(
  promptId: string,
  ids: ReadonlySet<string>,
  refs: Iterable<string>,
  field: string,
) {
  for (const ref of refs) {
    if (!ids.has(ref)) throw new Error(`${promptId}: ${field} references unknown answer "${ref}"`);
  }
}

/**
 * @param globalAliases shared community shorthand keyed by answer id (content/aliases.yaml);
 *   applied to whichever answers exist in this prompt.
 */
export function compilePrompt(
  file: PromptFile,
  snapshot: Snapshot,
  globalAliases: Readonly<Record<string, readonly string[]>> = {},
): CompiledPrompt {
  const fromData = file.answer_source ? resolveAnswerSource(snapshot, file.answer_source) : [];
  const priors = file.answer_source ? priorsFor(snapshot, file.answer_source) : new Map();
  const excluded = new Set(file.exclude);
  const merged = new Map<string, { id: string; display: string; aliases: string[] }>();
  for (const a of fromData) if (!excluded.has(a.id)) merged.set(a.id, { ...a, aliases: [] });
  for (const a of file.extra_answers) merged.set(a.id, { ...a, aliases: [...(a.aliases ?? [])] });

  const ids = new Set(merged.keys());
  assertKnown(file.id, ids, Object.keys(file.aliases), "aliases");
  assertKnown(file.id, ids, Object.keys(file.seed_overrides), "seed_overrides");
  assertKnown(file.id, ids, file.locked ?? [], "locked");
  if (file.rejuvenator) assertKnown(file.id, ids, [file.rejuvenator], "rejuvenator");

  if (merged.size < file.min_answers) {
    throw new Error(`${file.id}: only ${merged.size} answers (min_answers ${file.min_answers})`);
  }

  // Seed tiers from priors by popularity rank (pick/purchase rates are too flat for the live
  // crowd-share thresholds): top → Trooper … long tail → Mid Boss. Live data takes over at n ≥ 200.
  const dataIds = [...ids]
    .filter((id) => (priors.get(id) ?? 0) > 0)
    .sort((a, b) => priors.get(b)! - priors.get(a)! || (a < b ? -1 : 1));
  const rankTier = new Map(
    dataIds.map((id, rank) => [id, seedTierForRank(rank, dataIds.length)] as const),
  );
  const lockedIds = new Set(file.locked ?? dataIds.slice(0, LOCKED_COUNT));

  const answers: CompiledAnswer[] = [...merged.values()].map((a) => {
    const isRejuvenator = a.id === file.rejuvenator;
    const locked = lockedIds.has(a.id) && !isRejuvenator;
    const dataTier: Tier = rankTier.get(a.id) ?? CURATED_DEFAULT_TIER;
    const seedTier: Tier = isRejuvenator
      ? "rejuvenator"
      : locked
        ? "trooper"
        : (file.seed_overrides[a.id] ?? dataTier);
    return {
      id: a.id,
      display: a.display,
      aliases: [
        ...new Set([...a.aliases, ...(globalAliases[a.id] ?? []), ...(file.aliases[a.id] ?? [])]),
      ],
      seedTier,
      locked,
      isRejuvenator,
      prior: priors.get(a.id) ?? 0,
    };
  });

  // Validates alias collisions and why-not clashes (throws with a clear message).
  buildAnswerIndex({ answers, whyNot: file.why_not });

  return {
    id: file.id,
    category: file.category,
    text: file.text,
    difficulty: file.difficulty,
    answers,
    whyNot: { ...file.why_not },
  };
}
