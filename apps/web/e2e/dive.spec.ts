import { expect, test } from "@playwright/test";
import { begin, playDive, watchErrors } from "./helpers";

test("a full daily dive reaches the ledger, then unlocks Free Dive", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/dive?mode=free");
  await expect(page.locator(".status-card")).toContainText("Finish today");

  await page.goto("/dive");
  await begin(page);
  await expect(page.locator("canvas.scene-canvas")).toHaveCount(1);
  await playDive(page, "Omega");

  const ledger = page.locator(".ledger");
  await expect(ledger.locator(".ledger-zone")).toHaveText("The Patron's Hearth");
  await expect(ledger.locator(".ledger-verdict")).toHaveText("Patron's Courier");
  await expect(ledger.locator(".constellation")).toBeVisible();
  await expect(ledger.locator(".share-preview")).toContainText("/s/");
  await expect(ledger.locator(".ledger-row")).toHaveCount(7);

  await page.getByRole("link", { name: /free dive/i }).click();
  await expect(page.locator(".prompt-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".prompt-text")).toContainText("E2E prompt");

  expect(errors).toEqual([]);
});

test("wrong guesses only cost time and near misses suggest", async ({ page }) => {
  await page.goto("/dive");
  await begin(page);
  const input = page.locator("#guess:not([disabled])");
  await input.waitFor({ timeout: 20_000 });
  await input.fill("Omegx");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: /omega/i })).toBeVisible();
  await input.fill("Zulu");
  await input.press("Enter");
  await expect(page.locator("#guess")).toBeEnabled();
});

test("share card image renders", async ({ request }) => {
  const res = await request.get("/s/1/rrrrrrr.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect((await res.body()).length).toBeGreaterThan(10_000);
  expect((await request.get("/s/1/zzzzzzz.png")).status()).toBe(404);
});

test("yesterday is replayable from the archive", async ({ page }) => {
  await page.goto("/ledger");
  await page.locator(".archive-list a").first().click();
  await expect(page.locator(".day-prompts > li")).toHaveCount(7);
  await page.getByRole("link", { name: /replay this dive/i }).click();
  await begin(page);
  await expect(page).toHaveURL(/mode=archive/);
});
