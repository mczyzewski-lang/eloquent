import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // w środowiskach z preinstalowanym Chromium: PW_CHROMIUM=/ścieżka/do/chrome
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: "android-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    // iOS Safari: odkomentuj na maszynie z zainstalowanym WebKit (npx playwright install webkit)
    // { name: "ios-safari", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    env: { ELOFIK_DEMO_MODE: "1", ELOFIK_DATA_DIR: ".data-e2e", SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123" },
  },
});
