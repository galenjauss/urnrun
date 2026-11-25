import { buildAnswerIndex, matchGuess, soulsFor, type AnswerIndex, type Tier } from "@urnrun/core";

/**
 * Séance lobby engine (SPEC §3.10 Mode A): 1–16 players answer the same prompt at once on a server
 * clock. Score = the answer's global rarity tier + a room-uniqueness bonus when nobody else in the
 * room gave the same answer; shared answers are a "jinx". Pure — the Durable Object owns I/O.
 */

export const MAX_PLAYERS = 16;
export const UNIQUE_BONUS = 250;
export const PREVIEW_MS = 3_000;
export const GRACE_MS = 1_000;
export const REVEAL_MS = 6_000;
export const ROUND_OPTIONS = [5, 7, 10] as const;
export const SECONDS_OPTIONS = [15, 25] as const;

export type LobbyPhase = "lobby" | "preview" | "answering" | "reveal" | "podium";

export interface LobbyAnswer {
  id: string;
  display: string;
  aliases: string[];
  /** Tier fixed for the whole round (live table at round start, else the seed). */
  tier: Tier;
  isRejuvenator: boolean;
}

export interface LobbyPrompt {
  id: string;
  category: string;
  text: string;
  answers: LobbyAnswer[];
  whyNot: Record<string, string>;
}

export interface Player {
  id: string;
  name: string;
  souls: number;
  connected: boolean;
  joinedAt: number;
}

export interface Entry {
  playerId: string;
  answerId: string;
  at: number;
}

export interface ResultRow {
  playerId: string;
  name: string;
  answer: string | null;
  tier: Tier | null;
  souls: number;
  unique: boolean;
  jinx: boolean;
}

export interface RoundResult {
  idx: number;
  text: string;
  rejuvenator: string | null;
  rows: ResultRow[];
}

export interface Settings {
  rounds: (typeof ROUND_OPTIONS)[number];
  seconds: (typeof SECONDS_OPTIONS)[number];
}

export interface LobbyState {
  code: string;
  hostId: string;
  phase: LobbyPhase;
  settings: Settings;
  players: Player[];
  prompts: LobbyPrompt[];
  round: number;
  opensAt: number;
  deadline: number;
  revealUntil: number;
  entries: Entry[];
  results: RoundResult[];
}

export class LobbyError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function createLobby(
  code: string,
  host: { id: string; name: string },
  now: number,
): LobbyState {
  return {
    code,
    hostId: host.id,
    phase: "lobby",
    settings: { rounds: 7, seconds: 25 },
    // The creator counts as present only once their socket joins (no phantom hosts).
    players: [{ id: host.id, name: host.name, souls: 0, connected: false, joinedAt: now }],
    prompts: [],
    round: 0,
    opensAt: 0,
    deadline: 0,
    revealUntil: 0,
    entries: [],
    results: [],
  };
}

/**
 * Join or reconnect. New players may join at any phase; they score from the next round.
 * If the host isn't present, the joiner takes the host role.
 */
export function join(s: LobbyState, p: { id: string; name: string }, now: number): LobbyState {
  const existing = s.players.find((x) => x.id === p.id);
  if (!existing && s.players.length >= MAX_PLAYERS) {
    throw new LobbyError("room_full", "This séance is full");
  }
  const players = existing
    ? s.players.map((x) => (x.id === p.id ? { ...x, name: p.name, connected: true } : x))
    : [...s.players, { id: p.id, name: p.name, souls: 0, connected: true, joinedAt: now }];
  const hostPresent = players.some((x) => x.id === s.hostId && x.connected);
  return { ...s, players, hostId: hostPresent ? s.hostId : p.id };
}

/** Disconnect. The host role migrates to the longest-present connected player. */
export function leave(s: LobbyState, playerId: string): LobbyState {
  const players = s.players.map((x) => (x.id === playerId ? { ...x, connected: false } : x));
  let hostId = s.hostId;
  if (hostId === playerId) {
    const next = players.filter((x) => x.connected).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) hostId = next.id;
  }
  return { ...s, players, hostId };
}

export const isEmpty = (s: LobbyState): boolean => !s.players.some((p) => p.connected);

