import { ContentPage } from "../site/ContentPage";
import { SITE, pageMeta } from "../site/site";

export const meta = () =>
  pageMeta(
    "Privacy",
    "What Urn Run stores, why, and for how long. Anonymous by default, minimal data, no selling of personal information.",
    "/privacy",
  );

export default function Privacy() {
  return (
    <ContentPage title="Privacy policy" kicker={`Effective ${SITE.policyDate}`}>
      <p>
        Urn Run is built to work without knowing who you are. This page explains exactly what we
        store and why.
      </p>

      <h2>What we store</h2>
      <h3>An anonymous player ID</h3>
      <p>
        On your first dive we create a random ID and keep it in a signed cookie named{" "}
        <code>urn_uid</code> (HTTP-only, up to 400 days). It is not derived from your name, email,
        device or IP address. It lets us keep one scored dive per day, your streak and your results.
      </p>
      <h3>Your dives</h3>
      <p>
        For each dive we store, against that random ID: the prompts served, the answers you
        submitted, each round’s tier and score, timestamps, and how many guesses you made. Answers
        are also counted in aggregate (for example, “how many players said X today”) to calculate
        rarity and the crowd results shown on the Ledger.
      </p>
      <h3>On your device</h3>
      <p>
        Your browser’s local storage keeps a few conveniences: whether you have seen the how-to,
        your local stats, and your sound and display settings. These never leave your device.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not ask for your name, email or any account to play.</li>
        <li>We do not store your IP address in our database.</li>
        <li>We do not sell or rent personal information.</li>
        <li>There are currently no advertising or third-party analytics scripts on the site.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        Urn Run runs on Cloudflare (hosting, database and security). Like any web host, Cloudflare
        processes request data such as IP addresses to deliver the site and protect it from abuse,
        under its own privacy policy. We use rate limiting keyed to the anonymous ID to keep the
        game fair.
      </p>

      <h2>Advertising (future)</h2>
      <p>
        We may add advertising to fund the game. Before any ads appear, this policy will be updated,
        and visitors in regions that require it will be asked for consent through a certified
        consent tool before any advertising cookies are set. Ads will never appear during a round.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Dive records are kept to power streaks, archives and aggregate statistics. Clearing your
        cookies starts you fresh with a new random ID. To ask us to delete the records tied to your
        ID, contact us with the value of your <code>urn_uid</code> cookie.
      </p>

      <h2>Children</h2>
      <p>Urn Run is not directed at children under 13 and does not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we will update this page and its effective date. Material changes
        will be noted on the site.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests:{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          {SITE.contactLabel}
        </a>
        .
      </p>
    </ContentPage>
  );
}
