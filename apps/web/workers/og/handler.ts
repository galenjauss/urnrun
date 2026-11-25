import { decodeShareCode } from "@urnrun/core";
import { CARD, cardSvg } from "./card";
import { renderPng } from "./render";

/** `/s/:day/:code.png` — share card image. Deterministic per URL, so it's cached at the edge. */
export const CARD_PNG = /^\/s\/(-?\d{1,5})\/([a-z]{7})\.png$/;

export async function handleCardPng(request: Request, ctx: ExecutionContext): Promise<Response> {
  const match = CARD_PNG.exec(new URL(request.url).pathname);
  const day = match ? Number(match[1]) : NaN;
  const tiers = match ? decodeShareCode(match[2]!) : null;
  if (!tiers || !Number.isInteger(day)) return new Response("Not found", { status: 404 });

  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const png = await renderPng(cardSvg({ day, tiers }), CARD.w);
  const res = new Response(png as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
  ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}
