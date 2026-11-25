import { DAY_ONE_UTC, dayNumber as coreDay } from "@urnrun/core";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM helper without types
import { DAY_ONE_UTC as SEED_DAY_ONE, dayNumber, seedSql } from "./seed.mjs";

describe("e2e fixture seed", () => {
  it("uses the same launch epoch and day numbering as core", () => {
    expect(SEED_DAY_ONE).toBe(DAY_ONE_UTC);
    const d = new Date("2027-03-04T22:15:00Z");
    expect(dayNumber(d)).toBe(coreDay(d));
  });

  it("schedules today and yesterday with seven fixture prompts", () => {
    const sql = seedSql(10) as string;
    expect(sql).toContain('VALUES (9, \'["e2e-p0"');
    expect(sql).toContain('VALUES (10, \'["e2e-p0"');
    expect(sql.match(/INSERT OR REPLACE INTO prompts/g)).toHaveLength(14);
    expect(sql).not.toMatch(/Deadlock|Valve/);
  });
});