function requireHost(s: LobbyState, by: string): void {
  if (by !== s.hostId) throw new LobbyError("not_host", "Only the host can do that");
}

export function configure(s: LobbyState, by: string, settings: Partial<Settings>): LobbyState {
  requireHost(s, by);
  if (s.phase !== "lobby" && s.phase !== "podium") {
    throw new LobbyError("in_progress", "Settings are locked mid-séance");
  }
  const rounds = settings.rounds ?? s.settings.rounds;
  const seconds = settings.seconds ?? s.settings.seconds;
  if (!ROUND_OPTIONS.includes(rounds) || !SECONDS_OPTIONS.includes(seconds)) {
    throw new LobbyError("bad_settings", "Unsupported settings");
  }
  return { ...s, settings: { rounds, seconds } };
}

/** Host starts (or rematches) with freshly drawn prompts. Scores reset. */
export function start(s: LobbyState, by: string, prompts: LobbyPrompt[], now: number): LobbyState {
  requireHost(s, by);
  if (s.phase !== "lobby" && s.phase !== "podium") {
    throw new LobbyError("in_progress", "A séance is already running");
  }
  if (prompts.length < s.settings.rounds) {
    throw new LobbyError("no_prompts", "Not enough prompts available for that many rounds");
  }
  return openRound(
    {
      ...s,
      prompts: prompts.slice(0, s.settings.rounds),
      players: s.players.map((p) => ({ ...p, souls: 0 })),
      results: [],
    },
    0,
    now,
  );
}

function openRound(s: LobbyState, round: number, now: number): LobbyState {
  const opensAt = now + PREVIEW_MS;
  return {
    ...s,
    phase: "preview",
    round,
    opensAt,
    deadline: opensAt + s.settings.seconds * 1000,
    revealUntil: 0,
    entries: [],
  };
}

export type GuessOutcome =
  | { status: "correct"; answer: string }
  | { status: "suggest"; suggestions: { id: string; display: string }[] }
  | { status: "whyNot"; reason: string }
  | { status: "invalid" }
  | { status: "closed" };

const indexCache = new WeakMap<LobbyPrompt, AnswerIndex>();
function indexOf(p: LobbyPrompt): AnswerIndex {
  let idx = indexCache.get(p);
  if (!idx) {
    idx = buildAnswerIndex({ answers: p.answers, whyNot: p.whyNot });
    indexCache.set(p, idx);
  }
  return idx;
}

/** One locked answer per player per round. Wrong guesses only cost time. */
export function guess(
  s: LobbyState,
  playerId: string,
  text: string,
  confirmId: string | undefined,
  now: number,
): { state: LobbyState; outcome: GuessOutcome } {
  const current = advance(s, now).state;
  const prompt = current.prompts[current.round];
  const open =
    current.phase === "answering" && now <= current.deadline + GRACE_MS && prompt !== undefined;
  if (
    !open ||
    !current.players.some((p) => p.id === playerId) ||
    current.entries.some((e) => e.playerId === playerId)
  ) {
    return { state: current, outcome: { status: "closed" } };
  }
  const match = matchGuess(indexOf(prompt), text);
  let answerId: string | null = null;
  if (confirmId !== undefined) {
    if (match.kind === "suggest" && match.answerIds.includes(confirmId)) answerId = confirmId;
    else return { state: current, outcome: { status: "invalid" } };
  } else if (match.kind === "exact") {
    answerId = match.answerId;
  }
  if (answerId === null) {
    const display = (id: string) => prompt.answers.find((a) => a.id === id)?.display ?? id;
    if (match.kind === "suggest") {
      return {
        state: current,
        outcome: {
          status: "suggest",
          suggestions: match.answerIds.map((id) => ({ id, display: display(id) })),
        },
      };
    }
    return {
      state: current,
      outcome:
        match.kind === "whyNot"
          ? { status: "whyNot", reason: match.reason }
          : { status: "invalid" },
    };
  }
  const answer = prompt.answers.find((a) => a.id === answerId)!;
  const next = { ...current, entries: [...current.entries, { playerId, answerId, at: now }] };
  return {
    state: advance(next, now).state,
    outcome: { status: "correct", answer: answer.display },
  };
}

