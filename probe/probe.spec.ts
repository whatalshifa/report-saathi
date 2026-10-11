import { test } from "@playwright/test";
import fs from "node:fs";
const SITE = "https://report-saathi-six.vercel.app";
test.setTimeout(600_000);
test("every section, one demo session", async ({ page }, info) => {
  const out: string[] = [];
  const bad: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") bad.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => bad.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  const shot = async (name: string) => page.screenshot({ path: `probe-out/${info.project.name}-${name}.png` });
  const visit = async (name: string) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2500);
    const text = (await page.locator("main").innerText().catch(() => "NO MAIN")).replace(/\s+/g, " ").slice(0, 220);
    out.push(`## ${name}\nURL ${page.url()}\nTEXT ${text}\nPROBLEMS ${bad.splice(0).join(" | ") || "none"}`);
    await shot(name);
  };
  // Signed out pages
  for (const path of ["/", "/dashboard", "/accuracy", "/privacy", "/login", "/signup", "/about", "/shared#token=nope"]) {
    await page.goto(SITE + path);
    await visit(`out${path.replace(/[^a-z]/g, "-")}`);
  }
  // Open the demo from the sample dashboard via the Doctor brief tab/link
  await page.goto(`${SITE}/dashboard`);
  await page.waitForTimeout(2000);
  await page.locator('a[href="/briefs"]').filter({ visible: true }).first().click();
  await page.waitForURL(/\/briefs/, { timeout: 120_000 }).catch(() => {});
  await visit("briefs");
  const links = async () => page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  // Inner pages discovered from the app
  for (const path of ["/dashboard", "/reports", "/family", "/account"]) {
    await page.goto(SITE + path);
    await visit(path.slice(1));
  }
  const found = new Set<string>();
  for (const path of ["/dashboard", "/reports", "/briefs", "/family"]) {
    await page.goto(SITE + path);
    await page.waitForTimeout(3000);
    for (const h of await links()) if (h && /^\/(reports|profiles|briefs)\/[^/]+/.test(h)) found.add(h.split("#")[0]);
  }
  out.push(`FOUND ${[...found].join(" ")}`);
  for (const h of [...found].slice(0, 20)) {
    await page.goto(SITE + h);
    await visit(h.replace(/[^a-z0-9]/gi, "-").slice(0, 60));
  }
  // Report tabs
  const report = [...found].find((h) => h.startsWith("/reports/"));
  if (report) for (const tab of ["results", "explain", "original"]) {
    await page.goto(`${SITE}${report.split("?")[0]}?tab=${tab}`);
    await visit(`report-tab-${tab}`);
  }
  fs.writeFileSync(`probe-out/${info.project.name}.md`, out.join("\n\n"));
});
