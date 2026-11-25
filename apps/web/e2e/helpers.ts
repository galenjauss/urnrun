import { expect, type Page } from "@playwright/test";

/** Collects page errors and CSP/console errors; assert empty at the end of a test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // Intentional API refusals (e.g. a locked Free Dive's 403) log as failed resources;
    // specs assert those outcomes directly, so only real script/CSP errors count here.
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) {
      errors.push(`console: ${m.text()}`);
    }
  });
  return errors;
}

/** Play one round: wait for the clock, drop `answer`, wait for the reveal. */
export async function playRound(page: Page, answer: string): Promise<void> {
  const input = page.locator("#guess:not([disabled])");
  await input.waitFor({ timeout: 20_000 });
  await input.fill(answer);
  await input.press("Enter");
  await expect(page.locator(".reveal")).toBeVisible({ timeout: 10_000 });
}

export async function playDive(page: Page, answer = "Omega"): Promise<void> {
  for (let i = 0; i < 7; i++) await playRound(page, answer);
  await expect(page.locator(".ledger")).toBeVisible({ timeout: 20_000 });
}

/** Wait for the dive to boot, dismissing the first-visit how-to if it appears. */
export async function begin(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: /pick up the urn/i });
  await start.or(page.locator(".prompt-card")).first().waitFor({ timeout: 15_000 });
  if (await start.isVisible()) await start.click();
  await expect(page.locator(".prompt-card")).toBeVisible({ timeout: 15_000 });
}
