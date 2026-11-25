import type { Slot } from "../machine";
import { tierView } from "../tiers";

interface RoundTrackProps {
  slots: readonly Slot[];
  currentIdx: number | null;
}

/** Seven brass sockets across the top: filled with each round's tier glyph as it resolves. */
export function RoundTrack({ slots, currentIdx }: RoundTrackProps) {
  return (
    <ol className="round-track" aria-label="Rounds">
      {slots.map((slot, i) => {
        const closed = slot.status === "answered" || slot.status === "expired";
        const view = tierView(slot.tier);
        const label = closed ? `Round ${i + 1}: ${view.label}` : `Round ${i + 1}`;
        return (
          <li
            key={i}
            className={`socket ${closed ? `is-closed tone-${view.tone}` : ""} ${
              i === currentIdx ? "is-current" : ""
            }`}
            aria-label={label}
            aria-current={i === currentIdx ? "step" : undefined}
          >
            {closed ? <span aria-hidden="true">{view.glyph}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
