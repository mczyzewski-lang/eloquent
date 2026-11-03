/**
 * Generuje ikony PWA (PNG) i obraz Open Graph z wektorowych źródeł, używając Playwright/Chromium.
 *   npm run assets
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const icon = fs.readFileSync(path.join(root, "public/icons/icon.svg"), "utf8");

const og = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;
background:radial-gradient(900px 500px at 10% -10%,#fff4e2,transparent 60%),radial-gradient(700px 500px at 110% 10%,#fde6da,transparent 55%),#FFF9F0;font-family:system-ui,sans-serif}
h1{font-size:64px;line-height:1.08;color:#26344A;margin:0 0 20px}p{font-size:30px;color:#6B7486;margin:0}.b{color:#E9AC3C;font-weight:800;letter-spacing:.12em;font-size:22px;text-transform:uppercase;margin-bottom:18px}
.ic{width:340px;height:340px;flex:none}</style></head><body><div class="ic">${icon}</div><div><div class="b">elofik.com</div><h1>Elofik — codziennie jedno mądre słowo</h1><p>Personalizowane bajki audio dla dzieci 4–7 lat</p></div></body></html>`;

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
for (const size of [192, 512, 180]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${icon.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await page.screenshot({ path: path.join(root, "public/icons", name), omitBackground: false });
}
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og);
await page.screenshot({ path: path.join(root, "public/og.png") });
await browser.close();
console.log("✓ ikony i og.png wygenerowane");
