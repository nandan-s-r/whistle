import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { submitSignup } from "./signup-helper";

test("empty workspace leads to capture; references copy, survive reload and remain usable on mobile", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Reference Reviewer");
  await page.getByLabel("Email address", { exact: true }).fill(`references-${randomUUID()}@example.invalid`);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID() + "Aa1!");
  await submitSignup(page);
  await expect(page.getByRole("heading", { name: "Start with one company.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open demonstration scenario", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Add your first company", exact: true }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close drawer", exact: true }).click();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Source policy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Know where a fact came from", exact: true })).toBeVisible();
  // Replace only this disposable test page's write operation; never read the OS clipboard.
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text: string) => {
      if (!text.includes("Evidence states") || !text.includes("Keep both values")) throw new Error("Incomplete reference");
    } },
  }));
  await page.getByRole("button", { name: "Copy reference", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Reference copied");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Know where a fact came from", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "IC memo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Investment committee standard", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "In this document" }).getByRole("link", { name: "Version discipline", exact: true }).click();
  await expect(page.locator("#library-section-1")).toBeInViewport();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", {
    configurable: true, value: { writeText: async () => { throw new Error("Clipboard permission denied"); } },
  }));
  await page.getByRole("button", { name: "Copy reference", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Select the document text and copy it manually");
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start with one company.", exact: true })).toBeVisible();
});
