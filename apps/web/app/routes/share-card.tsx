import { decodeShareCode, verdictFor, zoneFor } from "@urnrun/core";
import { Link, data } from "react-router";
import { CARD, cardTotal } from "../../workers/og/card";
import { formatFt } from "../game/tiers";
import { ContentPage } from "../site/ContentPage";
import { dayLabel } from "../site/days";
import { SITE } from "../site/site";
import type { Route } from "./+types/share-card";

export function loader({ params, request }: Route.LoaderArgs) {
  const day = Number(params.day);
  const tiers = decodeShareCode(params.code ?? "");
  if (!tiers || !Number.isInteger(day) || !/^-?\d{1,5}$/.test(params.day ?? "")) {
    throw data("Unknown share card", { status: 404 });
  }
  const total = cardTotal(tiers);
  return {
    day,
    total,
    zone: zoneFor(total).name,
    verdict: verdictFor(total).name,
    image: `${new URL(request.url).origin}/s/${day}/${params.code}.png`,
  };
}

export function headers() {
  return { "Cache-Control": "public, max-age=86400" };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Urn Run" }];
  const { day, total, zone, image } = loaderData;
  const title = `${formatFt(total)} · ${zone} — ${dayLabel(day)} · Urn Run`;
  const description =
    "A courier carried the Soul Urn down. Name the rarest right answer to seven Deadlock prompts and see how deep you can sink.";
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:image", content: image },
    { property: "og:image:width", content: String(CARD.w) },
    { property: "og:image:height", content: String(CARD.h) },
    { property: "og:site_name", content: SITE.name },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: image },
    { name: "theme-color", content: "#5fe0c8" },
  ];
}

export default function ShareCard({ loaderData }: Route.ComponentProps) {
  const { day, total, zone, verdict, image } = loaderData;
  return (
    <ContentPage title={`${formatFt(total)} down`} kicker={dayLabel(day)}>
      <p>
        A courier reached <strong>{zone}</strong> — <em>{verdict}</em>.
      </p>
      <img
        className="share-card-img"
        src={image}
        width={CARD.w}
        height={CARD.h}
        alt={`Share card: ${formatFt(total)}, ${zone}, ${verdict}.`}
      />
      <p>
        <Link className="cta" to="/dive">
          Take your own dive
        </Link>
      </p>
      <p>
        <Link to="/how-to-play">How it works →</Link>
      </p>
    </ContentPage>
  );
}