/** Score the current round: tier souls + uniqueness bonus; shared answers are jinxed. */
export function scoreRound(s: LobbyState): RoundResult {
  const prompt = s.prompts[s.round]!;
  const counts = new Map<string, number>();
  for (const e of s.entries) counts.set(e.answerId, (counts.get(e.answerId) ?? 0) + 1);
  const rows = s.players.map((p): ResultRow => {
    const e = s.entries.find((x) => x.playerId === p.id);
    if (!e) {
      return {
        playerId: p.id,
        name: p.name,
        answer: null,
        tier: null,
        souls: 0,
        unique: false,
        jinx: false,
      };
    }
    const a = prompt.answers.find((x) => x.id === e.answerId)!;
    const unique = counts.get(e.answerId) === 1;
    return {
      playerId: p.id,
      name: p.name,
      answer: a.display,
      tier: a.tier,
      souls: soulsFor(a.tier) + (unique ? UNIQUE_BONUS : 0),
      unique,
      jinx: !unique,
    };
  });
  rows.sort((a, b) => b.souls - a.souls);
  return {
    idx: s.round,
    text: prompt.text,
    rejuvenator: prompt.answers.find((a) => a.isRejuvenator)?.display ?? null,
    rows,
  };
}

/**
 * Move the clock forward: preview → answering → reveal (deadline, or everyone connected has
 * answered) → next round or podium. Returns the time of the next scheduled transition (for alarms).
 */
export function advance(s: LobbyState, now: number): { state: LobbyState; wakeAt: number | null } {
  let state = s;
  for (let guard = 0; guard < 8; guard++) {
    if (state.phase === "preview" && now >= state.opensAt) {
      state = { ...state, phase: "answering" };
      continue;
    }
    if (state.phase === "answering") {
      const live = state.players.filter((p) => p.connected);
      const allIn =
        live.length > 0 && live.every((p) => state.entries.some((e) => e.playerId === p.id));
      if (allIn || now > state.deadline + GRACE_MS) {
        const result = scoreRound(state);
        const gained = new Map(result.rows.map((r) => [r.playerId, r.souls]));
        state = {
          ...state,
          phase: "reveal",
          revealUntil: now + REVEAL_MS,
          results: [...state.results, result],
          players: state.players.map((p) => ({ ...p, souls: p.souls + (gained.get(p.id) ?? 0) })),
        };
        continue;
      }
    }
    if (state.phase === "reveal" && now >= state.revealUntil) {
      state =
        state.round + 1 < state.prompts.length
          ? openRound(state, state.round + 1, now)
          : { ...state, phase: "podium" };
      continue;
    }
    break;
  }
  const wakeAt =
    state.phase === "preview"
      ? state.opensAt
      : state.phase === "answering"
        ? state.deadline + GRACE_MS + 1
        : state.phase === "reveal"
          ? state.revealUntil
          : null;
  return { state, wakeAt };
}

/** What clients may see. Never includes answer lists; during a round only *who* has answered. */
export function publicView(s: LobbyState, now: number) {
  const prompt = s.prompts[s.round];
  const inRound = s.phase === "preview" || s.phase === "answering";
  return {
    code: s.code,
    hostId: s.hostId,
    phase: s.phase,
    settings: s.settings,
    serverNow: now,
    round: s.round,
    totalRounds: s.prompts.length || s.settings.rounds,
    opensAt: s.opensAt,
    deadline: s.deadline,
    revealUntil: s.revealUntil,
    prompt:
      inRound || s.phase === "reveal"
        ? { text: prompt?.text ?? "", category: prompt?.category ?? "" }
        : null,
    players: [...s.players]
      .sort((a, b) => b.souls - a.souls || a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        souls: p.souls,
        connected: p.connected,
        answered: inRound && s.entries.some((e) => e.playerId === p.id),
      })),
    lastResult: s.phase === "reveal" || s.phase === "podium" ? (s.results.at(-1) ?? null) : null,
  };
}

export type PublicLobby = ReturnType<typeof publicView>;
