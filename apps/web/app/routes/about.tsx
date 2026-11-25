import { Link } from "react-router";
import { ContentPage } from "../site/ContentPage";
import { DISCLAIMER, SITE, pageMeta } from "../site/site";

export const meta = () =>
  pageMeta(
    "About",
    "Urn Run is a free, unofficial daily trivia game for Deadlock fans: name the rarest right answer and carry the Soul Urn deeper.",
    "/about",
  );

export default function About() {
  return (
    <ContentPage title="About Urn Run" kicker="A daily dive">
      <p>
        Urn Run is a free daily trivia game for Deadlock players. Each day brings seven prompts
        about heroes, abilities, items, the world and the community. Any correct answer counts, but
        the game rewards the answers few other players think of — the deep cuts.
      </p>
      <p>
        You play a courier carrying the Soul Urn down through the city’s underworld: off the
        rain-slick curb, through the subway and the speakeasy cellar, past the catacombs and the
        vault, toward the Patron’s Hearth. Rarer answers take you deeper.
      </p>

      <h2>How the answers work</h2>
      <p>
        Answer lists are built from public game data (hero, ability and item details) and reviewed
        by hand. Rarity is measured from what players actually answer each day. Prompts are checked
        against the live game, and anything removed from or not yet released in Deadlock is kept
        out. If you think an answer is wrong or missing, please{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          let us know
        </a>
        .
      </p>

      <h2>Fair play</h2>
      <p>
        Your score is decided on the server: timing, matching and rarity are all checked there, so
        everyone plays the same game. There are no paid advantages of any kind.
      </p>

      <h2>Unofficial fan project</h2>
      <p>{DISCLAIMER}</p>
      <p>
        Urn Run uses no Valve artwork, logos, fonts or audio. All visuals and sounds are original
        and generated in the browser.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, corrections or takedown requests:{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          {SITE.contactLabel}
        </a>
        . We aim to respond within 48 hours.
      </p>
      <p>
        <Link to="/how-to-play">How to play →</Link>
      </p>
    </ContentPage>
  );
}
