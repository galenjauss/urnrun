import { describe, expect, it } from "vitest";
import { sanitizeText, slugify } from "./sanitize";

describe("sanitizeText", () => {
  it("strips tags, inline svg and collapses whitespace", () => {
    expect(
      sanitizeText(
        'Deal <span class="highlight">50</span>\n damage <svg width="1"><path d="M1 2"/></svg>now',
      ),
    ).toBe("Deal 50 damage now");
  });

  it("removes gaps left before punctuation", () => {
    expect(sanitizeText("dealing <b>spirit damage</b> , applying <i>slow</i> .")).toBe(
      "dealing spirit damage, applying slow.",
    );
  });

  it("decodes common entities", () => {
    expect(sanitizeText("A &amp; B &lt;3 &quot;x&quot; &#39;y&#39; &nbsp;z")).toBe(
      `A & B <3 "x" 'y' z`,
    );
  });

  it("handles undefined", () => {
    expect(sanitizeText(undefined)).toBe("");
  });
});

describe("slugify", () => {
  it.each([
    ["Mo & Krill", "mo_and_krill"],
    ["The Doorman", "the_doorman"],
    ["Lady Geist", "lady_geist"],
    ["Djinn's Mark", "djinns_mark"],
  ])("%s → %s", (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });
});
