import { createContext } from "react-router";

/**
 * Security headers (SPEC §6.5 / PLAN P6). The CSP is nonce-based: React Router's inline hydration
 * scripts carry the per-request nonce; everything else must come from our own origin.
 */

export const nonceContext = createContext<string>("");

export function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : "",
  );
}

export function contentSecurityPolicy(nonce: string, https: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // React style={} attributes and the canvas need inline styles; no inline <script> is allowed.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Headers for every response (HTML, API, images). */
export const BASE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export const HSTS = "max-age=31536000; includeSubDomains";

/** Returns a copy of `res` with security headers applied. CSP only on HTML documents. */
export function withSecurityHeaders(
  res: Response,
  opts: { nonce: string; https: boolean; csp: boolean },
): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!out.headers.has(k)) out.headers.set(k, v);
  }
  if (opts.https) out.headers.set("Strict-Transport-Security", HSTS);
  const type = out.headers.get("content-type") ?? "";
  if (opts.csp && type.includes("text/html")) {
    out.headers.set("Content-Security-Policy", contentSecurityPolicy(opts.nonce, opts.https));
  }
  return out;
}
