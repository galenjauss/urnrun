import { TIERS } from "@urnrun/core";
import { tierView } from "../tiers";

const ORDER = ["trooper", "wise_guy", "guardian", "walker", "mid_boss", "rejuvenator"] as const;

export function HowTo({ onStart }: { onStart: () => void }) {
  return (
    <section className="howto" aria-labelledby="howto-title">
      <h2 id="howto-title" className="howto-title">
        How to carry the Urn
      </h2>
      <ol className="howto-steps">
        <li>Seven Deadlock prompts. 25 seconds each.</li>
        <li>
          Name any <em>right</em> answer — but the <strong>rarer</strong> it is among today's
          couriers, the deeper you sink.
        </li>
        <li>Wrong guesses only cost time. Guess as often as you like.</li>
      </ol>
      <ul className="tier-legend" aria-label="Tiers">
        {ORDER.map((t) => {
          const v = tierView(t);
          return (
            <li key={t} className={`tone-${v.tone}`}>
              <span aria-hidden="true">{v.glyph}</span>
              <span>{v.label}</span>
              <span className="legend-souls">{TIERS[t].souls}</span>
            </li>
          );
        })}
      </ul>
      <p className="howto-note">
        🎩 The <strong>Wise Guy</strong> is the "obscure" pick everyone reaches for. 💠 Each prompt
        hides one <strong>Rejuvenator</strong>.
      </p>
      <button type="button" className="cta" onClick={onStart} autoFocus>
        Pick up the Urn
      </button>
    </section>
  );
}
