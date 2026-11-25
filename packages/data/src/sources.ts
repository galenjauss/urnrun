import type { Snapshot } from "./transform";

/** Answer-set queries used by prompt files (`answer_source`). Structured, not a string DSL. */

export type Scalar = string | number | boolean | null;
export type Condition =
  | Scalar
  | { includes: Scalar }
  | { contains: string }
  | { in: readonly Scalar[] }
  | { gte: number }
  | { lte: number };

export interface AnswerSource {
  entity: "heroes" | "abilities" | "items";
  where?: Readonly<Record<string, Condition>>;
  /** Heroes and abilities: include heroes (and their abilities) still in development. */
  includeUnreleased?: boolean;
}

export interface ResolvedAnswer {
  id: string;
  display: string;
  meta?: Record<string, string>;
}

function test(value: unknown, cond: Condition): boolean {
  if (cond === null || typeof cond !== "object") return value === cond;
  if ("includes" in cond) return Array.isArray(value) && value.includes(cond.includes);
  if ("contains" in cond) {
    return typeof value === "string" && value.toLowerCase().includes(cond.contains.toLowerCase());
  }
  if ("in" in cond) return cond.in.includes(value as Scalar);
  if ("gte" in cond) return typeof value === "number" && value >= cond.gte;
  return typeof value === "number" && value <= cond.lte;
}

function filterRows<T extends object>(rows: readonly T[], where: AnswerSource["where"]): T[] {
  if (!where) return [...rows];
  const sample = rows[0];
  for (const field of Object.keys(where)) {
    if (sample && !(field in sample))
      throw new Error(`Unknown field "${field}" in answer_source.where`);
  }
  return rows.filter((row) =>
    Object.entries(where).every(([field, cond]) =>
      test((row as Record<string, unknown>)[field], cond),
    ),
  );
}

export function resolveAnswerSource(snapshot: Snapshot, source: AnswerSource): ResolvedAnswer[] {
  switch (source.entity) {
    case "heroes": {
      const pool = source.includeUnreleased
        ? snapshot.heroes
        : snapshot.heroes.filter((h) => h.released);
      return filterRows(pool, source.where).map((h) => ({ id: h.slug, display: h.name }));
    }
    case "abilities": {
      const released = new Set(snapshot.heroes.filter((h) => h.released).map((h) => h.slug));
      const pool = source.includeUnreleased
        ? snapshot.abilities
        : snapshot.abilities.filter((a) => released.has(a.heroSlug));
      return filterRows(pool, source.where).map((a) => ({
        id: a.slug,
        display: a.name,
        meta: { hero: a.heroName },
      }));
    }
    case "items":
      return filterRows(snapshot.items, source.where).map((i) => ({ id: i.slug, display: i.name }));
  }
}
