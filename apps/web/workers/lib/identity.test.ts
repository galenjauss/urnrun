import { describe, expect, it } from "vitest";
import { issueUserCookie, readUserId } from "./identity";

describe("identity cookie", () => {
  const id = "AAAAAAAAAAAAAAAAAAAAAA";
  it("round-trips a signed id", async () => {
    const cookie = await issueUserCookie(id, "s");
    expect(await readUserId(cookie, "s")).toBe(id);
  });

  it("rejects tampering, wrong secrets and junk", async () => {
    const cookie = await issueUserCookie(id, "s");
    expect(await readUserId(cookie, "other")).toBeNull();
    expect(await readUserId(cookie.replace(/^A/, "B"), "s")).toBeNull();
    expect(await readUserId(undefined, "s")).toBeNull();
    expect(await readUserId("nodot", "s")).toBeNull();
    expect(await readUserId("bad id!.sig", "s")).toBeNull();
  });
});
