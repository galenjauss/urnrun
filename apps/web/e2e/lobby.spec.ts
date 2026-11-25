import { expect, test, type Page } from "@playwright/test";

/** Two couriers in separate browser contexts play a full five-round séance. */
test("a séance runs from lobby to podium with jinx and unique bonuses", async ({ browser }) => {
  test.setTimeout(150_000);
  const host = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage();
  const guest = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage();
  const errors: string[] = [];
  for (const p of [host, guest]) p.on("pageerror", (e) => errors.push(e.message));

  await host.goto("/lobby");
  await host.getByLabel("Your name").fill("Ann");
  await host.getByRole("button", { name: /open a séance/i }).click();
  await host.waitForURL(/\/lobby\/[A-Z]{5}$/);
  const code = host.url().split("/").pop()!;

  await guest.goto(`/lobby/${code}`);
  await guest.getByLabel("Your name").fill("Bo");
  await guest.getByRole("button", { name: /take a seat/i }).click();

  await expect(host.locator(".lobby-players li", { hasText: "Bo" })).toBeVisible();
  await expect(guest.getByText(/waiting for the host/i)).toBeVisible();
  await host.getByRole("radio", { name: "5", exact: true }).click();
  await host.getByRole("radio", { name: "15s" }).click();
  await host.getByRole("button", { name: /begin the séance/i }).click();

  const answer = async (p: Page, text: string) => {
    const input = p.locator(".lobby-guess input:not([disabled])");
    await input.waitFor({ timeout: 15_000 });
    await input.fill(text);
    await input.press("Enter");
  };
  let jinx = false;
  let unique = false;
  for (let r = 0; r < 5; r++) {
    await answer(host, r % 2 ? "Omega" : "Alpha");
    await answer(guest, "Alpha");
    await expect(host.locator(".lobby-results")).toBeVisible({ timeout: 30_000 });
    jinx ||= (await host.locator(".tag.jinx").count()) > 0;
    unique ||= (await host.locator(".tag.unique").count()) > 0;
    await expect(host.locator(".lobby-results")).toBeHidden({ timeout: 15_000 });
  }
  await expect(host.getByRole("heading", { name: /the séance ends/i })).toBeVisible();
  await expect(guest.getByRole("heading", { name: /the séance ends/i })).toBeVisible();
  // Ann: 2 Omega uniques (1000+250) + 3 jinxed Alphas (100) = 2,800; Bo: 3 jinxed + 2 unique Alphas.
  await expect(host.locator(".lobby-podium .place-1")).toContainText("Ann");
  expect({ jinx, unique, errors }).toEqual({ jinx: true, unique: true, errors: [] });
});

test("unknown rooms say so", async ({ page }) => {
  await page.goto("/lobby/ZZZZZ");
  await expect(page.getByRole("heading", { name: /no séance here/i })).toBeVisible();
});
