import { Link } from "react-router";
import { GuessDock } from "../game/components/GuessDock";
import { HowTo } from "../game/components/HowTo";
import { Ledger } from "../game/components/Ledger";
import { PromptCard } from "../game/components/PromptCard";
import { RevealStamp } from "../game/components/RevealStamp";
import { RoundTrack } from "../game/components/RoundTrack";
import { SoundToggle } from "../game/components/SoundToggle";
import { Timer } from "../game/components/Timer";
import { UrnMeter } from "../game/components/UrnMeter";
import { ZoneBanner } from "../game/components/ZoneBanner";
import { totalSouls } from "../game/machine";
import { useDive } from "../game/useDive";
import { useDiveFx } from "../game/useDiveFx";
import { useKeyboardInset } from "../game/useKeyboardInset";
import { useNow } from "../game/useNow";
import { audio } from "../audio/engine";
import { Scene } from "../scene/Scene";
import type { Route } from "./+types/dive";
import "./dive.css";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Dive — Urn Run" }, { name: "robots", content: "noindex" }];
}

function Status({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <section className="status-card" role="status">
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {onRetry ? (
        <button type="button" className="cta" onClick={onRetry}>
          Try again
        </button>
      ) : null}
      <Link className="text-link" to="/">
        Back to the street
      </Link>
    </section>
  );
}

export default function Dive() {
  const { state, notice, submit, dismissHowTo, retry } = useDive();
  const { phase, current, slots, feedback, pending, ledger, lastIdx, error } = state;
  const inRound = phase === "preview" || phase === "answering" || phase === "reveal";
  const now = useNow(phase === "preview" || phase === "answering");
  useKeyboardInset();
  const { pulse, urgent, arrival } = useDiveFx(state, now);

  const lastSlot = lastIdx !== null ? slots[lastIdx] : undefined;

  return (
    <main
      className={`dive phase-${phase}${urgent ? " is-urgent" : ""}`}
      onInput={(e) => {
        if ((e.target as HTMLElement).id === "guess") audio.tick(urgent);
      }}
    >
      <Scene depth={totalSouls(slots)} urgent={urgent} pulse={pulse} />
      <ZoneBanner arrival={phase === "ledger" ? null : arrival} />
      {phase !== "ledger" ? (
        <header className="dive-top">
          <Link to="/" className="dive-mark" aria-label="Urn Run home">
            Urn Run
          </Link>
          <RoundTrack slots={slots} currentIdx={current?.idx ?? null} />
          <SoundToggle />
        </header>
      ) : null}

      <div className="dive-stage">
        {phase === "boot" || phase === "serving" || phase === "finishing" ? (
          <p className="loading" role="status">
            {phase === "finishing" ? "Tallying the ledger…" : "Descending…"}
          </p>
        ) : null}
        {phase === "howto" ? <HowTo onStart={dismissHowTo} /> : null}
        {phase === "closed" ? <Status title="The Urn rests" body={error ?? undefined} /> : null}
        {phase === "error" ? (
          <Status title="Lost in the dark" body={error ?? undefined} onRetry={retry} />
        ) : null}
        {inRound && current ? (
          <>
            <PromptCard
              idx={current.idx}
              text={current.text}
              category={current.category}
              previewing={phase === "preview"}
            />
            <Timer
              opensAt={current.opensAt}
              deadline={current.deadline}
              now={now}
              running={phase === "answering"}
            />
          </>
        ) : null}
        {phase === "reveal" && lastSlot ? <RevealStamp slot={lastSlot} /> : null}
        {phase === "ledger" && ledger ? <Ledger result={ledger} /> : null}
      </div>

      {inRound ? (
        <footer className="dive-bottom">
          <UrnMeter total={totalSouls(slots)} slots={slots} />
          <GuessDock
            key={current?.idx ?? -1}
            enabled={phase === "answering"}
            pending={pending}
            feedback={feedback}
            notice={notice}
            roundKey={current?.idx ?? -1}
            onSubmit={(text, confirm) => void submit(text, confirm)}
          />
        </footer>
      ) : null}
    </main>
  );
}
