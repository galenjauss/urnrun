import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { api as defaultApi, ApiError, type Api } from "./api";
import { diveReducer, initialState, nextIdx } from "./machine";
import { hasSeenHowTo, markHowToSeen, recordFreeBest, recordResult } from "./storage";

export const REVEAL_MS = 1_800;
const EXPIRE_SLACK_MS = 150;
const TOO_EARLY_RETRY_MS = 700;

const message = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Something went wrong on the way down";

export type DiveMode = "daily" | "free";

const CLOSED: Readonly<Record<string, string>> = {
  no_dive: "No dive is scheduled right now. Check back soon.",
  daily_first: "Finish today’s dive to unlock Free Dive.",
  no_free: "Free Dive opens once the archive has grown — check back after a few more dives.",
};

/** Drives one dive (Daily or Free) against the API. All timing is server-anchored via the reducer. */
export function useDive(client: Api = defaultApi, mode: DiveMode = "daily") {
  const [state, dispatch] = useReducer(diveReducer, initialState);
  const [notice, setNotice] = useState<string | null>(null);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const boot = useCallback(async () => {
    try {
      const result = await client.start(mode);
      dispatch({ type: "started", result, showHowTo: !hasSeenHowTo() });
    } catch (err) {
      if (err instanceof ApiError && CLOSED[err.code]) {
        dispatch({ type: "closed", message: CLOSED[err.code]! });
      } else {
        dispatch({ type: "failed", message: message(err) });
      }
    }
  }, [client, mode]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const { phase, run, current } = state;

  // Serve the next round.
  useEffect(() => {
    if (phase !== "serving" || !run) return;
    const idx = nextIdx(stateRef.current.slots);
    if (idx === null) return;
    let live = true;
    client
      .serve(run.runId, run.token, idx)
      .then((result) => live && dispatch({ type: "served", result, clientNow: Date.now() }))
      .catch((err: unknown) => {
        if (!live) return;
        // Out of sync (another tab, a race): resync from the server's view of the run.
        if (err instanceof ApiError && ["round_closed", "out_of_order"].includes(err.code)) {
          void boot();
        } else dispatch({ type: "failed", message: message(err) });
      });
    return () => {
      live = false;
    };
  }, [phase, run, client, boot]);

  // Preview → answering when the clock starts.
  useEffect(() => {
    if (phase !== "preview" || !current) return;
    const t = setTimeout(
      () => dispatch({ type: "opened" }),
      Math.max(0, current.opensAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [phase, current]);

  // Answer window → expire on the deadline.
  useEffect(() => {
    if (phase !== "answering" || !current || !run) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      client
        .expire(run.runId, run.token, current.idx)
        .then(() => live && dispatch({ type: "expired" }))
        .catch((err: unknown) => {
          if (!live) return;
          if (err instanceof ApiError && err.code === "too_early") {
            timer = setTimeout(attempt, TOO_EARLY_RETRY_MS);
          } else if (err instanceof ApiError && err.code === "round_closed") {
            void boot(); // a guess landed first; resync
          } else dispatch({ type: "failed", message: message(err) });
        });
    };
    timer = setTimeout(attempt, Math.max(0, current.deadline - Date.now() + EXPIRE_SLACK_MS));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [phase, current, run, client, boot]);

  // Reveal beat, then on to the next round or the ledger.
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => dispatch({ type: "revealDone" }), REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Finish → ledger.
  useEffect(() => {
    if (phase !== "finishing" || !run) return;
    let live = true;
    client
      .finish(run.runId, run.token)
      .then((result) => {
        if (!live) return;
        if (result.mode === "free") recordFreeBest(result.totalSouls);
        else if (result.day !== null) recordResult(result.day, result.totalSouls);
        dispatch({ type: "finished", result });
      })
      .catch((err: unknown) => live && dispatch({ type: "failed", message: message(err) }));
    return () => {
      live = false;
    };
  }, [phase, run, client]);

  const dismissHowTo = useCallback(() => {
    markHowToSeen();
    dispatch({ type: "howtoDismissed" });
  }, []);

  const submit = useCallback(
    async (text: string, confirm?: string) => {
      const s = stateRef.current;
      const trimmed = text.trim();
      if (s.phase !== "answering" || s.pending || !s.run || !s.current || !trimmed) return;
      dispatch({ type: "guessing" });
      setNotice(null);
      try {
        const result = await client.guess(
          s.run.runId,
          s.run.token,
          s.current.idx,
          trimmed,
          confirm,
        );
        dispatch({ type: "guessed", guess: trimmed, result });
      } catch (err) {
        // A failed guess costs only time; keep the round alive and tell the player.
        dispatch({ type: "guessed", guess: trimmed, result: { status: "invalid" } });
        setNotice(message(err));
      }
    },
    [client],
  );

  const retry = useCallback(() => {
    setNotice(null);
    void boot();
  }, [boot]);

  return { state, notice, submit, dismissHowTo, retry };
}
