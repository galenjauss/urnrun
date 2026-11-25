import { ZONES } from "@urnrun/core";
import { describe, expect, it } from "vitest";
import { applyKick, calmJuice, kickFor, noise1, shakeOffset, stepJuice } from "./juice";
import { newMonitor, sampleFrame, type QualityMonitor } from "./quality";
import { stepSpring, springSettled } from "./spring";
import { BLEND_FT, LOOKS, blendAt } from "./zones";

describe("stepSpring", () => {
  it("converges to the target without overshoot", () => {
    let s = { value: 0, velocity: 0 };
    let max = 0;
    for (let i = 0; i < 240; i++) {
      s = stepSpring(s, 100, 6, 1 / 60);
      max = Math.max(max, s.value);
    }
    expect(max).toBeLessThanOrEqual(100.0001);
    expect(springSettled(s, 100)).toBe(true);
  });

  it("is frame-rate independent", () => {
    let a = { value: 0, velocity: 0 };
    let b = { value: 0, velocity: 0 };
    for (let i = 0; i < 30; i++) a = stepSpring(a, 1, 5, 1 / 30);
    for (let i = 0; i < 120; i++) b = stepSpring(b, 1, 5, 1 / 120);
    expect(a.value).toBeCloseTo(b.value, 6);
  });

  it("ignores non-positive dt", () => {
    const s = { value: 3, velocity: 1 };
    expect(stepSpring(s, 0, 5, 0)).toBe(s);
  });
});

describe("juice", () => {
  it("matches the juice spec beats", () => {
    expect(kickFor("wise_guy")).toMatchObject({ hitStopMs: 90, trauma: 0.25 });
    expect(kickFor("walker").hitStopMs).toBe(110);
    expect(kickFor("rejuvenator")).toMatchObject({ dilateMs: 400, dilateScale: 0.3 });
  });

  it("escalates with rarity", () => {
    const order = ["trooper", "guardian", "walker", "mid_boss", "rejuvenator"] as const;
    const souls = order.map((t) => kickFor(t).souls);
    expect([...souls].sort((a, b) => a - b)).toEqual(souls);
  });

  it("freezes scene time during hit-stop, then resumes", () => {
    const j = applyKick(calmJuice(), kickFor("wise_guy"), false);
    const a = stepJuice(j, 50);
    expect(a.sceneMs).toBe(0);
    const b = stepJuice(a.juice, 60);
    expect(b.sceneMs).toBeCloseTo(20);
    expect(b.juice.hitStopMs).toBe(0);
  });

  it("dilates time for the rejuvenator", () => {
    const j = applyKick(calmJuice(), kickFor("rejuvenator"), false);
    const { sceneMs, juice } = stepJuice(j, 100);
    expect(sceneMs).toBeCloseTo(30);
    expect(juice.dilateMs).toBe(300);
    const end = stepJuice({ ...juice, dilateMs: 10 }, 20);
    expect(end.sceneMs).toBeCloseTo(3 + 10);
    expect(end.juice.dilateScale).toBe(1);
  });

  it("drops shake, stops and dilation under reduced motion", () => {
    const j = applyKick(calmJuice(), kickFor("rejuvenator"), true);
    expect(j.trauma).toBe(0);
    expect(j.hitStopMs).toBe(0);
    expect(j.dilateMs).toBe(0);
    expect(j.flash).toBeGreaterThan(0);
  });

  it("decays trauma and caps it at 1", () => {
    let j = calmJuice();
    for (let i = 0; i < 5; i++) j = applyKick(j, kickFor("mid_boss"), false);
    expect(j.trauma).toBe(1);
    expect(stepJuice(j, 1000).juice.trauma).toBe(0);
  });

  it("produces bounded, trauma-squared shake", () => {
    for (let t = 0; t < 5; t += 0.37) {
      expect(Math.abs(noise1(t))).toBeLessThanOrEqual(1);
    }
    const still = shakeOffset(0, 1, 20, noise1);
    expect(Math.abs(still.x) + Math.abs(still.y) + Math.abs(still.rot)).toBe(0);
    const s = shakeOffset(0.5, 1.3, 20, () => 1);
    expect(s.x).toBeCloseTo(5);
  });
});

describe("quality monitor", () => {
  const feed = (m: QualityMonitor, ms: number, n: number) => {
    for (let i = 0; i < n; i++) m = sampleFrame(m, ms);
    return m;
  };

  it("drops a tier after a slow window", () => {
    expect(feed(newMonitor(2), 33, 45).tier).toBe(1);
  });

  it("never drops below low", () => {
    expect(feed(newMonitor(0), 50, 200).tier).toBe(0);
  });

  it("climbs back only after several fast windows", () => {
    expect(feed(newMonitor(1), 8, 45 * 3).tier).toBe(1);
    expect(feed(newMonitor(1), 8, 45 * 4).tier).toBe(2);
  });

  it("ignores stalls such as tab switches", () => {
    expect(feed(newMonitor(2), 1000, 100).tier).toBe(2);
  });
});

describe("zone blending", () => {
  it("has a look for every zone, in order", () => {
    expect(LOOKS.map((l) => l.id)).toEqual(ZONES.map((z) => z.id));
  });

  it("is pure curb at the street", () => {
    expect(blendAt(0)).toMatchObject({ from: { id: "curb" }, t: 0 });
  });

  it("crossfades into each zone, arriving fully at its depth", () => {
    const platform = ZONES[1]!.depth;
    expect(blendAt(platform - BLEND_FT - 1)).toMatchObject({ to: { id: "curb" } });
    const mid = blendAt(platform - BLEND_FT / 2);
    expect(mid).toMatchObject({ from: { id: "curb" }, to: { id: "platform" } });
    expect(mid.t).toBeCloseTo(0.5);
    expect(blendAt(platform)).toMatchObject({ to: { id: "platform" }, t: 1 });
  });

  it("ends in the hearth", () => {
    expect(blendAt(99_999)).toMatchObject({ to: { id: "hearth" }, t: 1 });
  });
});
