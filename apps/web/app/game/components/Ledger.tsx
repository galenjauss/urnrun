import { nextResetAt } from "@urnrun/core";
import { useState } from "react";
import type { FinishResult } from "../api";
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

function percentileLine(r: FinishResult): string {
  if (r.percentile === null) return "The first courier down today.";
  const players = r.players.toLocaleString("en-US");
  // Same wording as the share text (core buildShareText) so the two never disagree.
  if (r.percentile >= 100) return `Deepest dive today, of ${players} couriers.`;
  return `Deeper than ${r.percentile}% of ${players} couriers today.`;
}

/** THE LEDGER — results, per-round crowd reveal, share. */
export function Ledger({ result }: { result: FinishResult }) {
  const depth = useRollUp(result.totalSouls);
  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <header className="ledger-head">
        <p className="ledger-kicker">
          The Ledger{result.day !== null && result.day >= 1 ? ` · #${result.day}` : " · Beta"}
        </p>
        <h2 id="ledger-title" className="ledger-depth" aria-label={formatFt(result.totalSouls)}>
          <span aria-hidden="true">{formatFt(depth)}</span>
        </h2>
        <p className="ledger-zone">{result.zone}</p>
        <p className="ledger-verdict">{result.verdict}</p>
        <p className="ledger-pct">{percentileLine(result)}</p>
        {result.streak ? (
          <p className="ledger-streak">
            Streak {result.streak.current} · best {result.streak.best}
          </p>
        ) : null}
      </header>

      <Constellation result={result} />

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
              {r.crowd.length > 0 ? (
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
              {r.rejuvenator ? (
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
      <Countdown />
    </section>
  );
}
