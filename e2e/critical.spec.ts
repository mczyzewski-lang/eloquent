import { expect, test, type Page } from "@playwright/test";

/**
 * Kluczowe ścieżki (tryb demo: mock TTS/STT, symulacja Stripe).
 * Uruchomienie: npm run build && npm run test:e2e
 */

async function demoLogin(page: Page, kind: "family" | "fresh" | "admin" = "family") {
  if (kind === "admin") {
    await page.goto("/logowanie/admin");
    await page.fill("#admin-email", "admin@elofik.com");
    await page.fill("#admin-password", "e2e-Admin-Haslo-2026");
    await page.getByTestId("admin-login").click();
    await page.waitForURL((u) => u.pathname === "/admin");
    return "/admin";
  }
  await page.goto("/demo");
  const res = await page.request.post("/api/demo/seed", { data: { kind }, headers: { origin: new URL(page.url()).origin } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).redirect as string;
}

test("1. landing: imię → próbka z imieniem dziecka", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("jedno nowe, mądre słowo");
  await page.fill("#child-name", "Leon");
  await expect(page.getByTestId("sample-cta")).toHaveText(/Posłuchaj bajki dla Leona/);
  await page.getByTestId("sample-cta").click();
  await expect(page.getByText("Hej, Leonku! Tu Elofik!")).toBeVisible({ timeout: 20_000 });
});

test("landing: nietypowe imię bez wymuszonej odmiany", async ({ page }) => {
  await page.goto("/");
  await page.fill("#child-name", "Xawier");
  await expect(page.getByTestId("sample-cta")).toHaveText(/w której gra Xawier/);
});

test("onboarding → konto (demo) → Dzień 1", async ({ page }) => {
  await page.goto("/onboarding?imie=Zosia");
  await page.getByRole("button", { name: /Dalej/ }).click();
  // pole na imię rozwija się w miejscu kliknięcia — strona nie przeskakuje
  const grandma = page.getByRole("button", { name: "Babcia", exact: true });
  await grandma.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await grandma.click();
  await expect(page.getByLabel("Imię: Babcia")).toBeFocused();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(40);
  await page.getByLabel("Imię: Babcia").fill("Halina");
  await page.getByRole("button", { name: "Dziadek", exact: true }).click();
  await page.getByLabel("Imię: Dziadek").fill("Jan");
  await page.getByRole("button", { name: /Dalej/ }).click();
  await page.getByRole("button", { name: /Kosmos/ }).click();
  await page.getByRole("button", { name: /Dalej/ }).click();
  await expect(page.getByRole("heading", { name: "Świat Elofika dla Zosi jest gotowy!" })).toBeVisible();
  await expect(page.getByText(/babcia Halina/)).toBeVisible();
  await page.getByRole("button", { name: /Rozpocznij przygodę/ }).click();
  // konto rodzica: numer telefonu + kod SMS (bez bramki SMS — kod testowy na ekranie)
  await page.fill("#phone", `6${String(Date.now()).slice(-8)}`);
  await page.getByRole("checkbox").check();
  await page.getByTestId("auth-submit").click();
  const code = (await page.getByTestId("test-code").locator("strong").textContent())!.trim();
  await page.fill("#otp", code);
  await page.getByTestId("otp-submit").click();
  await page.waitForURL("**/app?witaj=1");
  await expect(page.getByRole("heading", { name: /Zosiu! Elofik czeka/ })).toBeVisible();
  await expect(page.getByTestId("today-card")).toContainText("Dzień 1");
});

test("5. rytuał: „Hej Elofik” → powitanie → bajka; mikrofon zamknięty", async ({ page }) => {
  await demoLogin(page, "family");
  await page.goto("/app/bajka/dzien-01-tajemniczy-slad");
  await page.getByTestId("mic-button").click();
  await page.getByTestId("simulate-ok").click();
  await expect(page.getByText(/Heeej, Leonku!/)).toBeVisible();
  await expect(page.getByTestId("play-toggle")).toBeVisible({ timeout: 30_000 });
});

test("9. brak mikrofonu nie blokuje bajki — po 2 próbach fallback dotykiem", async ({ page }) => {
  await demoLogin(page, "fresh");
  await page.goto("/app/bajka/dzien-01-tajemniczy-slad");
  for (let i = 0; i < 2; i++) {
    await page.getByTestId("mic-button").click();
    await page.getByRole("button", { name: "Hałas w tle" }).click();
    await expect(page.getByText(/Spróbuj jeszcze raz: Hej Elofik!/)).toBeVisible();
  }
  await expect(page.getByText("Nie działa mikrofon? Rozpocznij bajkę dotykiem")).toBeVisible();
  await page.getByTestId("touch-start").click();
  await expect(page.getByTestId("play-toggle")).toBeVisible({ timeout: 30_000 });
});

