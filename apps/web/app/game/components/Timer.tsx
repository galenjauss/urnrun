import { ANSWER_SECONDS } from "./constants";

interface TimerProps {
  opensAt: number;
  deadline: number;
  now: number;
  running: boolean;
}

/** Brass clock bar: a transform-only bar plus numerals, both driven by the shared `now` tick. */
export function Timer({ opensAt, deadline, now, running }: TimerProps) {
  const remainingMs = Math.max(0, deadline - Math.max(now, opensAt));
  const seconds = Math.ceil(remainingMs / 1000);
  const total = deadline - opensAt;
  const from = total > 0 ? remainingMs / total : 0;
  const urgent = running && seconds <= 5;
  return (
    <div className={`timer ${urgent ? "is-urgent" : ""}`} role="timer" aria-live="off">
      <div className="timer-track">
        <div
          className={`timer-bar ${running ? "is-running" : ""}`}
          style={{ transform: `scaleX(${from})` }}
        />
      </div>
      <span className="timer-num" aria-label={`${seconds} seconds left`}>
        {running ? seconds : ANSWER_SECONDS}
      </span>
    </div>
  );
}
