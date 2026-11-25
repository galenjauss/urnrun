import type { Arrival } from "../useDiveFx";

const CEREMONY: Readonly<Record<number, string>> = {
  1: "Ceremony I · Through the Veil",
  2: "Ceremony II · The gates part",
  3: "Ceremony III · The Urn overflows",
};

/** Deco banner announcing a new zone. Re-keyed per arrival so the animation replays. */
export function ZoneBanner({ arrival }: { arrival: Arrival | null }) {
  return (
    <div className="zone-banner-slot" aria-live="polite">
      {arrival ? (
        <p key={arrival.seq} className={`zone-banner${arrival.ceremony ? " is-ceremony" : ""}`}>
          <span className="zone-banner-kicker">
            {arrival.ceremony ? CEREMONY[arrival.ceremony] : "Now entering"}
          </span>
          <span className="zone-banner-name">{arrival.name}</span>
        </p>
      ) : null}
    </div>
  );
}
