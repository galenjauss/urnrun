import { afterEach, describe, expect, it, vi } from "vitest";
import { hasSeenHowTo, loadStats, markHowToSeen, recordResult, withResult } from "./storage";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("local stats", () => {
  it("folds results without double counting a day", () => {
    let s = withResult({ played: 0, best: 0, history: {} }, 5, 2000);
    s = withResult(s, 5, 2500);
    s = withResult(s, 6, 1000);
    expect(s).toEqual({ played: 2, best: 2500, history: { "5": 2500, "6": 1000 } });
  });

  it("persists through storage and tolerates garbage", () => {
    const store = fakeStorage();
    vi.stubGlobal("localStorage", store);
    expect(hasSeenHowTo()).toBe(false);
    markHowToSeen();
    expect(hasSeenHowTo()).toBe(true);
    recordResult(1, 700);
    expect(loadStats().best).toBe(700);
    store.setItem("urnrun:stats:v1", "{not json");
    expect(loadStats().played).toBe(0);
    store.setItem("urnrun:stats:v1", '{"played":"x"}');
    expect(loadStats().played).toBe(0);
  });

  it("survives storage that throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(hasSeenHowTo()).toBe(false);
    expect(() => markHowToSeen()).not.toThrow();
    expect(recordResult(1, 100).played).toBe(1);
  });
});
