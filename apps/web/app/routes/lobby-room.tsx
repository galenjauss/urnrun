import { TIERS } from "@urnrun/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { categoryLabel, formatFt } from "../game/tiers";
import { useNow } from "../game/useNow";
import { loadName, saveName, useLobby, type PublicLobby } from "../lobby/useLobby";
import "../lobby/lobby.css";

export const meta = () => [{ title: "Séance — Urn Run" }, { name: "robots", content: "noindex" }];

export default function LobbyRoom() {
  const code = (useParams().code ?? "").toUpperCase();
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    // Mints the anonymous cookie (needed for the socket) and checks the room exists.
    void fetch(`/api/lobby/${code}`).then((r) => {
      if (!live) return;
      if (!r.ok) setMissing(true);
      else {
        const saved = loadName();
        if (saved) setName(saved);
      }
    });
    return () => {
      live = false;
    };
  }, [code]);

  if (missing) {
    return (
      <main className="lobby-shell">
        <section className="status-card" role="status">
          <h2>No séance here</h2>
          <p>That room doesn’t exist or has closed.</p>
          <Link className="cta" to="/lobby">
            Open a new one
          </Link>
        </section>
      </main>
    );
  }
  if (!name) {
    return (
      <main className="lobby-shell">
        <form
          className="status-card"
          onSubmit={(e) => {
            e.preventDefault();
            // Read the DOM value: typing before hydration must not be lost.
            const typed = new FormData(e.currentTarget).get("name");
            const n = (typeof typed === "string" ? typed : draft).trim() || "Courier";
            saveName(n);
            setName(n);
          }}
        >
          <h2>Join séance {code}</h2>
          <label className="lobby-field">
            Your name
            <input
              name="name"
              className="guess-input"
              autoFocus
              maxLength={20}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <button type="submit" className="cta">
            Take a seat
          </button>
        </form>
      </main>
    );
  }
  return <Room code={code} name={name} />;
}

function Room({ code, name }: { code: string; name: string }) {
  const { view, you, conn, error, feedback, offset, send } = useLobby(code, name);
  const ticking =
    view?.phase === "preview" || view?.phase === "answering" || view?.phase === "reveal";
  const now = useNow(ticking, 200) + offset;
  const isHost = !!view && view.hostId === you;

  if (!view) {
    return (
      <main className="lobby-shell">
        <p className="loading" role="status">
          {conn === "gone" ? "This séance has ended." : "Lighting the candles…"}
        </p>
      </main>
    );
  }

  return (
    <main className="lobby-shell">
      <header className="lobby-top">
        <Link to="/" className="dive-mark">
          Urn Run
        </Link>
        <span className="lobby-code" aria-label={`Room code ${code}`}>
          {code}
        </span>
        {conn !== "open" ? <span className="lobby-conn">Reconnecting…</span> : null}
      </header>

      {view.phase === "lobby" ? (
        <Waiting view={view} isHost={isHost} send={send} code={code} />
      ) : null}
      {view.phase === "preview" || view.phase === "answering" ? (
        <Round view={view} now={now} send={send} feedback={feedback} you={you} />
      ) : null}
      {view.phase === "reveal" && view.lastResult ? (
        <Reveal view={view} now={now} you={you} />
      ) : null}
      {view.phase === "podium" ? (
        <Podium view={view} isHost={isHost} send={send} you={you} />
      ) : null}

      {error ? (
        <p className="lobby-error" role="alert">
          {error}
        </p>
      ) : null}
      <Players view={view} you={you} />
    </main>
  );
}

type Send = (msg: Record<string, unknown>) => void;

function Waiting({
  view,
  isHost,
  send,
  code,
}: {
  view: PublicLobby;
  isHost: boolean;
  send: Send;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const link = typeof location === "undefined" ? "" : `${location.origin}/lobby/${code}`;
  return (
    <section className="lobby-card">
      <h1 className="lobby-title">The séance gathers</h1>
      <p>Share the code or the link. Up to 16 couriers.</p>
      <button
        type="button"
        className="lobby-link"
        onClick={() => {
          void navigator.clipboard?.writeText(link).then(() => setCopied(true));
        }}
      >
        {copied ? "Link copied" : "Copy invite link"}
      </button>
      {isHost ? (
        <div className="lobby-settings">
          <Choice
            label="Rounds"
            value={view.settings.rounds}
            options={[5, 7, 10]}
            onPick={(rounds) => send({ type: "configure", rounds })}
          />
          <Choice
            label="Timer"
            value={view.settings.seconds}
            options={[15, 25]}
            suffix="s"
            onPick={(seconds) => send({ type: "configure", seconds })}
          />
          <button type="button" className="cta" onClick={() => send({ type: "start" })}>
            Begin the séance
          </button>
        </div>
      ) : (
        <p className="lobby-wait">
          Waiting for the host · {view.settings.rounds} rounds · {view.settings.seconds}s
        </p>
      )}
    </section>
  );
}

function Choice({
  label,
  value,
  options,
  suffix = "",
  onPick,
}: {
  label: string;
  value: number;
  options: number[];
  suffix?: string;
  onPick: (n: number) => void;
}) {
  return (
    <div className="lobby-choice" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          className={o === value ? "is-on" : ""}
          onClick={() => onPick(o)}
        >
          {o}
          {suffix}
        </button>
      ))}
    </div>
  );
}

