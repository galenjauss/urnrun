import { describe, expect, it } from "vitest";
import { CODE_RE, cleanName, newCode } from "./lobby";

describe("lobby helpers", () => {
  it("makes readable five-letter codes", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(CODE_RE);
    expect(newCode(() => 0)).toBe("BBBBB");
    expect(newCode(() => 0.9999)).toBe("ZZZZZ");
  });

  it("sanitises display names", () => {
    expect(cleanName("  Lady   Geist  ")).toBe("Lady Geist");
    expect(cleanName("<script>x</script>")).toBe("scriptx/script");
    expect(cleanName("a\u0000b​c")).toBe("abc");
    expect(cleanName("")).toBe("Courier");
    expect(cleanName(42)).toBe("Courier");
    expect(cleanName("x".repeat(50))).toHaveLength(20);
  });
});
