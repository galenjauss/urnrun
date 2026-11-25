import { categoryLabel } from "../tiers";

interface PromptCardProps {
  idx: number;
  text: string;
  category: string;
  previewing: boolean;
}

export function PromptCard({ idx, text, category, previewing }: PromptCardProps) {
  return (
    <section className={`prompt-card ${previewing ? "is-preview" : ""}`} aria-labelledby="prompt">
      <p className="prompt-meta">
        <span>Round {idx + 1} / 7</span>
        <span aria-hidden="true">·</span>
        <span>{categoryLabel(category)}</span>
      </p>
      <h2 id="prompt" className="prompt-text">
        {text}
      </h2>
      <p className="prompt-hint" aria-live="polite">
        {previewing ? "Read it. The clock starts in a moment…" : "Name the rarest right answer."}
      </p>
    </section>
  );
}
