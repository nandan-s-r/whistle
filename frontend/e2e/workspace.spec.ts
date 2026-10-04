import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { submitSignup, submitLocalSignin } from "./signup-helper";

const email = `e2e-${randomUUID()}@example.invalid`;
const password = randomUUID() + "Aa1!";
let sessionState: Awaited<ReturnType<BrowserContext["storageState"]>>;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(150000);
  const signupPage = await browser.newPage({baseURL:process.env.E2E_BASE_URL || "http://127.0.0.1:3000"});
  await signupPage.goto("/signup");
  await signupPage.getByLabel(/full name/i).fill("Test Analyst");
  await signupPage.getByLabel(/email/i).fill(email);
  await signupPage.getByLabel(/password/i).fill(password);
  await submitSignup(signupPage);
  await expect(
    signupPage.getByRole("link", { name: "Discover", exact: true }),
  ).toBeVisible();
  await signupPage.getByRole("button", { name: "Open demonstration scenario", exact: true }).click();
  await expect(signupPage.getByRole("heading", { name: "Your research desk" })).toBeVisible();
  await signupPage.getByRole("button", { name: "Sign out", exact: true }).click();
  const localSignIn = signupPage.getByRole("button", {
    name: "Use local preview",
    exact: true,
  });
  if (await localSignIn.isVisible()) await localSignIn.click();
  await signupPage.getByLabel("Email address", { exact: true }).fill(email);
  await signupPage.getByLabel("Password", { exact: true }).fill(password);
  await submitLocalSignin(signupPage);
  await expect(
    signupPage.getByRole("link", { name: "Discover", exact: true }),
  ).toBeVisible();
  // Reuse the synthetic account's session in memory; exercise real sign-in once,
  // without exhausting the production login limiter or writing credentials to disk.
  sessionState = await signupPage.context().storageState();
  await signupPage.close();
});

test.beforeEach(async ({ page, context }) => {
  await context.addCookies(sessionState.cookies);
  await context.addInitScript((origins) => {
    const origin = origins.find((entry) => entry.origin === location.origin);
    for (const entry of origin?.localStorage ?? []) {
      localStorage.setItem(entry.name, entry.value);
    }
  }, sessionState.origins);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Discover", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your research desk" })).toBeVisible();
});