test("11. zablokowany dzień nie jest dostępny (backend)", async ({ page }) => {
  await demoLogin(page, "fresh");
  const res = await page.request.get("/api/stories/dzien-02-most-z-kamykow/audio");
  expect(res.status()).toBe(403);
  await page.goto("/app/bajka/dzien-02-most-z-kamykow");
  await expect(page).toHaveURL(/zablokowana=1/);
});

test("19. bez sesji brak dostępu do audio i danych", async ({ request }) => {
  expect((await request.get("/api/stories/dzien-01-tajemniczy-slad/audio")).status()).toBe(401);
  expect((await request.get("/api/account/export")).status()).toBe(401);
  expect((await request.get("/api/media?t=tts/aa/x.mp3|9999999999.fake")).status()).toBe(403);
});

test("13. babcia tworzy bezpłatną bajkę i dostaje bezpieczny link", async ({ page }) => {
  await page.goto("/dla-dziadkow");
  await page.fill("#g-child", "Leon");
  await page.fill("#g-giver", "Basia");
  await page.getByTestId("gift-generate").click();
  await page.waitForURL(/\/prezent\/[A-Za-z0-9_-]{32,}\?nowa=1/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Twoja bajka dla Leona jest gotowa!" })).toBeVisible();
  await expect(page.getByText("W tej przygodzie występuje również babcia Basia.")).toBeVisible();
});

test("14–16. zakup prezentu → aktywacja raz, bez odnowienia", async ({ page, browser }) => {
  await page.goto("/dla-dziadkow/kup");
  await page.fill("#p-child", "Leon");
  await page.fill("#p-giver", "Basia");
  await page.fill("#p-buyer", "babcia@example.com");
  await page.getByTestId("gift-buy").click();
  await page.getByTestId("simulate-pay").click();
  await page.waitForURL(/prezent-kupiony/);
  const link = (await page.locator(".card-soft.break-all").textContent())!.trim();
  const path = new URL(link).pathname;

  const parent = await browser.newPage();
  await parent.goto(path);
  await expect(parent.getByRole("heading", { name: /Babcia Basia podarowała prezent dla Leona/ })).toBeVisible();
  await parent.getByTestId("auth-switch").click();
  await parent.fill("#email", `rodzic.${Date.now()}@example.com`);
  await parent.getByRole("checkbox").check();
  await parent.getByTestId("email-submit").click();
  await parent.waitForURL("**/app?witaj=1");
  await parent.goto("/konto");
  await expect(parent.getByText("Prezent nie odnawia się automatycznie.", { exact: false })).toBeVisible();

  await parent.goto(path);
  await expect(parent.getByText("Ten prezent został już aktywowany.", { exact: false })).toBeVisible();
});

test("admin: CMS i koszty widoczne dla admina", async ({ page }) => {
  await demoLogin(page, "admin");
  await page.goto("/admin/koszty");
  await expect(page.getByText("ElevenLabs Scribe Realtime")).toBeVisible();
  await expect(page.getByText("OpenAI ilustracje")).toBeVisible();
  await page.goto("/admin/bajki");
  await expect(page.getByText("Elofik i tajemniczy ślad")).toBeVisible();
});

test("admin: ustawienia kluczy API — walidacja i zapis bez ujawniania sekretu", async ({ page }) => {
  await demoLogin(page, "admin");
  await page.goto("/admin");
  await expect(page.getByTestId("api-keys-prompt")).toBeVisible();
  await page.getByRole("link", { name: "Uzupełnij klucze API" }).click();
  await page.fill("#openai_api_key", "zly-klucz");
  await page.getByRole("button", { name: /Zapisz ustawienia/ }).click();
  await expect(page.getByText("Klucz OpenAI zaczyna się od „sk-”.")).toBeVisible();
  await page.fill("#openai_api_key", "sk-test0123456789abcdefghijklmnop");
  await page.getByRole("button", { name: /Zapisz ustawienia/ }).click();
  await expect(page.getByText("sk-…mnop")).toBeVisible();
  const api = await page.request.get("/api/admin/settings");
  expect(await api.text()).not.toContain("sk-test0123456789abcdefghijklmnop");
});

test("admin: zabezpieczenia logowania", async ({ page, request }) => {
  await page.goto("/logowanie/admin");
  await page.fill("#admin-email", "admin@elofik.com");
  await page.fill("#admin-password", "zle-haslo");
  await page.getByTestId("admin-login").click();
  await expect(page.getByText("Nieprawidłowy e-mail lub hasło.")).toBeVisible();
  // po skonfigurowaniu hasła wejście demo „jako admin” jest wyłączone
  const origin = { origin: new URL(page.url()).origin };
  expect((await request.post("/api/demo/seed", { data: { kind: "admin" }, headers: origin })).status()).toBe(403);
  // logowanie demo e-mailem administratora nie daje dostępu
  expect((await request.post("/api/auth/demo", { data: { email: "admin@elofik.com" }, headers: origin })).status()).toBe(403);
  // niezalogowany → strona logowania admina
  await page.goto("/admin");
  await expect(page).toHaveURL(/logowanie\/admin/);
});
