import { MAX_SOULS, zoneFor } from "@urnrun/core";
import { formatFt } from "../tiers";

interface UrnMeterProps {
  total: number;
}

/** The Urn: fills with soul-light as souls accrue; the depth counter rides beneath it. */
export function UrnMeter({ total }: UrnMeterProps) {
  const fill = Math.min(1, total / MAX_SOULS);
  return (
    <figure className="urn-meter" aria-label={`Depth ${formatFt(total)}, ${zoneFor(total).name}`}>
      <svg viewBox="0 0 64 80" aria-hidden="true">
        <defs>
          <clipPath id="urn-body">
            <path d="M22 6h20l-3 6c8 4 13 11 13 20 0 13-9 22-20 23v5h8v5H24v-5h8v-5C21 54 12 45 12 32c0-9 5-16 13-20z" />
          </clipPath>
        </defs>
        <g clipPath="url(#urn-body)">
          <rect x="0" y="0" width="64" height="80" className="urn-void" />
          <rect
            x="0"
            y="0"
            width="64"
            height="80"
            className="urn-liquid"
            style={{ transform: `translateY(${(1 - fill) * 62 + 4}px)` }}
          />
        </g>
        <path
          className="urn-outline"
          d="M22 6h20l-3 6c8 4 13 11 13 20 0 13-9 22-20 23v5h8v5H24v-5h8v-5C21 54 12 45 12 32c0-9 5-16 13-20z"
        />
      </svg>
      <figcaption>
        <span className="depth">{formatFt(total)}</span>
        <span className="zone">{zoneFor(total).name}</span>
      </figcaption>
    </figure>
  );
}
