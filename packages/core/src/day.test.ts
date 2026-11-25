import { describe, expect, it } from "vitest";
import { DAY_ONE_UTC, dayNumber, dayStart, nextResetAt } from "./day";

const at = (iso: string) => new Date(iso);

describe("dayNumber", () => {
  it("is 1 on the launch day (UTC)", () => {
    expect(dayNumber(new Date(DAY_ONE_UTC))).toBe(1);
  });

  it("stays the same until 00:00 UTC, then increments", () => {
    const launch = new Date(DAY_ONE_UTC).toISOString().slice(0, 10);
    expect(dayNumber(at(`${launch}T23:59:59.999Z`))).toBe(1);
    const next = new Date(DAY_ONE_UTC + 86_400_000).toISOString().slice(0, 10);
    expect(dayNumber(at(`${next}T00:00:00.000Z`))).toBe(2);
  });

  it("is <= 0 before launch", () => {
    expect(dayNumber(new Date(DAY_ONE_UTC - 1))).toBe(0);
  });

  it("supports a custom epoch", () => {
    expect(dayNumber(at("2026-01-05T12:00:00Z"), Date.UTC(2026, 0, 1))).toBe(5);
  });
});

describe("dayStart / nextResetAt", () => {
  it("dayStart returns 00:00 UTC of the given day number", () => {
    expect(dayStart(1).getTime()).toBe(DAY_ONE_UTC);
    expect(dayStart(3).getTime()).toBe(DAY_ONE_UTC + 2 * 86_400_000);
  });

  it("nextResetAt is the next 00:00 UTC after now", () => {
    expect(nextResetAt(at("2026-11-25T20:15:00Z")).toISOString()).toBe(
      "2026-11-26T00:00:00.000Z",
    );
  });

  it("nextResetAt at exactly midnight is the following midnight", () => {
    expect(nextResetAt(at("2026-11-26T00:00:00Z")).toISOString()).toBe(
      "2026-11-27T00:00:00.000Z",
    );
  });
});
