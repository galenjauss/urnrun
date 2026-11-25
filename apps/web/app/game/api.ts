import type {
  FinishResult,
  GuessResult,
  ServeResult,
  StartResult,
} from "../../workers/game/service";

export type { FinishResult, GuessResult, ServeResult, StartResult };

export interface TodayResult {
  day: number;
  launched: boolean;
  nextResetAt: string;
  available: boolean;
  played: { runId: string; finished: boolean; totalSouls: number } | null;
}

type Envelope<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: { code: string; message: string } };

/** API failure with the server's error code (e.g. `no_dive`, `too_early`, `rate_limited`). */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (token) headers.set("x-run-token", token);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError("network", "Lost the signal — check your connection", 0);
  }
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!body) throw new ApiError("bad_response", "Unexpected response from the server", res.status);
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, res.status);
  return body.data;
}

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  today: () => call<TodayResult>("/today"),
  start: (mode: "daily" | "free" = "daily") => call<StartResult>("/run", post({ mode })),
  serve: (runId: string, token: string, idx: number) =>
    call<ServeResult>(`/run/${runId}/round/${idx}/serve`, post(), token),
  guess: (runId: string, token: string, idx: number, text: string, confirm?: string) =>
    call<GuessResult>(`/run/${runId}/round/${idx}/guess`, post({ text, confirm }), token),
  expire: (runId: string, token: string, idx: number) =>
    call<{ status: "expired" }>(`/run/${runId}/round/${idx}/expire`, post(), token),
  finish: (runId: string, token: string) =>
    call<FinishResult>(`/run/${runId}/finish`, post(), token),
};

export type Api = typeof api;
