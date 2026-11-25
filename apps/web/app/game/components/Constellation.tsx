import type { FinishResult } from "../api";
import { VIEW, layoutConstellation } from "../constellation";
import { tierView } from "../tiers";

/** Your seven answers as a constellation, sunk by rarity. Unique per player per day. */
export function Constellation({ result }: { result: FinishResult }) {
  const { stars, links } = layoutConstellation(
    result.rounds.map((r) => ({ idx: r.idx, tier: r.tier, souls: r.souls })),
  );
  const label = result.rounds.map((r, i) => `Round ${i + 1}: ${tierView(r.tier).label}`).join(", ");
  return (
    <figure className="constellation">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        role="img"
        aria-label={`Your constellation. ${label}.`}
      >
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect className="constellation-frame" x="3" y="3" width={VIEW.w - 6} height={VIEW.h - 6} />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            className="constellation-rule"
            x1="10"
            x2={VIEW.w - 10}
            y1={VIEW.h * f}
            y2={VIEW.h * f}
          />
        ))}
        {links.map((l, i) => {
          const a = stars[l.from]!;
          const b = stars[l.to]!;
          return (
            <line
              key={`${l.from}-${l.to}`}
              className={`constellation-link${l.chain ? " is-chain" : ""}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              style={{ "--i": i } as React.CSSProperties}
            />
          );
        })}
        {stars.map((s, i) => (
          <g
            key={s.idx}
            className={`constellation-star tone-${tierView(s.tier).tone}${s.lit ? "" : " is-unlit"}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            {s.lit ? <circle cx={s.x} cy={s.y} r={s.r * 4} fill="url(#star-glow)" /> : null}
            <circle cx={s.x} cy={s.y} r={s.r} />
          </g>
        ))}
      </svg>
      <figcaption>Your constellation</figcaption>
    </figure>
  );
}
