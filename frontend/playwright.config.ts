import { defineConfig, devices } from "@playwright/test";

// Browser tests: the real website talking to the real API, in demo mode (no AI key).
// `npx playwright test` starts both servers, or reuses ones already running locally.
const DB = process.env.E2E_DATABASE_URL ?? "sqlite:///./e2e.db";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "alembic upgrade head && uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        RS_DATABASE_URL: DB,
        RS_UPLOAD_DIR: "./e2e-uploads",
        ANTHROPIC_API_KEY: "",
        // Every test starts its own demo from the same address.
        RS_DEMO_PER_IP_PER_HOUR: "1000",
        RS_AUTH_PER_IP_PER_10MIN: "1000",
      },
    },
    {
      command: "npm run start -- -p 3000",
      url: "http://localhost:3000/login",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
