import { defineConfig, devices } from "@playwright/test";

// Browser tests: the real website talking to the real API, in demo mode (no AI key).
// `npx playwright test` starts both servers, or reuses ones already running locally.
const DB = process.env.E2E_DATABASE_URL ?? "sqlite:///./e2e.db";
// Other ports, for running beside another copy of the app. The site must be built with
// API_URL=http://localhost:<E2E_API_PORT> to match.
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3000";
const API_PORT = process.env.E2E_API_PORT ?? "8000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `alembic upgrade head && uvicorn app.main:app --port ${API_PORT}`,
      cwd: "../backend",
      url: `http://localhost:${API_PORT}/api/health`,
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
      command: `npm run start -- -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/login`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
