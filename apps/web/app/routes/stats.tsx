import { dayNumber } from "@urnrun/core";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { summarize, type StatsSummary } from "../game/stats";
import { loadFreeBest, loadStats } from "../game/storage";
import { formatFt } from "../game/tiers";
import { ContentPage } from "../site/ContentPage";
import { pageMeta } from "../site/site";

export const meta = () => [
  ...pageMeta(
    "Your stats",
    "Your Urn Run dives on this device: depth, streaks and history.",
    "/stats",
  ),
  { name: "robots", content: "noindex" },
];

const WINDOW = 30;

export default function Stats() {
  // Local-only data: read after hydration so SSR and the first client render match.
  const [data, setData] = useState<{ s: StatsSummary; free: number } | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setData({
        s: summarize(loadStats().history, dayNumber(new Date()), WINDOW),
        free: loadFreeBest(),
      }),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ContentPage title="Your stats" kicker="This device">
      {!data ? (
        <p>Reading the ledger…</p>
      ) : data.s.played === 0 ? (
        <p>
          No dives recorded on this device yet. <Link to="/dive">Take today’s dive →</Link>
        </p>
      ) : (
        <>
          <dl className="day-stats stats-grid">
            <div>
              <dt>Dives</dt>
              <dd>{data.s.played}</dd>
            </div>
            <div>
              <dt>Deepest</dt>
              <dd>{formatFt(data.s.best)}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>{formatFt(data.s.average)}</dd>
            </div>
            <div>
              <dt>Streak</dt>
              <dd>{data.s.streak}</dd>
            </div>
            <div>
              <dt>Longest streak</dt>
              <dd>{data.s.longest}</dd>
            </div>
            <div>
              <dt>Free Dive best</dt>
              <dd>{data.free ? formatFt(data.free) : "—"}</dd>
            </div>
          </dl>
          <h2>Last {WINDOW} days</h2>
          <History recent={data.s.recent} />
        </>
      )}
      <p className="day-note">
        Stats live in this browser only. Clearing site data resets them; your streak on the server
        is kept with your anonymous ID.
      </p>
    </ContentPage>
  );
}

function History({ recent }: { recent: StatsSummary["recent"] }) {
  const max = Math.max(7000, ...recent.map((r) => r.souls ?? 0));
  const w = 300;
  const h = 120;
  const bw = w / recent.length;
  return (
    <svg
      className="stats-history"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Depth per day for the last ${recent.length} days`}
    >
      {recent.map((r, i) =>
        r.souls === null ? (
          <rect
            key={r.day}
            x={i * bw + bw * 0.2}
            y={h - 2}
            width={bw * 0.6}
            height={2}
            className="miss"
          />
        ) : (
          <rect
            key={r.day}
            x={i * bw + bw * 0.2}
            y={h - Math.max(3, (r.souls / max) * h)}
            width={bw * 0.6}
            height={Math.max(3, (r.souls / max) * h)}
          >
            <title>{`${formatFt(r.souls)}`}</title>
          </rect>
        ),
      )}
    </svg>
  );
}
