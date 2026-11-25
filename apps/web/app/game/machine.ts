import { ROUNDS_PER_DIVE, type Tier } from "@urnrun/core";
import type { FinishResult, GuessResult, ServeResult, StartResult } from "./api";

/** Client-side dive state machine (pure). Server stays authoritative; this only drives the UI. */

export type Phase =
  | "boot"
  | "howto"
  | "serving"
  | "preview"
  | "answering"
  | "reveal"
  | "finishing"
  | "ledger"
  | "closed"
  | "error";

export interface Slot {
  status: "pending" | "open" | "answered" | "expired";
  tier: Tier | null;
  souls: number;
  answer: string | null;
}

export interface CurrentRound {
  idx: number;
  text: string;
  category: string;
  /** Client-clock timestamps (server times shifted by the measured offset). */
  opensAt: number;
  deadline: number;
}

export type Feedback =
  | { kind: "suggest"; guess: string; suggestions: { id: string; display: string }[] }
  | { kind: "whyNot"; guess: string; reason: string }
  | { kind: "invalid"; guess: string; seq: number };

export interface DiveState {
  phase: Phase;
  run: { runId: string; token: string; day: number } | null;
  slots: Slot[];
  current: CurrentRound | null;
  feedback: Feedback | null;
  pending: boolean;
  lastIdx: number | null;
  ledger: FinishResult | null;
  error: string | null;
}

export type DiveAction =
  | { type: "started"; result: StartResult; showHowTo: boolean }
  | { type: "howtoDismissed" }
  | { type: "serving" }
  | { type: "served"; result: ServeResult; clientNow: number }
  | { type: "opened" }
  | { type: "guessing" }
  | { type: "guessed"; guess: string; result: GuessResult }
  | { type: "expired" }
  | { type: "revealDone" }
  | { type: "finished"; result: FinishResult }
  | { type: "closed"; message: string }
  | { type: "failed"; message: string };

const emptySlot = (): Slot => ({ status: "pending", tier: null, souls: 0, answer: null });

export const initialState: DiveState = {
  phase: "boot",
  run: null,
  slots: Array.from({ length: ROUNDS_PER_DIVE }, emptySlot),
  current: null,
  feedback: null,
  pending: false,
  lastIdx: null,
  ledger: null,
  error: null,
};

export function totalSouls(slots: readonly Slot[]): number {
  return slots.reduce((sum, s) => sum + s.souls, 0);
}

/** Index of the next unplayed round, or null when every round is closed. */
export function nextIdx(slots: readonly Slot[]): number | null {
  const i = slots.findIndex((s) => s.status === "pending" || s.status === "open");
  return i === -1 ? null : i;
}

const replaceSlot = (slots: readonly Slot[], idx: number, patch: Partial<Slot>): Slot[] =>
  slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));

function afterStart(state: DiveState, result: StartResult, showHowTo: boolean): DiveState {
  const slots = Array.from({ length: result.totalRounds }, (_, i) => {
    const r = result.rounds.find((x) => x.idx === i);
    return r ? { status: r.status, tier: r.tier, souls: r.souls, answer: null } : emptySlot();
  });
  const run = { runId: result.runId, token: result.token, day: result.day };
  const allClosed = result.nextIdx === null;
  const phase: Phase = allClosed ? "finishing" : showHowTo ? "howto" : "serving";
  return { ...state, phase, run, slots, error: null };
}

function afterGuess(state: DiveState, guess: string, result: GuessResult): DiveState {
  const cur = state.current;
  if (!cur || state.phase !== "answering") return { ...state, pending: false };
  switch (result.status) {
    case "correct":
      return {
        ...state,
        phase: "reveal",
        pending: false,
        feedback: null,
        lastIdx: cur.idx,
        slots: replaceSlot(state.slots, cur.idx, {
          status: "answered",
          tier: result.tier,
          souls: result.souls,
          answer: result.answer.display,
        }),
      };
    case "expired":
      return reduceExpired(state);
    case "suggest":
      return {
        ...state,
        pending: false,
        feedback: { kind: "suggest", guess, suggestions: result.suggestions },
      };
    case "whyNot":
      return {
        ...state,
        pending: false,
        feedback: { kind: "whyNot", guess, reason: result.reason },
      };
    case "invalid": {
      const seq = state.feedback?.kind === "invalid" ? state.feedback.seq + 1 : 1;
      return { ...state, pending: false, feedback: { kind: "invalid", guess, seq } };
    }
  }
}

function reduceExpired(state: DiveState): DiveState {
  const cur = state.current;
  if (!cur || (state.phase !== "answering" && state.phase !== "preview")) return state;
  return {
    ...state,
    phase: "reveal",
    pending: false,
    feedback: null,
    lastIdx: cur.idx,
    slots: replaceSlot(state.slots, cur.idx, { status: "expired", tier: null, souls: 0 }),
  };
}

export function diveReducer(state: DiveState, action: DiveAction): DiveState {
  switch (action.type) {
    case "started":
      return afterStart(state, action.result, action.showHowTo);
    case "howtoDismissed":
      return state.phase === "howto" ? { ...state, phase: "serving" } : state;
    case "serving":
      return { ...state, phase: "serving", current: null, feedback: null };
    case "served": {
      const { result, clientNow } = action;
      const offset = clientNow - result.serverNow;
      const opensAt = result.opensAt + offset;
      return {
        ...state,
        phase: clientNow >= opensAt ? "answering" : "preview",
        feedback: null,
        current: {
          idx: result.idx,
          text: result.prompt.text,
          category: result.prompt.category,
          opensAt,
          deadline: result.deadline + offset,
        },
        slots: replaceSlot(state.slots, result.idx, { status: "open" }),
      };
    }
    case "opened":
      return state.phase === "preview" ? { ...state, phase: "answering" } : state;
    case "guessing":
      return state.phase === "answering" ? { ...state, pending: true } : state;
    case "guessed":
      return afterGuess(state, action.guess, action.result);
    case "expired":
      return reduceExpired(state);
    case "revealDone":
      if (state.phase !== "reveal") return state;
      return nextIdx(state.slots) === null
        ? { ...state, phase: "finishing", current: null }
        : { ...state, phase: "serving", current: null };
    case "finished":
      return { ...state, phase: "ledger", ledger: action.result, current: null, pending: false };
    case "closed":
      return { ...state, phase: "closed", error: action.message };
    case "failed":
      return { ...state, phase: "error", error: action.message, pending: false };
  }
}
