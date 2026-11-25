import { TIERS } from "@urnrun/core";
import { useParams } from "react-router";
import { categoryLabel, formatFt } from "../game/tiers";
import { useNow } from "../game/useNow";
import { useLobby } from "../lobby/useLobby";
import "../lobby/overlay.css";

export const meta = () => [
  { title: "Séance overlay — Urn Run" },
  { name: "robots", content: "noindex" },
];

/**
 * OBS browser-source overlay for a séance (SPEC §3.10): watch-only socket, transparent
 * background, large type, and never shows the room code on stream.
 */
export default function Overlay() {
  const code = (useParams().code ?? "").toUpperCase();
  const { view, offset } = useLobby(code, "Overlay", true);
  const ticking = view?.phase === "preview" || view?.phase === "answering";
  const now = useNow(ticking, 250) + offset;

  if (!view) return <main className="overlay" />;
  const left = Math.max(
    0,
    Math.ceil(((view.phase === "answering" ? view.deadline : view.opensAt) - now) / 1000),
  );
  const result = view.lastResult;

  return (
    <main className="overlay">
      <section className="ov-stage">
        {view.phase === "lobby" ? <p className="ov-title">The séance gathers…</p> : null}
        {ticking && view.prompt ? (
          <>
            <p className="ov-meta">
              Round {view.round + 1}/{view.totalRounds} · {categoryLabel(view.prompt.category)}
            </p>
            <p className="ov-prompt">{view.prompt.text}</p>
            <p className={`ov-clock${view.phase === "answering" && left <= 5 ? " is-urgent" : ""}`}>
              {view.phase === "answering" ? `${left}s` : "Get ready…"}
            </p>
          </>
        ) : null}
        {view.phase === "reveal" && result ? (
          <>
            <p className="ov-prompt">{result.text}</p>
            <ol className="ov-results">
              {result.rows
                .filter((r) => r.answer)
                .slice(0, 8)
                .map((r) => (
                  <li key={r.playerId}>
                    <span className="who">{r.name}</span>
                    <span className="what">
                      {r.tier ? TIERS[r.tier].glyph : ""} {r.answer}
                      {r.unique ? <em className="tag unique">+250</em> : null}
                      {r.jinx ? <em className="tag jinx">jinx!</em> : null}
                    </span>
                  </li>
                ))}
            </ol>
            {result.rejuvenator ? <p className="ov-rejuv">💠 {result.rejuvenator}</p> : null}
          </>
        ) : null}
        {view.phase === "podium" ? <p className="ov-title">👑 {view.players[0]?.name}</p> : null}
      </section>
      <ol className="ov-board" aria-label="Scores">
        {view.players.slice(0, 8).map((p, i) => (
          <li key={p.id} className={p.connected ? "" : "is-away"}>
            <span className="rank">{i + 1}</span>
            <span className="who">{p.name}</span>
            {p.answered ? <span className="tick">✓</span> : null}
            <span className="pts">{formatFt(p.souls)}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
