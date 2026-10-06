import { readFile } from "node:fs/promises";

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

test("a value can be traced back to the original report", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /Sample Pathology Lab, Pune.*12 Jan 2026/ }).click();
  await expect(page.getByRole("link", { name: "View original" })).toHaveAttribute("href", /\/api\/reports\/.+\/file$/);

  const source = page
    .getByRole("region", { name: "Needs attention" })
    .getByRole("button", { name: "See Haemoglobin (Hb) on the original report" });
  await source.click();
  const dialog = page.getByRole("dialog", { name: "Where this number came from" });
  const original = dialog.getByRole("img", { name: "Page 1 of the original report, with Haemoglobin (Hb) highlighted" });
  await expect(original).toBeVisible();
  await expect.poll(() => original.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  // The highlight is on screen: the page was scrolled to the value, not left at the top corner.
  const highlight = dialog.getByTestId("source-highlight");
  await expect(highlight).toBeVisible();
  await expect(highlight).toBeInViewport();
  await expect(dialog.getByText("Read from page 1 of the original")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(source).toBeFocused();

  // A tap outside closes it too.
  await source.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
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

test("a value with no printed range is compared with a typical range, clearly labelled", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /Demo Diagnostics Centre, Pune/ }).click();
  const creatinine = page.locator("li, tr").filter({ hasText: "Creatinine, Serum", visible: true });
  await expect(creatinine.getByText("Typical range, not from your lab")).toBeVisible();
  await expect(creatinine.getByText("0.59 – 1.04")).toBeVisible();
  await expect(page.getByText(/Your lab printed no normal range for some values/)).toBeVisible();
});

test("the doctor brief gives each test's LOINC code", async ({ page }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /results over time/ }).click();
  await page.getByRole("button", { name: "Prepare doctor brief" }).click();
  const ldl = page.getByRole("row").filter({ hasText: "LDL cholesterol" });
  await expect(ldl.getByText("LOINC 2089-1")).toBeVisible();
});

test("the timeline lists tests due for a recheck, carefully worded", async ({ page }) => {
  // Meera's LDL becomes due on 8 Dec 2026; until then, answer as the server will on that day.
  await page.route("**/api/profiles/*/trends", async (route) => {
    const response = await route.fetch();
    const trends = await response.json();
    expect(trends.rechecks).toEqual(expect.any(Array));
    trends.rechecks = [
      {
        key: "ldl",
        name: "LDL cholesterol",
        flag: "high",
        last_date: "2026-09-08",
        months: 3,
        source: "2018 AHA/ACC Cholesterol Guideline",
      },
    ];
    await route.fulfill({ response, json: trends });
  });
  await startDemo(page);
  await page.getByRole("link", { name: /results over time/ }).click();
  const card = page.getByRole("region", { name: "Due for a recheck" });
  await expect(
    card.getByText(
      /^Meera Joshi’s LDL cholesterol was high on 8 Sept? 2026\. Doctors often recheck it after about 3 months\. Ask your doctor whether it's time\.$/,
    ),
  ).toBeVisible();
  await expect(card.getByText("Source: 2018 AHA/ACC Cholesterol Guideline")).toBeVisible();
});

