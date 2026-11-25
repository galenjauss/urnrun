import { nextResetAt } from "@urnrun/core";
import { useState } from "react";
import type { FinishResult } from "../api";
import { Link } from "react-router";
import { loadArchiveBest, loadFreeBest } from "../storage";
import { useSpoilersHidden } from "../useSpoilers";
import { useNow } from "../useNow";
import { useRollUp } from "../useRollUp";
import { Constellation } from "./Constellation";
import { formatFt, tierView } from "../tiers";

function Countdown() {
  const now = useNow(true, 1000);
  const ms = Math.max(0, nextResetAt(new Date(now)).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="countdown">
      Next dive in{" "}
      <time suppressHydrationWarning>
        {pad(h)}:{pad(m)}:{pad(s)}
      </time>
    </p>
  );
}

function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const share = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState("failed");
    }
  };
  return (
    <button type="button" className="cta" onClick={() => void share()}>
      {state === "copied" ? "Copied!" : state === "failed" ? "Copy failed — select below" : "Share"}
    </button>
  );
}

function percentileLine(r: FinishResult, replay = false): string {
  if (replay) {
    if (r.percentile === null) return "Nobody finished that day’s dive.";
    const n = r.players.toLocaleString("en-US");
    if (r.percentile >= 100) return `Deeper than all ${n} couriers that day.`;
    return `Deeper than ${r.percentile}% of that day’s ${n} couriers.`;
  }
  if (r.percentile === null) return "The first courier down today.";
  const players = r.players.toLocaleString("en-US");
  // Same wording as the share text (core buildShareText) so the two never disagree.
  if (r.percentile >= 100) return `Deepest dive today, of ${players} couriers.`;
  return `Deeper than ${r.percentile}% of ${players} couriers today.`;
}

/** THE LEDGER — results, per-round crowd reveal, share. */
function NextDive({ free, replayDay }: { free: boolean; replayDay: number | null }) {
  const [best] = useState(() => (free ? loadFreeBest() : 0));
  const [replayBest] = useState(() => (replayDay !== null ? loadArchiveBest(replayDay) : 0));
  if (replayDay !== null) {
    return (
      <div className="ledger-next">
        {replayBest > 0 ? (
          <p className="ledger-free-best">Best replay: {formatFt(replayBest)}</p>
        ) : null}
        <Link className="cta" to={`/dive?mode=archive&day=${replayDay}`}>
          Replay again
        </Link>
        <p>
          <Link to={`/ledger/${replayDay}`}>See that day’s ledger →</Link>
        </p>
      </div>
    );
  }
  return (
    <div className="ledger-next">
      {free && best > 0 ? (
        <p className="ledger-free-best">Free Dive best: {formatFt(best)}</p>
      ) : null}
      <Link className="cta" to="/dive?mode=free">
        {free ? "Dive again" : "Free Dive →"}
      </Link>
      {free ? null : (
        <p className="ledger-next-note">Endless practice dives. No effect on your streak.</p>
      )}
    </div>
  );
}

export function Ledger({ result }: { result: FinishResult }) {
  const free = result.mode === "free";
  const replay = result.mode === "archive";
  const hideSpoilers = useSpoilersHidden();
  const depth = useRollUp(result.totalSouls);
  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <header className="ledger-head">
        <p className="ledger-kicker">
          The Ledger
          {free
            ? " · Free Dive"
            : replay
              ? ` · Replay${result.day !== null && result.day >= 1 ? ` #${result.day}` : " · Beta"}`
              : result.day !== null && result.day >= 1
                ? ` · #${result.day}`
                : " · Beta"}
        </p>
        <h2 id="ledger-title" className="ledger-depth" aria-label={formatFt(result.totalSouls)}>
          <span aria-hidden="true">{formatFt(depth)}</span>
        </h2>
        <p className="ledger-zone">{result.zone}</p>
        <p className="ledger-verdict">{result.verdict}</p>
        {free ? null : <p className="ledger-pct">{percentileLine(result, replay)}</p>}
        {result.streak ? (
          <p className="ledger-streak">
            Streak {result.streak.current} · best {result.streak.best}
          </p>
        ) : null}
      </header>

      <Constellation result={result} />

      {hideSpoilers ? (
        <p className="ledger-spoilers">
          Streamer mode: the crowd’s answers and Rejuvenators are hidden.
        </p>
      ) : null}
      <ol className="ledger-rounds">
        {result.rounds.map((r, i) => {
          const v = tierView(r.tier);
          return (
            <li
              key={r.idx}
              className={`ledger-row tone-${v.tone}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="row-head">
                <span className="row-glyph" aria-hidden="true">
                  {v.glyph}
                </span>
                <p className="row-prompt">{r.text}</p>
                <span className="row-souls">{r.souls}</span>
              </div>
              <p className="row-answer">
                {r.answer ? (
                  <>
                    You said <strong>{r.answer}</strong> · {v.label}
                  </>
                ) : (
                  "No answer"
                )}
              </p>
              {hideSpoilers ? null : r.crowd.length > 0 ? (
                <p className="row-crowd">
                  The crowd said:{" "}
                  {r.crowd.map((c, j) => (
                    <span key={c.display}>
                      {j > 0 ? ", " : ""}
                      {c.display} <small>{c.share}%</small>
                    </span>
                  ))}
                </p>
              ) : null}
              {!hideSpoilers && r.rejuvenator ? (
                <p className="row-rejuv">
                  💠 Rejuvenator: <strong>{r.rejuvenator}</strong>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="ledger-share">
        <pre className="share-preview" aria-label="Share text">
          {result.share}
        </pre>
        <ShareButton text={result.share} />
      </div>
      <NextDive free={free} replayDay={replay ? result.day : null} />
      <Countdown />
    </section>
  );
}
