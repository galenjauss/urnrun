import type { Arrival } from "../useDiveFx";

/** Deco banner announcing a new zone. Re-keyed per arrival so the animation replays. */
export function ZoneBanner({ arrival }: { arrival: Arrival | null }) {
  return (
    <div className="zone-banner-slot" aria-live="polite">
      {arrival ? (
        <p key={arrival.seq} className="zone-banner">
          <span className="zone-banner-kicker">Now entering</span>
          <span className="zone-banner-name">{arrival.name}</span>
        </p>
      ) : null}
    </div>
  );
}
