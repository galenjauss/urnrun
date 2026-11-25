import type { Slot } from "../machine";
import { tierView } from "../tiers";

/** The tier stamp that slams down after each round. */
export function RevealStamp({ slot }: { slot: Slot }) {
  const view = tierView(slot.tier);
  const missed = slot.status === "expired";
  return (
    <div className={`reveal tone-${view.tone}`} role="status" aria-live="assertive">
      <div className="stamp">
        <span className="stamp-glyph" aria-hidden="true">
          {view.glyph}
        </span>
        <span className="stamp-label">{missed ? "Time's up" : view.label}</span>
      </div>
      {slot.answer ? <p className="reveal-answer">{slot.answer}</p> : null}
      <p className="reveal-souls">{missed ? "No souls this round" : `+${view.souls} souls`}</p>
    </div>
  );
}
