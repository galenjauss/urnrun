import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import { createD1Repo } from "../game/d1-repo";
import {
  LobbyError,
  advance,
  configure,
  createLobby,
  guess,
  isEmpty,
  join,
  leave,
  publicView,
  start,
  type LobbyState,
} from "./engine";
import { drawLobbyPrompts } from "./prompts";

/** Idle rooms are deleted 15 minutes after the last courier leaves (SPEC §6.6). */
export const IDLE_GC_MS = 15 * 60_000;

const Message = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping") }),
  z.object({
    type: z.literal("configure"),
    rounds: z.union([z.literal(5), z.literal(7), z.literal(10)]).optional(),
    seconds: z.union([z.literal(15), z.literal(25)]).optional(),
  }),
  z.object({ type: z.literal("start") }),
  z.object({
    type: z.literal("guess"),
    text: z.string().min(1).max(80),
    confirm: z.string().max(80).optional(),
  }),
]);

interface Attachment {
  pid: string;
  /** OBS overlay / watcher: receives state, never joins or acts. */
  spectator?: boolean;
}

/**
 * One séance room per Durable Object, using the WebSocket Hibernation API: state lives in storage,
 * timers are alarms, and the engine (pure) decides every transition.
 */
export class LobbyRoom extends DurableObject<Env> {
  private state: LobbyState | null = null;
  private loaded = false;

  private async load(): Promise<LobbyState | null> {
    if (!this.loaded) {
      this.state = (await this.ctx.storage.get<LobbyState>("state")) ?? null;
      this.loaded = true;
    }
    return this.state;
  }

  private async commit(next: LobbyState, wakeAt: number | null): Promise<void> {
    this.state = next;
    await this.ctx.storage.put("state", next);
    const at = wakeAt ?? (isEmpty(next) ? Date.now() + IDLE_GC_MS : null);
    if (at !== null) await this.ctx.storage.setAlarm(at);
    else await this.ctx.storage.deleteAlarm();
    this.broadcast(next);
  }

  private broadcast(s: LobbyState): void {
    const msg = JSON.stringify({ type: "state", view: publicView(s, Date.now()) });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        // Socket closing; webSocketClose will tidy up.
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pid = request.headers.get("x-urn-player") ?? "";
    const name = request.headers.get("x-urn-name") ?? "Courier";
    if (!pid) return new Response("missing player", { status: 400 });

    if (url.pathname === "/init") {
      if (await this.load()) return new Response("exists", { status: 409 });
      const code = url.searchParams.get("code") ?? "";
      await this.commit(createLobby(code, { id: pid, name }, Date.now()), null);
      return new Response("ok");
    }

    const s = await this.load();
    if (url.pathname === "/info") {
      return Response.json(
        s
          ? { exists: true, phase: s.phase, players: s.players.filter((p) => p.connected).length }
          : { exists: false },
      );
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    if (!s) return new Response("no such room", { status: 404 });
    if (request.headers.get("x-urn-spectate") === "1") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1], ["spectator"]);
      pair[1].serializeAttachment({ pid: "", spectator: true } satisfies Attachment);
      pair[1].send(JSON.stringify({ type: "state", view: publicView(s, Date.now()) }));
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    let next: LobbyState;
    try {
      next = join(s, { id: pid, name }, Date.now());
    } catch (err) {
      if (err instanceof LobbyError) return new Response(err.message, { status: 409 });
      throw err;
    }
    const pair = new WebSocketPair();
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [pid]);
    server.serializeAttachment({ pid } satisfies Attachment);
    const { state, wakeAt } = advance(next, Date.now());
    await this.commit(state, wakeAt);
    server.send(JSON.stringify({ type: "hello", you: pid, serverNow: Date.now() }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const { pid, spectator } = ws.deserializeAttachment() as Attachment;
    if (spectator) {
      // Watchers can only keep the connection alive.
      ws.send(JSON.stringify({ type: "pong", serverNow: Date.now() }));
      return;
    }
    const s = await this.load();
    if (!s) return ws.close(4404, "room gone");
    const send = (m: unknown) => ws.send(JSON.stringify(m));
    let msg: z.infer<typeof Message>;
    try {
      msg = Message.parse(
        JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)),
      );
    } catch {
      return send({ type: "error", code: "bad_message", message: "Unrecognised message" });
    }
    const now = Date.now();
    try {
      switch (msg.type) {
        case "ping":
          return send({ type: "pong", serverNow: now });
        case "configure": {
          const next = configure(s, pid, { rounds: msg.rounds, seconds: msg.seconds });
          return this.commit(next, null);
        }
        case "start": {
          // Cheap checks first: only the host, and only between séances.
          if (pid !== s.hostId) throw new LobbyError("not_host", "Only the host can start");
          if (s.phase !== "lobby" && s.phase !== "podium") {
            throw new LobbyError("in_progress", "A séance is already running");
          }
          const prompts = await drawLobbyPrompts(createD1Repo(this.env.DB), s.settings.rounds, now);
          if (!prompts) {
            throw new LobbyError("no_prompts", "Not enough fresh prompts yet — try fewer rounds");
          }
          const { state, wakeAt } = advance(start(s, pid, prompts, now), now);
          return this.commit(state, wakeAt);
        }
        case "guess": {
          const { state, outcome } = guess(s, pid, msg.text, msg.confirm, now);
          send({ type: "feedback", outcome, guess: msg.text });
          if (outcome.status === "correct" || state.phase !== s.phase) {
            const adv = advance(state, now);
            return this.commit(adv.state, adv.wakeAt);
          }
          return;
        }
      }
    } catch (err) {
      if (err instanceof LobbyError)
        return send({ type: "error", code: err.code, message: err.message });
      console.error("lobby_error", err instanceof Error ? err.message : err);
      return send({ type: "error", code: "internal", message: "Something went wrong" });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const { pid, spectator } = ws.deserializeAttachment() as Attachment;
    if (spectator) return;
    const s = await this.load();
    if (!s) return;
    // Another tab for the same courier may still be connected.
    const stillHere = this.ctx.getWebSockets(pid).some((w) => w !== ws);
    if (stillHere) return;
    const { state, wakeAt } = advance(leave(s, pid), Date.now());
    await this.commit(state, wakeAt);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    const s = await this.load();
    if (!s) return;
    const players = this.ctx
      .getWebSockets()
      .filter((w) => !(w.deserializeAttachment() as Attachment).spectator);
    if (isEmpty(s) && players.length === 0) {
      await this.ctx.storage.deleteAll();
      this.state = null;
      return;
    }
    const { state, wakeAt } = advance(s, Date.now());
    await this.commit(state, wakeAt);
  }
}
