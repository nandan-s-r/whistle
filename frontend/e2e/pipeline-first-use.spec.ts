import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { submitSignup } from "./signup-helper";

test("first Pipeline company survives a partial save, gains evidence and retains a reasoned decision", async ({ page }) => {
  test.setTimeout(180000);
  const output = path.resolve("../docs/screenshots");
  mkdirSync(output, { recursive: true });
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("First-time Reviewer");
  await page.getByLabel("Email address", { exact: true }).fill(`pipeline-${randomUUID()}@example.invalid`);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID() + "Aa1!");
  await submitSignup(page);
  await page.goto("/pipeline");
  let auditChecks = 0;
  async function audit() {
    await page.addScriptTag({ path: path.resolve("node_modules/axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (document: Document, options: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
      return (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }));
    });
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    auditChecks++;
  }
  for (const mode of ["light", "dark"]) {
    const toggle = page.getByRole("switch", { name: "Dark mode", exact: true });
    if (await toggle.getAttribute("aria-checked") !== String(mode === "dark")) await toggle.click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await audit();
      await page.screenshot({ path: path.join(output, `whistle-pipeline-first-empty-${mode}-${width}.png`) });
      await page.getByText("How Pipeline works", { exact: true }).click();
      await audit();
      await page.getByText("How Pipeline works", { exact: true }).click();
      await page.getByRole("button", { name: "Add company", exact: true }).click();
      await audit();
      await page.screenshot({ path: path.join(output, `whistle-pipeline-intake-${mode}-${width}.png`) });
      await page.getByText("More company details", { exact: true }).click();
      await audit();
      await page.getByRole("button", { name: "Close drawer", exact: true }).click();
    }
  }
  expect(auditChecks).toBe(16);
  await page.getByRole("switch", { name: "Dark mode", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add your first company", exact: true })).toBeVisible();
  await expect(page.locator(".pipeline-status-tabs")).not.toBeVisible();
  await page.getByText("How Pipeline works", { exact: true }).click();
  await expect(page.getByText(/A completed transaction is tracked separately/)).toBeVisible();
  await page.getByText("How Pipeline works", { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  const intake = page.getByRole("dialog");
  await expect(intake.getByRole("heading", { name: "Add a company to Pipeline", exact: true })).toBeVisible();
  await expect(intake.locator("input[required]:visible")).toHaveCount(3);
  await expect(intake.getByLabel("Geography", { exact: true })).not.toBeVisible();
  const domain = `first-review-${randomUUID()}.example.invalid`;
  await intake.getByLabel("Company name", { exact: true }).fill("First Review Co");
  await intake.getByLabel(/^Company website or domain/).fill(domain);
  await intake.getByLabel(/^Founder or person to research/).fill("Sample Contact");
  // Hidden required details must become visible when native validation needs them.
  await intake.getByText("More company details", { exact: true }).click();
  await intake.getByLabel("Geography", { exact: true }).fill("");
  await intake.getByText("More company details", { exact: true }).click();
  await intake.getByRole("button", { name: "Add to pipeline", exact: true }).click();
  await expect(intake.getByLabel("Geography", { exact: true })).toBeVisible();
  await intake.getByLabel("Geography", { exact: true }).fill("Not evidenced");
  await intake.getByText("More company details", { exact: true }).click();
  await page.screenshot({ path: path.join(output, "whistle-pipeline-first-intake-390.png") });
  let creations = 0;
  let failMembership = true;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().endsWith("/api/workspace/companies")) creations++;
  });
  await page.route("**/api/workspace/companies/*/actions", async route => {
    if (failMembership && route.request().postDataJSON()?.action === "pipeline") {
      failMembership = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Pipeline save temporarily unavailable. Try again." }) });
    } else await route.continue();
  });
  await intake.getByRole("button", { name: "Add to pipeline", exact: true }).click();
  await expect(intake.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(intake.getByRole("status")).toContainText("First Review Co is saved");
  await intake.getByRole("button", { name: "Retry adding to pipeline", exact: true }).click();
  await expect(intake).not.toBeVisible();
  expect(creations).toBe(1);
  const row = page.locator(".pipeline-table tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Unreviewed");
  await expect(row).toContainText("No claims reviewed yet");
  await page.reload();
  await expect(row).toHaveCount(1);
  await row.getByRole("link", { name: /Add the first source$/ }).click();
  await expect(page).toHaveURL(/tab=Evidence/);
  await page.getByRole("button", { name: "Capture source", exact: true }).click();
  const source = page.getByRole("dialog");
  await source.getByLabel("Source title", { exact: true }).fill("Synthetic company product note");
  await source.getByLabel("Original source URL", { exact: true }).fill("https://example.invalid/product-note");
  await source.getByLabel("Supporting or contradicting excerpt", { exact: true }).fill("Synthetic test excerpt: this company describes software for procurement teams.");
  await source.getByLabel("Claim statement", { exact: true }).fill("The company reports making procurement software.");
  await source.getByRole("button", { name: "Capture source & claim", exact: true }).click();
  await expect(source).not.toBeVisible();
  await page.getByRole("button", { name: "Record decision", exact: true }).click();
  const decision = page.getByRole("dialog");
  await decision.getByLabel("Disposition", { exact: true }).selectOption("Watch");
  await decision.getByLabel("Why this decision?", { exact: true }).fill("Only a company-reported product claim is available; customer demand remains unverified.");
  await decision.getByLabel("What would change your mind?", { exact: true }).fill("Review customer references and a dated traction source before proceeding.");
  await decision.getByRole("button", { name: "Save decision", exact: true }).click();
  await expect(decision).not.toBeVisible();
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.reload();
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Watch");
  await expect(row).toContainText("1 source");
  await expect(row).toContainText("0/1 claims verified");
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  await intake.getByLabel("Company name", { exact: true }).fill("A duplicate should not replace the company");
  await intake.getByLabel(/^Company website or domain/).fill(`https://www.${domain}/about`);
  await intake.getByLabel(/^Founder or person to research/).fill("A duplicate should not replace the contact");
  await intake.getByRole("button", { name: "Add to pipeline", exact: true }).click();
  await expect(intake).not.toBeVisible();
  expect(creations).toBe(2);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("First Review Co");
  await expect(row).toContainText("Watch");
  await expect(row).toContainText("1 source");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: path.join(output, "whistle-pipeline-first-review-390.png") });
});
