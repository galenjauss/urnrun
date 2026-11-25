import { describe, expect, it } from "vitest";
import { sqlInsert, sqlString, sqlValue } from "./sql";

describe("sql helpers", () => {
  it("escapes single quotes", () => {
    expect(sqlString("Djinn's Mark")).toBe("'Djinn''s Mark'");
  });

  it("formats values", () => {
    expect(sqlValue(null)).toBe("NULL");
    expect(sqlValue(true)).toBe("1");
    expect(sqlValue(false)).toBe("0");
    expect(sqlValue(42)).toBe("42");
    expect(() => sqlValue(Number.NaN)).toThrow();
  });

  it("builds inserts and rejects unsafe identifiers", () => {
    expect(sqlInsert("prompts", { id: "a", difficulty: 2 }, "INSERT OR REPLACE")).toBe(
      "INSERT OR REPLACE INTO prompts (id, difficulty) VALUES ('a', 2);",
    );
    expect(() => sqlInsert("prompts; DROP", { id: "a" })).toThrow();
    expect(() => sqlInsert("prompts", { "id) --": "a" })).toThrow();
  });
});