test("a doctor can open a shared brief until the link is revoked", async ({ page, browser }) => {
  await startDemo(page);
  await page.getByRole("link", { name: /results over time/ }).click();
  await page.getByRole("button", { name: "Prepare doctor brief" }).click();
  await expect(page.getByText("Pre-visit lab summary")).toBeVisible();

  const panel = page.getByRole("region", { name: "Share with your doctor" });
  await panel.getByRole("button", { name: "Create a link" }).click();
  const url = await panel.getByLabel(/Your link, works until/).inputValue();
  expect(url).toMatch(/\/shared\/[\w-]{40,}$/);
  await expect(panel.getByText("Not opened yet")).toBeVisible();

  // The doctor's phone: a separate browser that has never signed in.
  const doctorContext = await browser.newContext();
  const doctor = await doctorContext.newPage();
  await doctor.goto(url);
  await expect(doctor.getByRole("heading", { name: "Meera Joshi" })).toBeVisible();
  await expect(doctor.getByText("Shared by a ReportSaathi user")).toBeVisible();
  await expect(doctor.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  await expect(doctor.getByRole("link", { name: /Back to timeline|Family|Reports/ })).toHaveCount(0);
  await expect(doctor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.reload();
  await expect(panel.getByText(/Opened 1 time, last on/)).toBeVisible();
  await panel.getByRole("button", { name: "Revoke" }).click();
  await expect(panel.getByText("Revoked", { exact: true })).toBeVisible();

  await doctor.reload();
  await expect(doctor.getByRole("heading", { name: "This link isn't working" })).toBeVisible();
  await expect(doctor.getByText(/expired or was turned off/)).toBeVisible();
  await expect(doctor.getByRole("heading", { name: "Meera Joshi" })).toHaveCount(0);
  await doctorContext.close();
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

test("the privacy page is public and explains your rights", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "How we look after your reports" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your rights, and how to use them" })).toBeVisible();
  await expect(page.getByText(/Digital Personal Data Protection Act, 2023/)).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub repository" }).first()).toHaveAttribute("href", /github\.com/);

  await page.goto("/signup");
  await expect(page.getByRole("main").getByRole("link", { name: "privacy page" })).toHaveAttribute("href", "/privacy");
});

test("a demo account can download all its data", async ({ page }) => {
  await startDemo(page);
  await page.goto("/account");
  const section = page.getByRole("region", { name: "Your data" });
  await expect(page.getByRole("link", { name: "Read the privacy page" })).toHaveAttribute("href", "/privacy");

  const downloading = page.waitForEvent("download");
  await section.getByRole("button", { name: "Download all my data" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^reportsaathi-export-\d{4}-\d{2}-\d{2}\.zip$/);
  const zip = await readFile(await download.path());
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  // Meera's three report pages are inside, under her name.
  expect(zip.toString("latin1")).toContain("reports/Meera-Joshi/");
  await expect(section.getByText("Done. Look for the file in your Downloads folder.")).toBeVisible();
});

test("the first upload waits for consent", async ({ page }) => {
  // The test server has no AI key, so pretend reading is on to show the upload box. The rest is real.
  await page.route("**/api/features", (route) => route.fulfill({ json: { reading: true } }));
  await startDemo(page);
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/reports") uploads.push(r.url());
  });
  const file = { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") };
  const dialog = page.getByRole("dialog", { name: "Before your first upload" });

  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/encrypted before they are stored/)).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Read the full privacy page" })).toHaveAttribute("href", "/privacy");
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(dialog).toBeHidden();
  expect(uploads).toHaveLength(0);

  await page.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByRole("button", { name: "I agree" }).click();
  await expect(dialog).toBeHidden();
  // Past consent, the file is sent; this server then answers that the AI is off.
  await expect(page.getByRole("alert").filter({ hasText: "The AI is switched off" })).toBeVisible();
  expect(uploads).toHaveLength(1);
});

/** Shares a file to the installed app the way Android does: a multipart POST to the manifest's share_target. */
async function shareFile(page: Page, name: string, type: string, size: number) {
  // The worker must be running to catch the share; it registers itself on every page.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.evaluate(
    ([name, type, size]) => {
      const form = Object.assign(document.createElement("form"), {
        method: "post",
        enctype: "multipart/form-data",
        action: "/share-target",
      });
      const input = Object.assign(document.createElement("input"), { type: "file", name: "file" });
      const files = new DataTransfer();
      files.items.add(new File([new Uint8Array(size)], name, { type }));
      input.files = files.files;
      form.append(input);
      document.body.append(form);
      form.submit();
    },
    [name, type, size] as const,
  );
}

