import { ContentPage } from "../site/ContentPage";
import { DISCLAIMER, SITE, pageMeta } from "../site/site";

export const meta = () =>
  pageMeta(
    "Terms",
    "The terms for playing Urn Run, a free unofficial Deadlock fan game.",
    "/terms",
  );

export default function Terms() {
  return (
    <ContentPage title="Terms of use" kicker={`Effective ${SITE.policyDate}`}>
      <p>By playing Urn Run you agree to these terms. If you do not agree, please do not use it.</p>

      <h2>The game</h2>
      <p>
        Urn Run is a free game provided for fun, as is. We may change, pause or end any part of it
        at any time, including prompts, scoring rules and features.
      </p>

      <h2>Fair play</h2>
      <p>Please play honestly. You agree not to:</p>
      <ul>
        <li>use bots, scripts or automation to play or to submit answers;</li>
        <li>interfere with, overload or try to break the service or its scoring;</li>
        <li>exploit bugs to gain an advantage (please report them instead);</li>
        <li>harass other players or post unlawful or hateful content anywhere we host it.</li>
      </ul>
      <p>We may remove scores or block access that breaks these rules.</p>

      <h2>Content and trademarks</h2>
      <p>{DISCLAIMER}</p>
      <p>
        Game facts referenced in prompts are used for the purpose of trivia. Urn Run’s own design,
        art, sounds, code and prompt writing belong to their author. The source code is public for
        transparency; unless its repository states a license, all rights are reserved.
      </p>

      <h2>No warranty; limitation of liability</h2>
      <p>
        Urn Run is provided “as is” without warranties of any kind. To the fullest extent permitted
        by law, we are not liable for any indirect or consequential loss arising from your use of
        the game.
      </p>

      <h2>Takedown requests</h2>
      <p>
        If you believe something on Urn Run infringes your rights, contact us via{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          {SITE.contactLabel}
        </a>{" "}
        and we will respond within 48 hours.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; the effective date above will change when we do.</p>
    </ContentPage>
  );
}
