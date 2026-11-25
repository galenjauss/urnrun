import { useCallback, useEffect, useRef, useState } from "react";
import type { GuessOutcome, PublicLobby } from "../../workers/lobby/engine";

export type { GuessOutcome, PublicLobby };

export type LobbyConn = "connecting" | "open" | "reconnecting" | "gone";

interface LobbyHook {
  view: PublicLobby | null;
  you: string | null;
  conn: LobbyConn;
  error: string | null;
  feedback: { outcome: GuessOutcome; guess: string } | null;
  /** Server clock minus client clock (ms): add to Date.now() to get server time. */
  offset: number;
  send: (msg: Record<string, unknown>) => void;
}

const NAME_KEY = "urnrun:name:v1";

export function loadName(): string {
  try {
    return globalThis.localStorage?.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string): void {
  try {
    globalThis.localStorage?.setItem(NAME_KEY, name);
  } catch {
    // Convenience only.
  }
}

/** One séance socket with automatic reconnect (exponential backoff, capped) and clock sync. */
export function useLobby(code: string, name: string | null, spectate = false): LobbyHook {
  const [view, setView] = useState<PublicLobby | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [conn, setConn] = useState<LobbyConn>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LobbyHook["feedback"]>(null);
  const [offset, setOffset] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!name) return;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${location.host}/api/lobby/${code}/ws?name=${encodeURIComponent(name)}${
          spectate ? "&spectate=1" : ""
        }`,
      );
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setConn("open");
        setError(null);
        ping = setInterval(() => ws.send(JSON.stringify({ type: "ping" })), 20_000);
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(String(e.data)) as
          | { type: "hello"; you: string; serverNow: number }
          | { type: "state"; view: PublicLobby }
          | { type: "pong"; serverNow: number }
          | { type: "feedback"; outcome: GuessOutcome; guess: string }
          | { type: "error"; code: string; message: string };
        if (msg.type === "hello") {
          setYou(msg.you);
          setOffset(msg.serverNow - Date.now());
        } else if (msg.type === "state") {
          setView(msg.view);
          setOffset(msg.view.serverNow - Date.now());
          if (msg.view.phase !== "answering") setFeedback(null);
        } else if (msg.type === "pong") {
          setOffset(msg.serverNow - Date.now());
        } else if (msg.type === "feedback") {
          setFeedback({ outcome: msg.outcome, guess: msg.guess });
        } else if (msg.type === "error") {
          setError(msg.message);
        }
      };
      ws.onclose = (e) => {
        clearInterval(ping);
        if (closed) return;
        if (e.code === 4404) {
          setConn("gone");
          return;
        }
        setConn("reconnecting");
        attempt += 1;
        timer = setTimeout(connect, Math.min(8_000, 500 * 2 ** attempt));
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [code, name, spectate]);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { view, you, conn, error, feedback, offset, send };
}