test("the app can be installed, with icons and WhatsApp share-to", async ({ page }) => {
  // Signed out, like a phone checking the site before installing it.
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await page.request.get(href!)).json();
  expect(manifest).toMatchObject({ name: "ReportSaathi", start_url: "/", display: "standalone" });
  expect(manifest.share_target).toMatchObject({
    action: "/share-target",
    method: "POST",
    enctype: "multipart/form-data",
    params: { files: [{ name: "file" }] },
  });
  expect(manifest.share_target.params.files[0].accept).toEqual(
    expect.arrayContaining(["application/pdf", "image/jpeg", "image/png"]),
  );
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);

  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const response = await page.request.get(icon.src);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    // Width and height sit at bytes 16-23 of every PNG.
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
  }

  const worker = await page.request.get("/sw.js", { maxRedirects: 0 });
  expect(worker.status()).toBe(200);
  expect(worker.headers()["content-type"]).toMatch(/javascript/);
  expect(worker.headers()["cache-control"]).toContain("no-store");

  // A share that arrives before the worker is running gets a kind note instead of an error page.
  const missed = await page.request.post("/share-target", { multipart: { file: "x" }, maxRedirects: 0 });
  expect(missed.status()).toBe(303);
  expect(missed.headers()["location"]).toBe("/share?error=missed");
});

test("the service worker keeps only readable shared files", async ({ page }) => {
  await page.goto("/login");
  // Its functions, loaded into a normal page so they can be called directly.
  await page.addScriptTag({ url: "/sw.js" });
  const result = await page.evaluate(async () => {
    const sw = window as unknown as {
      handleShare(request: Request): Promise<Response>;
      isShareTarget(request: Request): boolean;
    };
    const share = async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const response = await sw.handleShare(new Request("/share-target", { method: "POST", body: form }));
      return `${response.status} ${new URL(response.headers.get("Location")!).pathname}${new URL(response.headers.get("Location")!).search}`;
    };
    // No type, as some apps send it: the name decides. A Hindi name survives the trip.
    const pdf = await share(new File(["%PDF-1.4"], "रिपोर्ट.pdf"));
    const kept = await caches.match("/share-target/file", { cacheName: "rs-share-v1" });
    const text = await share(new File(["hello"], "notes.txt", { type: "text/plain" }));
    const big = await share(new File([new Uint8Array(20_000_001)], "scan.pdf", { type: "application/pdf" }));
    const stillKept = await caches.match("/share-target/file", { cacheName: "rs-share-v1" });
    return {
      pdf,
      text,
      big,
      keptType: kept?.headers.get("Content-Type"),
      keptName: decodeURIComponent(kept?.headers.get("X-File-Name") ?? ""),
      stillKept: decodeURIComponent(stillKept?.headers.get("X-File-Name") ?? ""),
      caught: [
        sw.isShareTarget(new Request("/share-target", { method: "POST" })),
        sw.isShareTarget(new Request("/share-target")),
        sw.isShareTarget(new Request("/api/reports", { method: "POST" })),
      ],
    };
  });
  expect(result).toEqual({
    pdf: "303 /share",
    text: "303 /share?error=unsupported",
    big: "303 /share?error=too-big",
    keptType: "application/pdf",
    keptName: "रिपोर्ट.pdf",
    stillKept: "रिपोर्ट.pdf",
    caught: [true, false, false],
  });
});

