import { TIERS, dayNumber, zoneFor } from "@urnrun/core";
import { Link, data } from "react-router";
import { createD1Repo } from "../../workers/game/d1-repo";
import { cloudflareContext } from "../cloudflare";
import { buildDayLedger } from "../../workers/game/public-ledger";
import { categoryLabel, formatFt } from "../game/tiers";
import { ContentPage } from "../site/ContentPage";
import { dayDate, dayLabel } from "../site/days";
import { SITE, pageMeta } from "../site/site";
import type { Route } from "./+types/ledger-day";

export async function loader({ params, context }: Route.LoaderArgs) {
  const day = Number(params.day);
  const today = dayNumber(new Date());
  const ledger = Number.isInteger(day)
    ? await buildDayLedger(createD1Repo(context.get(cloudflareContext).env.DB), day, today)
    : null;
  if (!ledger) throw data("No ledger for that day yet", { status: 404 });
  return { ledger };
}

export function headers() {
  return { "Cache-Control": "public, max-age=300" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Ledger not found — Urn Run" }];
  const { ledger } = loaderData;
  const label = dayLabel(ledger.day);
  const tags = pageMeta(
    `${label} answers`,
    `${label} (${dayDate(ledger.day)}): what ${ledger.players} couriers answered to all seven Deadlock prompts, and each prompt’s Rejuvenator.`,
    `/ledger/${ledger.day}`,
  );
  // Pre-launch beta days are playtest data: keep them out of search.
  return ledger.day >= 1 ? tags : [...tags, { name: "robots", content: "noindex" }];
}

export default function LedgerDay({ loaderData }: Route.ComponentProps) {
  const { ledger } = loaderData;
  return (
    <ContentPage title={dayLabel(ledger.day)} kicker={`The Ledger · ${dayDate(ledger.day)}`}>
      <p>
        <Link className="cta" to={`/dive?mode=archive&day=${ledger.day}`}>
          Replay this dive
        </Link>
      </p>
      <dl className="day-stats">
        <div>
          <dt>Couriers</dt>
          <dd>{ledger.players.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>Average depth</dt>
          <dd>{formatFt(ledger.avgSouls)}</dd>
        </div>
        <div>
          <dt>Deepest</dt>
          <dd>
            {formatFt(ledger.bestSouls)}
            <small>{zoneFor(ledger.bestSouls).name}</small>
          </dd>
        </div>
      </dl>

      <ol className="day-prompts">
        {ledger.prompts.map((p) => (
          <li key={p.idx}>
            <p className="content-kicker">
              Round {p.idx + 1} · {categoryLabel(p.category)}
            </p>
            <h2>{p.text}</h2>
            {p.crowd.length > 0 ? (
              <ol className="crowd-bars" aria-label="What the crowd said">
                {p.crowd.map((c) => (
                  <li key={c.display} style={{ "--share": `${c.share}%` } as React.CSSProperties}>
                    <span>{c.display}</span>
                    <span className="crowd-share">{c.share}%</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>Nobody found a right answer.</p>
            )}
            <p className="day-meta">
              {p.rejuvenator ? (
                <>
                  <span aria-hidden="true">{TIERS.rejuvenator.glyph}</span> Rejuvenator:{" "}
                  <strong>{p.rejuvenator}</strong> ·{" "}
                </>
              ) : null}
              {p.answerCount} right answers
            </p>
          </li>
        ))}
      </ol>
      <p>
        <Link to="/ledger">← All past dives</Link> · <Link to="/dive">Play today’s dive →</Link>
      </p>
      <p className="day-note">
        Rarity is measured live from players’ answers. Answers can be reported via{" "}
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          {SITE.contactLabel}
        </a>
        .
      </p>
    </ContentPage>
  );
}
