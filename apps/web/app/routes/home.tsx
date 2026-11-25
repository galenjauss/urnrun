import { dayNumber, dayStart } from "@urnrun/core";

import type { Route } from "./+types/home";
import "./home.css";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Urn Run — a daily Deadlock deep-cut trivia dive" },
    {
      name: "description",
      content:
        "Carry the Soul Urn down. Name the rarest right answer to seven Deadlock prompts. New dive every day at 00:00 UTC.",
    },
  ];
}

interface LaunchInfo {
  daysUntilLaunch: number;
  launchIso: string;
}

export function loader(): LaunchInfo {
  const today = dayNumber(new Date());
  return {
    daysUntilLaunch: Math.max(0, 1 - today),
    launchIso: dayStart(1).toISOString(),
  };
}

function Sunburst() {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg className="sunburst" viewBox="0 0 200 200" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" opacity="0.8">
        {rays.map((deg) => (
          <line
            key={deg}
            x1="100"
            y1="100"
            x2="100"
            y2={deg % 30 === 0 ? 8 : 26}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </g>
      <circle cx="100" cy="100" r="54" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="100" cy="100" r="47" fill="none" stroke="currentColor" strokeWidth="0.75" />
      {/* Stylized urn silhouette (original art) */}
      <path
        d="M86 70h28l-4 8c10 5 16 14 16 25 0 14-11 25-26 27v6h10v6H90v-6h10v-6c-15-2-26-13-26-27 0-11 6-20 16-25z"
        fill="var(--ink-900)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse className="urn-glow" cx="100" cy="104" rx="11" ry="13" />
    </svg>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { daysUntilLaunch } = loaderData;
  return (
    <main className="title-screen">
      <section className="title-card" aria-labelledby="wordmark">
        <Sunburst />
        <h1 id="wordmark" className="wordmark">
          Urn Run
        </h1>
        <hr className="rule" />
        <p className="tagline">The Urn surfaces soon</p>
        <p className="countdown">
          {daysUntilLaunch > 0
            ? `First dive in ${daysUntilLaunch} day${daysUntilLaunch === 1 ? "" : "s"}`
            : "The first dive is open"}
        </p>
      </section>
    </main>
  );
}
