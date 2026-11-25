import { describe, expect, it } from "vitest";
import { base64url, hmac, randomId, safeEqual, verifyHmac } from "./crypto";

describe("crypto helpers", () => {
  it("signs deterministically and verifies", async () => {
    const a = await hmac("secret", "run.user.1");
    expect(a).toBe(await hmac("secret", "run.user.1"));
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await verifyHmac("secret", "run.user.1", a)).toBe(true);
    expect(await verifyHmac("secret", "run.user.2", a)).toBe(false);
    expect(await verifyHmac("other", "run.user.1", a)).toBe(false);
  });

  it("refuses an empty secret", async () => {
    await expect(hmac("", "x")).rejects.toThrow(/not configured/);
  });

  it("compares safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });

  it("produces url-safe random ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(base64url(new Uint8Array([251, 255]))).toBe("-_8");
  });
});