function Round({
  view,
  now,
  send,
  feedback,
  you,
}: {
  view: PublicLobby;
  now: number;
  send: Send;
  feedback: ReturnType<typeof useLobby>["feedback"];
  you: string | null;
}) {
  const [text, setText] = useState("");
  const answering = view.phase === "answering";
  const done = view.players.find((p) => p.id === you)?.answered ?? false;
  const left = Math.max(0, Math.ceil(((answering ? view.deadline : view.opensAt) - now) / 1000));
  const out = feedback?.outcome;
  return (
    <section className="lobby-card">
      <p className="prompt-meta">
        Round {view.round + 1} / {view.totalRounds}
        {view.prompt ? ` · ${categoryLabel(view.prompt.category)}` : ""}
      </p>
      <h1 className="lobby-prompt">{view.prompt?.text}</h1>
      <p className={`lobby-clock${answering && left <= 5 ? " is-urgent" : ""}`} role="timer">
        {answering ? `${left}s` : `Read it… ${left}`}
      </p>
      {done ? (
        <p className="lobby-locked">
          Answer locked in{out?.status === "correct" ? `: ${out.answer}` : ""}. Waiting for the
          others…
        </p>
      ) : (
        <form
          className="lobby-guess"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            send({ type: "guess", text });
            setText("");
          }}
        >
          <input
            className="guess-input"
            aria-label="Your answer"
            value={text}
            disabled={!answering}
            autoComplete="off"
            placeholder={answering ? "Type an answer…" : "Hold…"}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="cta" disabled={!answering}>
            Drop it
          </button>
        </form>
      )}
      {out?.status === "suggest" ? (
        <div className="lobby-suggest">
          Did you mean{" "}
          {out.suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              onClick={() => send({ type: "guess", text: feedback!.guess, confirm: s.id })}
            >
              {s.display}
            </button>
          ))}
          ?
        </div>
      ) : null}
      {out?.status === "whyNot" ? <p className="lobby-why">{out.reason}</p> : null}
      {out?.status === "invalid" ? (
        <p className="lobby-why">“{feedback!.guess}” doesn’t fit.</p>
      ) : null}
    </section>
  );
}

function Reveal({ view, now, you }: { view: PublicLobby; now: number; you: string | null }) {
  const r = view.lastResult!;
  const next = Math.max(0, Math.ceil((view.revealUntil - now) / 1000));
  return (
    <section className="lobby-card">
      <p className="prompt-meta">Round {r.idx + 1} · the spirits answer</p>
      <h1 className="lobby-prompt">{r.text}</h1>
      <ol className="lobby-results">
        {r.rows.map((row) => (
          <li key={row.playerId} className={row.playerId === you ? "is-you" : ""}>
            <span className="who">{row.name}</span>
            <span className="what">
              {row.answer ? (
                <>
                  <span aria-hidden="true">{row.tier ? TIERS[row.tier].glyph : ""}</span>{" "}
                  {row.answer}
                  {row.unique ? <em className="tag unique">unique +250</em> : null}
                  {row.jinx ? <em className="tag jinx">jinx!</em> : null}
                </>
              ) : (
                <span className="none">no answer</span>
              )}
            </span>
            <span className="pts">+{row.souls}</span>
          </li>
        ))}
      </ol>
      {r.rejuvenator ? (
        <p className="row-rejuv">
          💠 Rejuvenator: <strong>{r.rejuvenator}</strong>
        </p>
      ) : null}
      <p className="lobby-wait">
        {view.round + 1 < view.totalRounds
          ? `Next prompt in ${next}…`
          : "The ledger is being tallied…"}
      </p>
    </section>
  );
}

function Podium({
  view,
  isHost,
  send,
  you,
}: {
  view: PublicLobby;
  isHost: boolean;
  send: Send;
  you: string | null;
}) {
  const ranked = view.players;
  return (
    <section className="lobby-card">
      <h1 className="lobby-title">The séance ends</h1>
      <ol className="lobby-podium">
        {ranked.slice(0, 3).map((p, i) => (
          <li key={p.id} className={`place-${i + 1}${p.id === you ? " is-you" : ""}`}>
            <span className="medal" aria-hidden="true">
              {["👑", "🥈", "🥉"][i]}
            </span>
            <span className="who">{p.name}</span>
            <span className="pts">{formatFt(p.souls)}</span>
          </li>
        ))}
      </ol>
      {isHost ? (
        <button type="button" className="cta" onClick={() => send({ type: "start" })}>
          Rematch
        </button>
      ) : (
        <p className="lobby-wait">The host can call a rematch.</p>
      )}
      <p>
        <Link to="/dive">Today’s dive →</Link>
      </p>
    </section>
  );
}

function Players({ view, you }: { view: PublicLobby; you: string | null }) {
  return (
    <aside className="lobby-players" aria-label="Couriers">
      <h2>Couriers · {view.players.filter((p) => p.connected).length}</h2>
      <ul>
        {view.players.map((p) => (
          <li
            key={p.id}
            className={`${p.connected ? "" : "is-away"}${p.id === you ? " is-you" : ""}`}
          >
            <span className="who">
              {p.name}
              {p.id === view.hostId ? <em className="tag host">host</em> : null}
            </span>
            <span className="pts">
              {p.answered ? (
                <span className="tick" aria-label="answered">
                  ✓
                </span>
              ) : null}
              {formatFt(p.souls)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
