import { defineConfig, devices } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";

// testowe hasło admina (tylko e2e) → skrót w formacie ADMIN_PASSWORD_HASH
const E2E_ADMIN_PASSWORD = "e2e-Admin-Haslo-2026";
const salt = randomBytes(16);
const E2E_ADMIN_HASH = `scrypt$16384$8$1$${salt.toString("base64url")}$${scryptSync(E2E_ADMIN_PASSWORD, salt, 32, { N: 16384, r: 8, p: 1 }).toString("base64url")}`;

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
    // świeże dane przy każdym starcie (limity i sesje nie przechodzą między przebiegami)
    command: `node -e "require('fs').rmSync('.data-e2e',{recursive:true,force:true})" && npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { APP_ENV: "test", ELOFIK_DEMO_MODE: "1", ADMIN_EMAILS: "admin@elofik.com", ADMIN_PASSWORD_HASH: E2E_ADMIN_HASH, ELOFIK_DATA_DIR: ".data-e2e", SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123" },
  },
});
