import { describe, expect, it } from "vitest";
import { createApi } from "./api";

const env = {} as Env;

describe("API", () => {
  it("GET /api/health returns an ok envelope with day info", async () => {
    const res = await createApi().request("/api/health", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      error: unknown;
      data: { status: string; day: number; nextResetAt: string };
    };
    expect(body.ok).toBe(true);
    expect(body.error).toBeNull();
    expect(body.data.status).toBe("ok");
    expect(Number.isInteger(body.data.day)).toBe(true);
    expect(new Date(body.data.nextResetAt).getUTCHours()).toBe(0);
  });

  it("unknown API routes return a 404 error envelope", async () => {
    const res = await createApi().request("/api/nope", {}, env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      data: null,
      error: { code: "not_found", message: "Unknown API route" },
    });
  });
});
