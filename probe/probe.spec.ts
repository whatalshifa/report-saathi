import { expect, test } from "@playwright/test";
const SITE = "https://report-saathi-six.vercel.app";
test.setTimeout(240_000);
for (const label of ["Reports", "Briefs", "Family", "Timeline"]) {
  test(`signed-out nav: ${label}`, async ({ page }, info) => {
    const log: string[] = [];
    page.on("console", (m) => log.push(`console ${m.type()}: ${m.text()}`));
    page.on("response", (r) => { if (r.url().includes("/api/")) log.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) log.push(`NAV ${f.url()}`); });
    await page.goto(`${SITE}/dashboard`);
    await page.waitForTimeout(3000);
    const nav = page.getByRole("navigation").getByRole("link", { name: new RegExp(label, "i") }).filter({ visible: true }).first();
    log.push(`link count ${await page.getByRole("link", { name: new RegExp(label, "i") }).count()}`);
    await nav.click();
    await page.waitForTimeout(90_000);
    log.push(`FINAL ${page.url()}`);
    log.push(`TEXT ${(await page.locator("main").innerText().catch(() => "no main")).slice(0, 600)}`);
    await page.screenshot({ path: `probe-out/${info.project.name}-${label}.png` });
    require("fs").writeFileSync(`probe-out/${info.project.name}-${label}.txt`, log.join("\n"));
  });
}
