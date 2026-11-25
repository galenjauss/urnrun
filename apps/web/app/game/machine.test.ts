import { describe, expect, it } from "vitest";
import type { ServeResult, StartResult } from "./api";
import { diveReducer, initialState, nextIdx, totalSouls, type DiveState } from "./machine";

const start = (over: Partial<StartResult> = {}): StartResult => ({
  runId: "r".repeat(22),
  token: "tok",
  day: 3,
  totalRounds: 7,
  nextIdx: 0,
  finished: false,
  rounds: Array.from({ length: 7 }, (_, idx) => ({
    idx,
    status: "pending" as const,
    tier: null,
    souls: 0,
  })),
  ...over,
});

const serve = (idx: number, serverNow = 1_000): ServeResult => ({
  idx,
  prompt: { text: "Name a hero", category: "heroes" },
  servedAt: 1_000,
  opensAt: 4_000,
  deadline: 29_000,
  serverNow,
});

function answering(): DiveState {
  let s = diveReducer(initialState, { type: "started", result: start(), showHowTo: false });
  s = diveReducer(s, { type: "served", result: serve(0), clientNow: 11_000 });
  return diveReducer(s, { type: "opened" });
}

describe("diveReducer", () => {
  it("shows how-to on first visit, then serves", () => {
    const s = diveReducer(initialState, { type: "started", result: start(), showHowTo: true });
    expect(s.phase).toBe("howto");
    expect(diveReducer(s, { type: "howtoDismissed" }).phase).toBe("serving");
  });

  it("goes straight to finishing when every round is closed", () => {
    const rounds = start().rounds.map((r) => ({ ...r, status: "answered" as const }));
    const s = diveReducer(initialState, {
      type: "started",
      result: start({ nextIdx: null, rounds }),
      showHowTo: true,
    });
    expect(s.phase).toBe("finishing");
  });

  it("shifts server times by the measured clock offset", () => {
    let s = diveReducer(initialState, { type: "started", result: start(), showHowTo: false });
    s = diveReducer(s, { type: "served", result: serve(0), clientNow: 11_000 });
    expect(s.phase).toBe("preview");
    expect(s.current).toMatchObject({ opensAt: 14_000, deadline: 39_000 });
    expect(s.slots[0]!.status).toBe("open");
  });

  it("skips preview when a resumed round is already open", () => {
    let s = diveReducer(initialState, { type: "started", result: start(), showHowTo: false });
    s = diveReducer(s, { type: "served", result: serve(0, 6_000), clientNow: 6_000 });
    expect(s.phase).toBe("answering");
  });

  it("records a correct guess and reveals", () => {
    let s = diveReducer(answering(), { type: "guessing" });
    expect(s.pending).toBe(true);
    s = diveReducer(s, {
      type: "guessed",
      guess: "haze",
      result: {
        status: "correct",
        answer: { id: "haze", display: "Haze" },
        tier: "walker",
        souls: 600,
      },
    });
    expect(s.phase).toBe("reveal");
    expect(s.pending).toBe(false);
    expect(s.slots[0]).toEqual({ status: "answered", tier: "walker", souls: 600, answer: "Haze" });
    expect(totalSouls(s.slots)).toBe(600);
    expect(nextIdx(s.slots)).toBe(1);
  });

  it("keeps answering on suggest / whyNot / invalid", () => {
    const base = answering();
    const sug = diveReducer(base, {
      type: "guessed",
      guess: "hze",
      result: { status: "suggest", suggestions: [{ id: "haze", display: "Haze" }] },
    });
    expect(sug.phase).toBe("answering");
    expect(sug.feedback).toMatchObject({ kind: "suggest", guess: "hze" });

    const why = diveReducer(base, {
      type: "guessed",
      guess: "lash",
      result: { status: "whyNot", reason: "Grapple pulls him" },
    });
    expect(why.feedback).toEqual({ kind: "whyNot", guess: "lash", reason: "Grapple pulls him" });

    const inv1 = diveReducer(base, { type: "guessed", guess: "x", result: { status: "invalid" } });
    const inv2 = diveReducer(inv1, { type: "guessed", guess: "y", result: { status: "invalid" } });
    expect(inv2.feedback).toEqual({ kind: "invalid", guess: "y", seq: 2 });
  });

  it("treats an expired guess or timeout as a miss", () => {
    const viaGuess = diveReducer(answering(), {
      type: "guessed",
      guess: "late",
      result: { status: "expired" },
    });
    const viaTimer = diveReducer(answering(), { type: "expired" });
    for (const s of [viaGuess, viaTimer]) {
      expect(s.phase).toBe("reveal");
      expect(s.slots[0]).toMatchObject({ status: "expired", souls: 0, tier: null });
    }
  });

  it("ignores stale results outside answering", () => {
    const s = diveReducer(initialState, {
      type: "guessed",
      guess: "x",
      result: { status: "correct", answer: { id: "a", display: "A" }, tier: "trooper", souls: 100 },
    });
    expect(s.phase).toBe("boot");
    expect(diveReducer(initialState, { type: "expired" })).toBe(initialState);
    expect(diveReducer(initialState, { type: "revealDone" })).toBe(initialState);
    expect(diveReducer(initialState, { type: "opened" })).toBe(initialState);
    expect(diveReducer(initialState, { type: "howtoDismissed" })).toBe(initialState);
    expect(diveReducer(initialState, { type: "guessing" }).pending).toBe(false);
  });

  it("serves the next round after reveal, finishes after the last", () => {
    let s = diveReducer(answering(), { type: "expired" });
    expect(diveReducer(s, { type: "revealDone" }).phase).toBe("serving");
    s = { ...s, slots: s.slots.map((x) => ({ ...x, status: "answered" as const })) };
    expect(diveReducer(s, { type: "revealDone" }).phase).toBe("finishing");
  });

  it("handles finish, closed and failure", () => {
    const ledger = {
      mode: "daily" as const,
      day: 3,
      totalSouls: 0,
      zone: "The Curb",
      verdict: "Street Rat",
      percentile: null,
      players: 1,
      rounds: [],
      share: "",
      streak: null,
    };
    expect(diveReducer(initialState, { type: "finished", result: ledger }).phase).toBe("ledger");
    expect(diveReducer(initialState, { type: "closed", message: "none" })).toMatchObject({
      phase: "closed",
      error: "none",
    });
    expect(diveReducer(answering(), { type: "failed", message: "x" })).toMatchObject({
      phase: "error",
      pending: false,
    });
    expect(diveReducer(answering(), { type: "serving" })).toMatchObject({
      phase: "serving",
      current: null,
    });
  });
});
