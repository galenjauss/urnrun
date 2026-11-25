import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, makeNonce, withSecurityHeaders } from "./security";

const html = () => new Response("<html></html>", { headers: { "content-type": "text/html" } });
const json = () => new Response("{}", { headers: { "content-type": "application/json" } });

describe("security headers", () => {
  it("mints unique url-safe nonces", () => {
    const a = makeNonce();
    expect(a).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(makeNonce()).not.toBe(a);
  });

  it("builds a nonce CSP with no inline/eval script allowance", () => {
    const csp = contentSecurityPolicy("abc", true);
    expect(csp).toContain("script-src 'self' 'nonce-abc'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy("abc", false)).not.toContain("upgrade-insecure-requests");
  });

  it("puts the CSP on HTML only, base headers everywhere, HSTS on https", () => {
    const page = withSecurityHeaders(html(), { nonce: "n", https: true, csp: true });
    expect(page.headers.get("content-security-policy")).toContain("'nonce-n'");
    expect(page.headers.get("strict-transport-security")).toContain("max-age=");
    expect(page.headers.get("x-content-type-options")).toBe("nosniff");
    const api = withSecurityHeaders(json(), { nonce: "n", https: false, csp: true });
    expect(api.headers.get("content-security-policy")).toBeNull();
    expect(api.headers.get("strict-transport-security")).toBeNull();
    expect(api.headers.get("x-frame-options")).toBe("DENY");
  });

  it("can skip the CSP (dev server)", () => {
    const page = withSecurityHeaders(html(), { nonce: "n", https: false, csp: false });
    expect(page.headers.get("content-security-policy")).toBeNull();
  });
});
