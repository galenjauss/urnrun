import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { audio } from "../../audio/engine";
import type { AudioSettings } from "../../audio/settings";
import { getPrefs, setPrefs, subscribePrefs } from "../prefs";

const SERVER_AUDIO: AudioSettings = { muted: false, sfx: 0.8, music: 0.4 };

function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(
    (onChange) => audio.subscribe(onChange),
    () => {
      audio.init();
      return audio.settings;
    },
    () => SERVER_AUDIO,
  );
}

/**
 * Sound & display settings: a speaker button (shows mute state) that opens a small mixer —
 * sound on/off, music and SFX levels, and low-power mode. Choices persist per device.
 */
export function SoundToggle() {
  const settings = useAudioSettings();
  const lowPower = useSyncExternalStore(
    subscribePrefs,
    () => getPrefs().lowPower,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const muted = settings.muted;
  return (
    <div className="settings" ref={root}>
      <button
        type="button"
        className="sound-toggle"
        aria-expanded={open}
        data-muted={muted || undefined}
        aria-controls={panelId}
        aria-label={`Sound and display settings (sound ${muted ? "off" : "on"})`}
        onClick={() => {
          audio.unlock();
          setOpen((o) => !o);
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
      {open ? (
        <div className="settings-panel" id={panelId} role="group" aria-label="Settings">
          <label className="settings-row">
            <input
              type="checkbox"
              checked={!muted}
              onChange={(e) => {
                audio.update({ muted: !e.target.checked });
                if (e.target.checked) audio.press();
              }}
            />
            Sound
          </label>
          <label className="settings-row settings-slider">
            Music
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.music * 100)}
              disabled={muted}
              onChange={(e) => audio.update({ music: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="settings-row settings-slider">
            Effects
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfx * 100)}
              disabled={muted}
              onChange={(e) => audio.update({ sfx: Number(e.target.value) / 100 })}
              onPointerUp={() => audio.press()}
            />
          </label>
          <label className="settings-row">
            <input
              type="checkbox"
              checked={lowPower}
              onChange={(e) => setPrefs({ lowPower: e.target.checked })}
            />
            Low-power mode
          </label>
        </div>
      ) : null}
    </div>
  );
}
