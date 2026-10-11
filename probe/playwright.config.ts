import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir: ".", workers: 4, reporter: "list",
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "phone", use: { ...devices["Pixel 7"] } }] });
