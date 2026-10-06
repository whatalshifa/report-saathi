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

test("a misread value can be fixed, and its flag follows the fix", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /Sample Pathology Lab, Pune.*12 Jan 2026/ }).click();
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention.getByText("Haemoglobin (Hb)")).toBeVisible();
  // The table on a computer, the stacked list on a phone: whichever is showing.
  const row = page
    .getByRole("region", { name: "All results" })
    .locator("tr, li")
    .filter({ hasText: "Haemoglobin (Hb)", visible: true });
  await expect(row.getByText("Low", { exact: true })).toBeVisible();

  const pencil = page.getByRole("button", { name: "Fix Haemoglobin (Hb)" });
  const form = page.getByRole("form", { name: "Fix Haemoglobin (Hb)" });
  await pencil.click();
  await expect(form.getByLabel("Value", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();
  await expect(pencil).toBeFocused();

  await pencil.click();
  await form.getByLabel("Value", { exact: true }).fill("");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("alert")).toHaveText(/Enter the value/);
  await form.getByLabel("Value", { exact: true }).fill("13");
  await form.getByLabel("Value", { exact: true }).press("Enter");

  await expect(form).toBeHidden();
  await expect(row.getByText("Normal", { exact: true })).toBeVisible();
  await expect(row.getByTitle("You corrected this; it was read as 10.6 g/dL")).toBeVisible();
  await expect(attention.getByText("Haemoglobin (Hb)")).toHaveCount(0);
  await expect(page.getByText(/written before you corrected a value/)).toBeVisible();

  // The fix is saved, not just shown.
  await page.reload();
  await expect(row.getByText("Normal", { exact: true })).toBeVisible();
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
