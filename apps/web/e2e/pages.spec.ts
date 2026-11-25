import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

const PAGES = ["/", "/how-to-play", "/about", "/faq", "/privacy", "/terms", "/ledger", "/stats"];

for (const path of PAGES) {
  test(`${path} renders with the disclaimer, CSP and no errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    expect(res?.headers()["content-security-policy"]).toContain("'nonce-");
    await expect(page.locator(".disclaimer")).toContainText("not affiliated");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    expect(errors).toEqual([]);
  });
}

test("crawler files", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.headers()["content-type"]).toContain("xml");
});

test("client-side navigation hydrates under the CSP", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole("heading", { name: "Frequently asked" })).toBeVisible();
  expect(errors).toEqual([]);
});
