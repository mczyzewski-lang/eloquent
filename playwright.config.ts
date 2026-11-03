import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "android-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    // iOS Safari: odkomentuj na maszynie z zainstalowanym WebKit (npx playwright install webkit)
    // { name: "ios-safari", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    env: { ELOFIK_DEMO_MODE: "1", ELOFIK_DATA_DIR: ".data-e2e" },
  },
});
