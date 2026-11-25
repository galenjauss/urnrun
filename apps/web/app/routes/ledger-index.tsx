import { dayNumber } from "@urnrun/core";
import { Link } from "react-router";
import { createD1Repo } from "../../workers/game/d1-repo";
import { cloudflareContext } from "../cloudflare";
import { ContentPage } from "../site/ContentPage";
import { dayDate, dayLabel } from "../site/days";
import { pageMeta } from "../site/site";
import type { Route } from "./+types/ledger-index";

export const meta = () =>
  pageMeta(
    "Past dives",
    "Every past Urn Run daily dive: what the crowd answered, the Rejuvenator for each prompt, and how deep players got.",
    "/ledger",
  );

export function headers() {
  return { "Cache-Control": "public, max-age=300" };
}

export async function loader({ context }: Route.LoaderArgs) {
  const repo = createD1Repo(context.get(cloudflareContext).env.DB);
  return { days: await repo.pastDays(dayNumber(new Date()), 60) };
}

export default function LedgerIndex({ loaderData }: Route.ComponentProps) {
  const { days } = loaderData;
  return (
    <ContentPage title="Past dives" kicker="The archive">
      <p>
        Each finished day’s ledger: what the crowd said, every prompt’s Rejuvenator, and how deep
        the couriers went. Today’s dive stays secret until the reset at 00:00 UTC.
      </p>
      {days.length === 0 ? (
        <p>No finished dives yet — the first ledger appears the day after launch.</p>
      ) : (
        <ul className="archive-list">
          {days.map((d) => (
            <li key={d}>
              <Link to={`/ledger/${d}`}>{dayLabel(d)}</Link>
              {d >= 1 ? <span className="archive-date">{dayDate(d)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </ContentPage>
  );
}
