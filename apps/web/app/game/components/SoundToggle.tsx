import { useSyncExternalStore } from "react";
import { audio } from "../../audio/engine";

/** Mute toggle; the choice is remembered per device. */
export function SoundToggle() {
  const muted = useSyncExternalStore(
    (onChange) => audio.subscribe(onChange),
    () => {
      audio.init();
      return audio.settings.muted;
    },
    () => false,
  );

  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={!muted}
      aria-label={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        audio.unlock();
        audio.update({ muted: !muted });
        if (muted) audio.press();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {muted ? (
          <path d="M16 9l5 6M21 9l-5 6" className="stroke" />
        ) : (
          <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" className="stroke" />
        )}
      </svg>
    </button>
  );
}
