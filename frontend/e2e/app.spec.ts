import { expect, test, type Page } from "@playwright/test";

async function startDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo, no sign-up" }).click();
  await expect(page.getByRole("heading", { name: "Whose reports?" })).toBeVisible();
}

test("signed-out visitors see the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Understand every lab report your family gets." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a free account" })).toBeVisible();
});

test("private pages send signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/family");
  await expect(page).toHaveURL(/\/login\?next=%2Ffamily/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the demo opens an account with the sample reports", async ({ page }) => {
  await startDemo(page);
  await expect(page.getByText("You're exploring a demo account")).toBeVisible();
  await expect(page.getByRole("link", { name: /Meera Joshi\s*Sample/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sample Pathology Lab, Pune/ })).toHaveCount(2);
  await expect(page.getByText("Reading new reports is paused on this demo")).toBeVisible();
});

test("a report shows flags and explains them in Hindi", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /Sample Pathology Lab, Pune.*12 Jan 2026/ }).click();
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByText("Outside normal range")).toBeVisible();
  await page.getByRole("tab").nth(1).click();
  await expect(page.getByText(/सामान्य सीमा से बाहर/).first()).toBeVisible();
});

test("the timeline shows trends and the doctor brief", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /results over time/ }).click();
  await expect(page.getByText("Tests tracked")).toBeVisible();
  const ldl = page.locator("article", { hasText: "LDL cholesterol" });
  await expect(ldl.getByText("Moving towards the normal range")).toBeVisible();

  await page.getByRole("button", { name: "Prepare doctor brief" }).click();
  await expect(page.getByText("Pre-visit lab summary")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meera Joshi" })).toBeVisible();
});

test("a new account can sign up and add the samples", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Test Person");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`);
  await page.getByLabel("Password").fill("a long test passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Whose reports?" })).toBeVisible();
  await expect(page.getByText("No reports yet")).toBeVisible();

  await page.getByRole("button", { name: "Add sample reports" }).click();
  await expect(page.getByRole("heading", { name: "Meera Joshi’s reports" })).toBeVisible();
});

test("the theme switch changes and remembers the theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: /Theme:/ }).click(); // system -> light
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: /Theme:/ }).click(); // light -> dark
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("unknown pages show a friendly 404", async ({ page }) => {
  await startDemo(page);
  const response = await page.goto("/nothing-here");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
});

test("the page never scrolls sideways on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await startDemo(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
