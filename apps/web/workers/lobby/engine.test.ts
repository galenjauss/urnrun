import { describe, expect, it } from "vitest";
import {
  GRACE_MS,
  MAX_PLAYERS,
  PREVIEW_MS,
  REVEAL_MS,
  UNIQUE_BONUS,
  advance,
  configure,
  createLobby,
  guess,
  join,
  leave,
  publicView,
  start,
  type LobbyPrompt,
  type LobbyState,
} from "./engine";

const prompt = (i: number): LobbyPrompt => ({
  id: `p${i}`,
  category: "heroes",
  text: `Prompt ${i}`,
  whyNot: { lash: "Lash doesn't count." },
  answers: [
    { id: "seven", display: "Seven", aliases: [], tier: "trooper", isRejuvenator: false },
    { id: "viscous", display: "Viscous", aliases: ["goo"], tier: "walker", isRejuvenator: false },
    { id: "paradox", display: "Paradox", aliases: [], tier: "rejuvenator", isRejuvenator: true },
  ],
});
const prompts = Array.from({ length: 10 }, (_, i) => prompt(i));
const T = 1_000_000;

function threeRoom(): LobbyState {
  let s = createLobby("BCDFG", { id: "a", name: "Ann" }, T);
  s = join(s, { id: "a", name: "Ann" }, T); // the creator's socket arrives
  s = join(s, { id: "b", name: "Bo" }, T + 1);
  s = join(s, { id: "c", name: "Cy" }, T + 2);
  return configure(s, "a", { rounds: 5, seconds: 15 });
}

/** Start and step into the answering window of round 0. */
function answering(): { s: LobbyState; now: number } {
  const s = start(threeRoom(), "a", prompts, T);
  const now = T + PREVIEW_MS;
  return { s: advance(s, now).state, now };
}

describe("lobby membership", () => {
  it("hands the host role to the first joiner if the creator never arrives", () => {
    let s = createLobby("BCDFG", { id: "h", name: "Host" }, T);
    expect(s.players[0]!.connected).toBe(false);
    s = join(s, { id: "g", name: "Guest" }, T + 1);
    expect(s.hostId).toBe("g");
    s = join(s, { id: "h", name: "Host" }, T + 2);
    expect(s.hostId).toBe("g"); // no flip-flopping once someone is hosting
  });

  it("caps the room and treats rejoin as reconnect", () => {
    let s = createLobby("BCDFG", { id: "h", name: "Host" }, T);
    s = join(s, { id: "h", name: "Host" }, T);
    for (let i = 1; i < MAX_PLAYERS; i++) s = join(s, { id: `p${i}`, name: `P${i}` }, T + i);
    expect(() => join(s, { id: "late", name: "Late" }, T)).toThrow(/full/);
    s = leave(s, "p3");
    s = join(s, { id: "p3", name: "Back" }, T);
    expect(s.players).toHaveLength(MAX_PLAYERS);
    expect(s.players.find((p) => p.id === "p3")).toMatchObject({ connected: true, name: "Back" });
  });

  it("migrates the host to the longest-present connected player", () => {
    const s = leave(threeRoom(), "a");
    expect(s.hostId).toBe("b");
    expect(() => configure(s, "a", { rounds: 10 })).toThrow(/host/);
  });

  it("only accepts supported settings, and only from the host", () => {
    expect(() => configure(threeRoom(), "a", { rounds: 6 as 5 })).toThrow(/Unsupported/);
    expect(() => configure(threeRoom(), "b", { rounds: 10 })).toThrow(/host/);
  });
});

describe("rounds", () => {
  it("previews, then opens the clock", () => {
    const s = start(threeRoom(), "a", prompts, T);
    expect(s.phase).toBe("preview");
    expect(s.prompts).toHaveLength(5);
    expect(guess(s, "a", "Seven", undefined, T + 10).outcome.status).toBe("closed");
    expect(advance(s, T + PREVIEW_MS).state.phase).toBe("answering");
  });

  it("scores tier + uniqueness bonus and jinxes shared answers", () => {
    const started = answering();
    let s = started.s;
    const now = started.now;
    s = guess(s, "a", "Paradox", undefined, now).state;
    s = guess(s, "b", "seven", undefined, now).state;
    s = guess(s, "c", "Seven", undefined, now).state;
    expect(s.phase).toBe("reveal"); // everyone answered → reveal immediately
    const r = s.results[0]!;
    const row = (id: string) => r.rows.find((x) => x.playerId === id)!;
    expect(row("a")).toMatchObject({ souls: 1000 + UNIQUE_BONUS, unique: true, jinx: false });
    expect(row("b")).toMatchObject({ souls: 100, unique: false, jinx: true });
    expect(r.rejuvenator).toBe("Paradox");
    expect(s.players.find((p) => p.id === "a")!.souls).toBe(1250);
  });

  it("locks one answer per player; wrong guesses keep the round open", () => {
    const started = answering();
    let s = started.s;
    const now = started.now;
    const miss = guess(s, "a", "Zzzz", undefined, now);
    expect(miss.outcome.status).toBe("invalid");
    expect(guess(s, "a", "Lash", undefined, now).outcome).toEqual({
      status: "whyNot",
      reason: "Lash doesn't count.",
    });
    s = guess(s, "a", "goo", undefined, now).state;
    expect(guess(s, "a", "Paradox", undefined, now).outcome.status).toBe("closed");
  });

  it("confirms a suggestion", () => {
    const { s, now } = answering();
    const sug = guess(s, "a", "Paradx", undefined, now);
    expect(sug.outcome.status).toBe("suggest");
    expect(guess(s, "a", "Paradx", "paradox", now).outcome).toEqual({
      status: "correct",
      answer: "Paradox",
    });
  });

  it("times out, reveals, then moves on and ends on the podium", () => {
    const started = answering();
    let s = started.s;
    const now = started.now;
    s = guess(s, "a", "Seven", undefined, now).state;
    const late = advance(s, s.deadline + GRACE_MS + 1);
    expect(late.state.phase).toBe("reveal");
    expect(late.state.results[0]!.rows.find((r) => r.playerId === "b")!.souls).toBe(0);
    let state = late.state;
    for (let i = 0; i < 4; i++) {
      state = advance(state, state.revealUntil).state; // → next preview
      state = advance(state, state.deadline + GRACE_MS + 1).state; // → reveal
    }
    expect(state.round).toBe(4);
    expect(advance(state, state.revealUntil + REVEAL_MS).state.phase).toBe("podium");
  });

  it("schedules wakes for every timed phase", () => {
    const s = start(threeRoom(), "a", prompts, T);
    expect(advance(s, T).wakeAt).toBe(s.opensAt);
    const a = advance(s, s.opensAt);
    expect(a.wakeAt).toBe(s.deadline + GRACE_MS + 1);
  });

  it("rematch resets scores", () => {
    const started = answering();
    let s = started.s;
    const now = started.now;
    s = guess(s, "a", "Paradox", undefined, now).state;
    s = { ...s, phase: "podium" };
    const again = start(s, "a", prompts, now + 1);
    expect(again.players.every((p) => p.souls === 0)).toBe(true);
    expect(again.results).toEqual([]);
  });
});

describe("publicView", () => {
  it("never leaks answers mid-round, only who has answered", () => {
    const started = answering();
    let s = started.s;
    const now = started.now;
    s = guess(s, "a", "Paradox", undefined, now).state;
    const v = publicView(s, now);
    expect(JSON.stringify(v)).not.toContain("Paradox");
    expect(v.players.find((p) => p.id === "a")!.answered).toBe(true);
    expect(v.lastResult).toBeNull();
  });
});