test("a report shared from WhatsApp waits through sign-in", async ({ page }) => {
  await page.goto("/login");
  await shareFile(page, "blood-test.pdf", "application/pdf", 2400);
  // Signed out: sign in first, and the file is still there afterwards.
  await expect(page).toHaveURL(/\/login\?next=%2Fshare$/);
  await page.getByRole("button", { name: "Open the demo account" }).click();
  await expect(page).toHaveURL(/\/share$/);
  await expect(page.getByRole("heading", { name: "Add a shared report" })).toBeVisible();
  const file = page.getByRole("region", { name: "Shared file" });
  await expect(file.getByText("blood-test.pdf")).toBeVisible();
  await expect(file.getByText("PDF · 2 KB")).toBeVisible();
  // This server has no AI key: the same note as the home page, and no upload button.
  await expect(page.getByText("Reading new reports is paused on this demo")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add to/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText("Nothing is waiting to be added")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Nothing is waiting to be added")).toBeVisible();
});

test("a shared report is added to the person picked", async ({ page }) => {
  // The test server has no AI key, so pretend reading is on to show the picker. The rest is real.
  await page.route("**/api/features", (route) => route.fulfill({ json: { reading: true } }));
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Asha Patil");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`);
  await page.getByLabel("Password").fill("a long test passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Whose reports?" })).toBeVisible();

  await shareFile(page, "thyroid.jpg", "image/jpeg", 1_500_000);
  await expect(page.getByRole("region", { name: "Shared file" }).getByText("Photo · 1.5 MB")).toBeVisible();
  const picker = page.getByRole("group", { name: "Whose report is this?" });
  await expect(picker.getByRole("radio", { name: /Asha Patil/ })).toBeChecked();
  await page.getByRole("button", { name: "Add to Asha Patil’s reports" }).click();
  // A new account agrees to the data notice first, then the file is sent; this server says the AI is off.
  const dialog = page.getByRole("dialog", { name: "Before your first upload" });
  await dialog.getByRole("button", { name: "I agree" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The AI is switched off" })).toBeVisible();
  // Not uploaded, so it is still waiting.
  await expect(page.getByText("thyroid.jpg")).toBeVisible();
});

/** Replaces the browser's speech with a recorder, offering voices for these languages only. */
async function stubSpeech(page: Page, languages: string[]) {
  await page.addInitScript((languages) => {
    const spoken: string[] = [];
    let cancels = 0;
    const voices = languages.map((lang) => ({ lang, name: `Test ${lang}`, voiceURI: `test-${lang}`, default: false }));
    class Utterance {
      voice = null;
      lang = "";
      rate = 1;
      onend = null;
      onerror = null;
      constructor(readonly text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        speak: (utterance: Utterance) => spoken.push(utterance.text),
        cancel: () => cancels++,
        addEventListener() {},
        removeEventListener() {},
      },
    });
    Object.assign(window, { speech: { spoken, cancels: () => cancels } });
  }, languages);
}

const speechLog = (page: Page) =>
  page.evaluate(() => {
    const { speech } = window as unknown as { speech: { spoken: string[]; cancels: () => number } };
    return { spoken: speech.spoken, cancels: speech.cancels() };
  });

test("an explanation can be read aloud when the device has a voice", async ({ page }) => {
  await stubSpeech(page, ["en-IN"]);
  await startDemo(page);
  await page.getByRole("link", { name: /Sample Pathology Lab, Pune.*12 Jan 2026/ }).click();
  const panel = page.getByRole("region", { name: "What does this mean?" });
  await panel.getByRole("button", { name: "Listen" }).click();
  await expect(panel.getByRole("button", { name: "Stop" })).toBeVisible();
  const { spoken } = await speechLog(page);
  expect(spoken).toContain("Questions to ask your doctor");
  expect(spoken.length).toBeGreaterThan(5);

  await panel.getByRole("button", { name: "Stop" }).click();
  await expect(panel.getByRole("button", { name: "Listen" })).toBeVisible();
  await panel.getByRole("button", { name: "Listen" }).click();
  const before = (await speechLog(page)).cancels;
  // No Hindi voice on this "device": switching stops the reading and hides the button.
  await panel.getByRole("tab").nth(1).click();
  await expect(panel.getByText(/सामान्य सीमा से बाहर/).first()).toBeVisible();
  await expect(panel.getByRole("button", { name: /Listen|Stop|सुनिए/ })).toHaveCount(0);
  expect((await speechLog(page)).cancels).toBeGreaterThan(before);
});

test("the Listen button is hidden without a voice for the language", async ({ page }) => {
  await stubSpeech(page, []);
  await startDemo(page);
  await page.getByRole("link", { name: /Sample Pathology Lab, Pune.*12 Jan 2026/ }).click();
  const panel = page.getByRole("region", { name: "What does this mean?" });
  await expect(panel.getByRole("heading", { name: "Questions to ask your doctor" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Listen" })).toHaveCount(0);
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
