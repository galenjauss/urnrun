import { describe, expect, it } from "vitest";
import { loader as robots } from "../routes/robots[.]txt";
import { loader as sitemap } from "../routes/sitemap[.]xml";
import { CONTENT_PATHS, DISCLAIMER, SITE, pageMeta } from "./site";

describe("site facts", () => {
  it("never carries a personal email address (public repo)", () => {
    const blob = JSON.stringify({ SITE, DISCLAIMER });
    expect(blob).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("states the unofficial-fan-game disclaimer", () => {
    expect(DISCLAIMER).toMatch(/not affiliated with, endorsed, sponsored, or approved by Valve/);
  });

  it("builds canonical meta", () => {
    const m = pageMeta("FAQ", "desc", "/faq");
    expect(m).toContainEqual({ title: "FAQ — Urn Run" });
    expect(m).toContainEqual({
      tagName: "link",
      rel: "canonical",
      href: `${SITE.origin}/faq`,
    });
  });
});

describe("crawler files", () => {
  it("lists every content page in the sitemap", async () => {
    const xml = await sitemap().text();
    for (const p of CONTENT_PATHS) expect(xml).toContain(`<loc>${SITE.origin}${p}</loc>`);
    expect(xml).not.toContain("/dive");
  });

  it("keeps the API and the dive out of the index", async () => {
    const txt = await robots().text();
    expect(txt).toContain("Disallow: /api/");
    expect(txt).toContain("Disallow: /dive");
    expect(txt).toContain(`Sitemap: ${SITE.origin}/sitemap.xml`);
  });
});
