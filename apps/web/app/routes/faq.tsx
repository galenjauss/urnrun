import { Link } from "react-router";
import { ContentPage } from "../content/ContentPage";
import { SITE, pageMeta } from "../content/site";

export const meta = () =>
  pageMeta(
    "FAQ",
    "Answers to common questions about Urn Run: daily reset time, how rarity is scored, spelling, streaks, sharing and more.",
    "/faq",
  );

const QA: readonly { q: string; a: React.ReactNode }[] = [
  {
    q: "When does a new dive start?",
    a: "Every day at 00:00 UTC. Everyone in the world gets the same seven prompts. The countdown on the results screen shows the time left in your local time.",
  },
  {
    q: "Can I play more than once a day?",
    a: "One scored dive per day. Your score locks when you submit each answer.",
  },
  {
    q: "How is rarity decided?",
    a: "Each prompt starts with expected rarities from game data and hand review. As players answer, the tiers recalibrate in small, guarded steps based on what people actually said that day.",
  },
  {
    q: "What is a Wise Guy?",
    a: "The answer that feels obscure but that lots of people reach for. It scores a little more than a common answer, but less than a genuinely rare one.",
  },
  {
    q: "What is the Rejuvenator?",
    a: "One hand-picked answer per prompt: rare and delightful. Finding it is worth the most souls.",
  },
  {
    q: "Do I need to spell answers exactly?",
    a: "No. Case, punctuation and common abbreviations are handled, and close misspellings get a “did you mean…?” suggestion you can tap. Nothing is accepted automatically on a guess.",
  },
  {
    q: "Do wrong guesses cost points?",
    a: "No — only time. Guess as often as you like within the 25 seconds.",
  },
  {
    q: "How do streaks work?",
    a: "Finish a dive on consecutive days to build your streak. Your best streak is kept too.",
  },
  {
    q: "Do I need an account?",
    a: "No. A random anonymous ID stored in a cookie keeps your streak on this device. Optional sign-in to sync across devices is planned.",
  },
  {
    q: "I think an answer is wrong or missing.",
    a: (
      <>
        Please report it on{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          {SITE.contactLabel}
        </a>{" "}
        with the prompt and the answer. Corrections are reviewed by hand.
      </>
    ),
  },
  {
    q: "Is this an official Deadlock game?",
    a: "No. Urn Run is an unofficial fan game and is not affiliated with or endorsed by Valve.",
  },
];

export default function Faq() {
  return (
    <ContentPage title="Frequently asked" kicker="FAQ">
      {QA.map(({ q, a }) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
      <p>
        <Link to="/how-to-play">Full rules →</Link>
      </p>
    </ContentPage>
  );
}
