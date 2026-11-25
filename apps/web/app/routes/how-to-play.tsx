import { TIERS, VERDICTS, ZONES, type Tier } from "@urnrun/core";
import { Link } from "react-router";
import { ContentPage } from "../site/ContentPage";
import { pageMeta } from "../site/site";

export const meta = () =>
  pageMeta(
    "How to play",
    "Seven Deadlock prompts a day, 25 seconds each. Name the rarest right answer to sink the Soul Urn deeper. Tiers, scoring and depth zones explained.",
    "/how-to-play",
  );

const TIER_ORDER: readonly Tier[] = [
  "trooper",
  "wise_guy",
  "guardian",
  "walker",
  "mid_boss",
  "rejuvenator",
];
const TIER_NOTE: Readonly<Record<Tier, string>> = {
  trooper: "A common answer — most couriers said it.",
  wise_guy: "The “obscure” pick that everybody reaches for. Clever, but not rare.",
  guardian: "Uncommon.",
  walker: "Rare.",
  mid_boss: "A real deep cut.",
  rejuvenator: "One hand-picked gem per prompt: rare and delightful.",
};

export default function HowToPlay() {
  return (
    <ContentPage title="How to play" kicker="The rules of the dive">
      <p>
        Every day at 00:00 UTC, everyone gets the same seven Deadlock prompts. Name any right answer
        — but the <strong>rarer</strong> your answer is among today’s players, the more souls it
        pours into the Urn and the deeper you sink.
      </p>

      <h2>Each round</h2>
      <ol>
        <li>The prompt appears. You get 3 seconds to read it before the clock starts.</li>
        <li>
          You have <strong>25 seconds</strong> to answer. Type and press <em>Drop it</em>.
        </li>
        <li>
          Wrong guesses only cost time — guess as often as you like. Close misspellings get a{" "}
          <em>did you mean…?</em> suggestion; nothing is ever auto-accepted.
        </li>
        <li>Run out of time and the round scores zero.</li>
      </ol>

      <h2>Tiers</h2>
      <table className="content-table">
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col" className="num">
              Souls
            </th>
            <th scope="col">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {TIER_ORDER.map((t) => (
            <tr key={t}>
              <td>
                <span aria-hidden="true">{TIERS[t].glyph}</span> {TIERS[t].label}
              </td>
              <td className="num">{TIERS[t].souls}</td>
              <td>{TIER_NOTE[t]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Rarity comes from what players actually answer: as answers come in, tiers recalibrate in
        small steps. Your score locks the moment you submit, so it never changes afterward.
      </p>

      <h2>Depth</h2>
      <p>
        One soul is one foot. A perfect dive of seven Rejuvenators reaches 7,000 ft. On the way down
        you pass through ten zones:
      </p>
      <table className="content-table">
        <thead>
          <tr>
            <th scope="col">Zone</th>
            <th scope="col" className="num">
              From
            </th>
          </tr>
        </thead>
        <tbody>
          {ZONES.map((z) => (
            <tr key={z.id}>
              <td>{z.name}</td>
              <td className="num">{z.depth.toLocaleString("en-US")} ft</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Your verdict</h2>
      <ul>
        {[...VERDICTS].reverse().map((v, i, all) => {
          const next = all[i + 1];
          return (
            <li key={v.name}>
              <strong>{v.name}</strong> —{" "}
              {next
                ? `${v.min.toLocaleString("en-US")}–${(next.min - 1).toLocaleString("en-US")} ft`
                : `${v.min.toLocaleString("en-US")} ft and deeper`}
            </li>
          );
        })}
      </ul>

      <h2>Sharing</h2>
      <p>
        After your dive, the Ledger shows what the crowd said, each prompt’s Rejuvenator and a
        spoiler-free share grid of your seven tiers.
      </p>
      <p>
        <Link to="/dive">Pick up the Urn →</Link>
      </p>
    </ContentPage>
  );
}