test("sourcing studio connects founder notes, review scheduling, memo revisions and native downloads", async ({ page }) => {
  test.setTimeout(90000);
  const failures: string[] = [];
  page.on("pageerror", e => failures.push(e.message));
  await page.goto("/discover");
  await expect(page.getByRole("button", {name:/^Founder research/})).not.toBeVisible();
  await page.locator('.sourcing-tool-menu > summary').click();
  await page.getByRole("button", {name:/^Founder research/}).click();
  const founder = page.getByRole("dialog", {name:"Founder research / LinkedIn companion",exact:true});
  await founder.getByLabel("Founder research company").selectOption("atlasops");
  await founder.getByLabel("Public LinkedIn profile").fill("https://www.linkedin.com/in/studio-candidate-test");
  await founder.getByLabel("Founder name",{exact:true}).fill("Studio Candidate");
  await founder.getByLabel("Reported prior employer").fill("Google");
  await founder.getByLabel("Your profile notes").fill("Authorized example notes: a reported founder role and prior Google employment, both requiring independent confirmation.");
  await founder.getByRole("button", {name:"Preview research plan",exact:true}).click();
  await expect(founder.getByRole("heading", {name:"Your verification plan",exact:true})).toBeVisible();
  await founder.getByRole("button", {name:"Capture notes for evidence review",exact:true}).click();
  await expect(founder.getByText("Founder notes captured.",{exact:true})).toBeVisible();
  await founder.getByRole("button",{name:"Close drawer",exact:true}).click();

  await page.goto("/");
  await page.getByRole("button",{name:"Schedule review",exact:true}).click();
  await page.getByLabel("Review company").selectOption("atlasops");
  await page.getByRole("button",{name:"Plan this review",exact:true}).click();
  const review=page.getByRole("dialog",{name:"Schedule an investment review",exact:true});
  await review.getByLabel("Meeting title",{exact:true}).fill("Studio founder review");
  await review.getByLabel("Meeting starts at").fill("2026-10-10T14:30");
  await review.getByLabel("Meeting agenda").fill("Resolve the sales-cycle contradiction before a partner recommendation.");
  await review.locator('.studio-choices input').nth(3).check();
  await review.getByRole("button",{name:"Save meeting",exact:true}).click();
  await expect(review).not.toBeVisible();
  await page.getByRole("button",{name:/Studio founder review/}).click();
  const brief=page.getByRole("dialog",{name:"Meeting preparation",exact:true});
  await expect(brief.getByRole("heading",{name:"Questions for this review",exact:true})).toBeVisible();
  const calendarPromise=page.waitForEvent("download");
  await brief.getByRole("button",{name:"Download calendar file",exact:true}).click();
  expect((await calendarPromise).suggestedFilename()).toMatch(/\.ics$/);
  await brief.getByRole("button",{name:"Edit meeting / record outcome",exact:true}).click();
  const outcome=page.getByRole("dialog",{name:"Review meeting & outcome",exact:true});
  await outcome.getByLabel("Meeting status").selectOption("Complete");
  await outcome.getByLabel("Meeting outcome").fill("Recorded the customer reference request. Sales-cycle evidence still needs review.");
  await outcome.getByRole("button",{name:"Save meeting outcome",exact:true}).click();
  await expect(outcome).not.toBeVisible();
  await expect(page.getByRole("button",{name:/Studio founder review/})).toHaveCount(0);

  await page.goto("/companies/atlasops?tab=Model");
  await page.getByRole("button",{name:"Calculate & freeze version",exact:true}).click();
  await expect(page.getByText("FROZEN V1",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Memo",exact:true}).click();
  await page.getByRole("button",{name:"Draft IC memo",exact:true}).click();
  await expect(page.getByRole("article",{name:"Frozen memo version 1",exact:true})).toBeVisible();
  await page.goto("/companies/atlasops?tab=Memo&memo=1");
  await page.getByRole("button",{name:"Write investment view",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Write your investment view",exact:true});
  await editor.getByLabel("Why can this company win?",{exact:true}).fill("The workflow wedge could support expansion if customer references confirm repeatable paid usage [S01].");
  await editor.getByLabel("The strongest counter-case",{exact:true}).fill("Procurement could be longer than the base case and renewal evidence remains insufficient.");
  await editor.getByLabel("What would reverse your view?",{exact:true}).fill("Three paid renewals with dated customer evidence would justify reopening this recommendation.");
  await editor.locator('.studio-choices input').first().check();
  await editor.getByLabel("What changed?",{exact:true}).fill("Added the analyst counter-case and a measurable revisit condition.");
  await editor.getByRole("button",{name:"Approve & freeze new version",exact:true}).click();
  await expect(editor).not.toBeVisible();
  await expect(page).toHaveURL(/memo=2/);
  await expect(page.getByRole("article",{name:"Frozen memo version 2",exact:true})).toBeVisible();
  const moreTools = page.locator('.company-tool-menu');
  await expect(moreTools).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button', {name:'Prepare presentation', exact:true})).not.toBeVisible();
  await moreTools.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(moreTools).toHaveAttribute('open', '');
  await page.getByRole('button', {name:'Prepare presentation', exact:true}).click();
  const deck=page.getByRole("dialog",{name:"Investment review presentation",exact:true});
  await deck.getByRole("button",{name:"Prepare presentation",exact:true}).click();
  await expect(deck.locator('.slide-stage h3')).toHaveText("AtlasOps");
  await deck.getByRole("button",{name:"Next slide",exact:true}).click();
  await expect(deck.locator('.slide-stage h3')).toHaveText("Executive Recommendation");
  for (const [name,extension] of [["Download PowerPoint","pptx"],["Download PDF memo","pdf"]]) {
    const pending=page.waitForEvent("download");await deck.getByRole("button",{name,exact:true}).click();expect((await pending).suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
  }
  await deck.getByRole("button",{name:"Close drawer",exact:true}).click();
  const workbook=page.waitForEvent("download");await page.getByRole("button",{name:"Download linked Excel model",exact:true}).click();expect((await workbook).suggestedFilename()).toMatch(/\.xlsx$/);
  await page.reload();await expect(page.getByRole("article",{name:"Frozen memo version 2",exact:true})).toBeVisible();
  expect(failures).toEqual([]);
});

test("connections show truthful setup states and a durable research task", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page
    .getByRole("button", { name: "Connections & imports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Connections & imports" }),
  ).toBeVisible();
  await expect(
    page.getByText("Plan access blocked", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Company", { exact: true }).selectOption("atlasops");
  await page.getByRole("button", { name: "Queue task", exact: true }).click();
  await expect(
    page.getByText("Task queued. You can leave this page while it runs."),
  ).toBeVisible();
  const latest = page.locator(".job-card").first();
  await expect(latest.getByText("Succeeded", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(
    latest.getByText("Rules-based templates · draft for review"),
  ).toBeVisible();
  await latest
    .getByRole("button", { name: "Save draft for review", exact: true })
    .click();
  await expect(
    page.getByText("Draft saved in the company's assistant for approval.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    latest.getByRole("button", { name: "Draft saved for review", exact: true }),
  ).toBeDisabled();
  const failures: number[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/platform/") && response.status() >= 500)
      failures.push(response.status());
  });
  // Exercise multiple five-second polls across the old backend keep-alive boundary.
  await page.waitForTimeout(16000);
  expect(failures).toEqual([]);
  await expect(
    page.locator('.connection-workspace [role="alert"]'),
  ).not.toBeVisible();
});

test("mobile evidence capture remains inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/companies/atlasops?tab=Evidence");
  await expect(page.getByRole("heading", { name: /^AtlasOps/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Capture source", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("diligence connects Today, evidence outcomes, frozen memo review and export", async ({
  page,
}) => {
  test.setTimeout(90000);
  const title = `Playwright cohort check ${Date.now()}`;
  await page.goto("/companies/atlasops?tab=Diligence");
  await page.getByRole("button", { name: "Plan a task", exact: true }).click();
  await page.getByLabel("Linked claim", { exact: true }).selectOption("C04");
  await page.getByLabel("Work title", { exact: true }).fill(title);
  await page
    .getByRole("button", { name: "Save diligence work", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: /^Today/ }).click();
  await page
    .getByRole("link", { name: /^Diligence due:/ })
    .click();
  await page
    .locator(".review-work-row")
    .filter({ hasText: title })
    .getByRole("link", { name: "Review AtlasOps: Diligence due" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Work status", { exact: true })
    .selectOption("Complete");
  await expect(
    page.getByRole("button", { name: "Save diligence work", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Research outcome or blocker", { exact: true })
    .fill(
      "Fictional reference source addresses a different cohort. The claim still needs canonical evidence review.",
    );
  await page.getByRole("checkbox", { name: /S04/ }).check();
  await page
    .getByRole("button", { name: "Save diligence work", exact: true })
    .click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Model", exact: true }).click();
  await page
    .getByRole("button", { name: "Calculate & freeze version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByRole("link", { name: "Memo", exact: true }).click();
  await page
    .getByRole("button", { name: "Draft IC memo", exact: true })
    .click();
  await expect(
    page.getByText("This frozen memo matches the current research snapshot.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Review comment", { exact: true })
    .fill(
      "Fictional review: require cohort-level billing evidence before progressing.",
    );
  await page
    .getByRole("button", { name: "Save review comment", exact: true })
    .click();
  await expect(
    page.getByText(
      "Fictional review: require cohort-level billing evidence before progressing.",
      { exact: true },
    ),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download review pack", exact: true })
    .click();
  const archive = await downloaded;
  expect(archive.suggestedFilename()).toMatch(/^atlasops-review-r\d+\.zip$/);
  expect(await archive.path()).not.toBeNull();
  await page.getByRole("link", { name: "Diligence", exact: true }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page
    .locator(".diligence-work-row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Review work", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.getByLabel("Work status", { exact: true }).selectOption("Open");
  await page
    .getByRole("button", { name: "Save diligence work", exact: true })
    .click();
  await page.getByRole("link", { name: "Memo", exact: true }).click();
  await expect(
    page.getByText("Research changed after this memo was frozen.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("guided exploration preserves frozen memo text and scoped citations", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Explore the workspace", exact: true })
    .click();
  const guide = page.getByRole("dialog", {
    name: "How to research a company",
    exact: true,
  });
  await expect(guide).toBeVisible();
  await guide
    .getByRole("button", { name: "Evidence labels", exact: true })
    .click();
  await expect(
    guide.getByText("Independent confirmation is still needed.", {
      exact: false,
    }),
  ).toBeVisible();
  await guide
    .getByRole("button", { name: "Useful terms", exact: true })
    .click();
  await expect(
    guide.getByRole("heading", { name: "Frozen version", exact: true }),
  ).toBeVisible();
  await guide
    .getByRole("button", { name: "Close workspace guide", exact: true })
    .press("Escape");
  await expect(guide).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore the workspace", exact: true }),
  ).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");

  // Existing fixture memos preserve their text; inspect the first saved version.
  await page.goto("/companies/atlasops?tab=Memo");
  await page
    .getByRole("combobox", { name: "Memo", exact: true })
    .selectOption({ value: "1" });
  const memo = page.getByRole("article", {
    name: "Frozen memo version 1",
    exact: true,
  });
  await expect(memo).toBeVisible();
  await page.getByText("View original saved text", { exact: true }).click();
  const original = await page.locator(".memo-original pre").textContent();
  expect(original).toContain("INVESTMENT COMMITTEE · AtlasOps");
  const citation = memo.locator(".memo-citation").first();
  const sourceName = (await citation.getAttribute("aria-label"))!.replace(
    "Inspect frozen source: ",
    "",
  );
  await citation.click();
  const source = page.getByRole("dialog", { name: sourceName, exact: true });
  await expect(source).toBeVisible();
  await expect(
    source.getByText("FROZEN SOURCE / MEMO V1", { exact: true }),
  ).toBeVisible();
  await expect(
    source.getByText("Fictional demonstration source.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(source).not.toBeVisible();
  await expect(citation).toBeFocused();
  await expect(page.locator(".memo-original pre")).toHaveText(original!);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Explore the workspace", exact: true })
    .click();
  await expect(guide).toBeVisible();
  expect(
    await guide.evaluate(
      (el) => el.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
});

test("review filters survive reload and view preferences survive unavailable storage", async ({ page }) => {
  await page.getByRole("link", { name: /^Companies with conflicts:/ }).click();
  await expect(page).toHaveURL(/\/reviews\?filter=Evidence%20conflict$/);
  await expect(page.getByRole("combobox", { name: "Filter reviews" })).toHaveValue("Evidence conflict");
  await page.getByRole("searchbox", { name: "Search reviews" }).fill("AtlasOps");
  await expect(page.locator(".review-work-row")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Review AtlasOps: Evidence conflict", exact: true })).toHaveAttribute("href", /\?tab=Evidence$/);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Filter reviews" })).toHaveValue("Evidence conflict");
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await page.getByRole("combobox", { name: "Sort companies" }).selectOption("Source count");
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.locator(".pipeline-table")).toBeVisible();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.locator(".pipeline-board")).toBeVisible();
  await page.getByRole("link", { name: /^Today/ }).click();
  await expect(page.getByRole("heading", { name: "Next reviews", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Sort companies" })).toHaveValue("Source count");

  // A browser that refuses preference storage must still allow changing views.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("vc-scope:view:")) throw new DOMException("Blocked", "SecurityError");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("combobox", { name: "Sort companies" }).selectOption("Thesis fit");
  await expect(page.getByRole("combobox", { name: "Sort companies" })).toHaveValue("Thesis fit");
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.locator(".pipeline-board")).toBeVisible();
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Sort companies" })).toHaveValue("Thesis fit");

  await page.goto("/companies/atlasops");
  await expect(page.getByRole("heading", { name: /^AtlasOps/ })).toBeVisible();
  await page.keyboard.press("e");
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/tab=Memo/);
  await page.setViewportSize({ width: 390, height: 844 });
  const account = page.locator('summary[aria-label="Account options"]');
  await account.click();
  await expect(page.getByRole("button", { name: "Sign out of workspace", exact: true })).toBeVisible();
  await account.press("Escape");
  await expect(account).toBeFocused();
  await expect(page.locator(".account-menu")).not.toHaveAttribute("open");
  await account.click();
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.locator(".account-menu")).not.toHaveAttribute("open");
  await account.click();
  await page.getByRole("button", { name: "Sign out of workspace", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in." })).toBeVisible();
});

test("pipeline register searches, switches views and preserves source inspection on mobile", async ({ page }) => {
  await page.goto("/pipeline");
  const table = page.locator(".pipeline-table");
  await expect(table).toBeVisible();
  const originalRows = await table.locator("tbody tr").count();
  expect(originalRows).toBeGreaterThan(0);
  const companyName = await table.locator(".entity-link strong").first().innerText();
  const search = page.getByRole("textbox", { name: "Filter pipeline companies" });
  await search.fill(companyName);
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr")).toContainText(companyName);
  await search.fill("no-company-matches-this-query");
  await expect(page.getByRole("heading", { name: "No matching companies", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(table.locator("tbody tr")).toHaveCount(originalRows);
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Person / company", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.locator(".pipeline-board")).toBeVisible();
  await page.getByRole("button", { name: `Inspect ${companyName} evidence`, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Companies", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: `Inspect ${companyName} evidence`, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: `Inspect ${companyName} evidence`, exact: true })).toBeFocused();
  await page.getByRole("group", { name: "Filter pipeline by decision", exact: true }).getByRole("button", { name: /^Watch/ }).click();
  const decisions = await page.locator(".pipeline-decision").allTextContents();
  expect(decisions.every(decision => decision === "Watch")).toBe(true);
  await page.getByRole("group", { name: "Filter pipeline by decision", exact: true }).getByRole("button", { name: /^All/ }).click();
  await expect(table.locator("tbody tr")).toHaveCount(originalRows);
});

test("light and dark themes persist, sync across tabs and work without preference storage", async ({ page, context }) => {
  const toggle = page.getByRole("switch", { name: "Dark mode", exact: true });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Discover", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  const other = await context.newPage();
  await other.goto("/library");
  await expect(other.getByRole("switch", { name: "Dark mode", exact: true })).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(other.getByRole("switch", { name: "Dark mode", exact: true })).toHaveAttribute("aria-checked", "false");
  await other.close();

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "vc-scope:theme:v1") throw new DOMException("Blocked", "SecurityError");
      return original.call(this, key, value);
    };
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});
