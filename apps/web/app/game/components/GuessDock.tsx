import { MAX_GUESS_LENGTH } from "@urnrun/core";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Feedback } from "../machine";

interface GuessDockProps {
  enabled: boolean;
  pending: boolean;
  feedback: Feedback | null;
  notice: string | null;
  roundKey: number;
  onSubmit: (text: string, confirm?: string) => void;
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (feedback.kind === "whyNot") {
    return (
      <p className="feedback why-not">
        <strong>{feedback.guess}</strong> — {feedback.reason}
      </p>
    );
  }
  if (feedback.kind === "invalid") {
    return (
      <p key={feedback.seq} className="feedback invalid">
        <strong>{feedback.guess}</strong> doesn't fit. Try another.
      </p>
    );
  }
  return null;
}

/** Input docked above the keyboard, with did-you-mean chips and near-miss reasons.
 * Remount per round (`key`) to reset the field. */
export function GuessDock({
  enabled,
  pending,
  feedback,
  notice,
  roundKey,
  onSubmit,
}: GuessDockProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enabled) inputRef.current?.focus({ preventScroll: true });
  }, [enabled, roundKey]);

  useEffect(() => {
    if (feedback) inputRef.current?.focus({ preventScroll: true });
  }, [feedback]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text);
    setText("");
  };

  return (
    <div className="guess-dock">
      <div className="feedback-area" aria-live="polite">
        {notice ? <p className="feedback notice">{notice}</p> : null}
        {!notice && feedback?.kind === "suggest" ? (
          <div className="suggest">
            <span className="suggest-label">Did you mean</span>
            {feedback.suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                disabled={!enabled || pending}
                onClick={() => onSubmit(feedback.guess, s.id)}
              >
                {s.display}?
              </button>
            ))}
          </div>
        ) : null}
        {!notice && feedback ? <FeedbackLine feedback={feedback} /> : null}
      </div>
      <form className="guess-form" onSubmit={submit}>
        <label htmlFor="guess" className="visually-hidden">
          Your answer
        </label>
        <input
          ref={inputRef}
          id="guess"
          className="guess-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="send"
          maxLength={MAX_GUESS_LENGTH}
          placeholder={enabled ? "Type an answer…" : "Hold…"}
          value={text}
          disabled={!enabled}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="drop-button"
          disabled={!enabled || pending || !text.trim()}
        >
          Drop it
        </button>
      </form>
    </div>
  );
}
