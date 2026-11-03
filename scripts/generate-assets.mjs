/**
 * Generuje ikony PWA, faviconę i obraz Open Graph z grafik marki (public/brand/*.png).
 *   npm run assets        (PW_CHROMIUM=/ścieżka/do/chrome — opcjonalnie)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dataUrl = (f) => `data:image/png;base64,${fs.readFileSync(path.join(root, "public/brand", f)).toString("base64")}`;
const head = dataUrl("elofik-head.png");
const logo = dataUrl("elofik-logo.png");

// ikona: głowa Elofika na kremowym tle (zaokrąglony kwadrat dla „any”, pełne tło dla maskable/apple)
const iconHtml = (size, rounded) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:transparent">
<div style="width:${size}px;height:${size}px;border-radius:${rounded ? size * 0.22 : 0}px;background:radial-gradient(circle at 50% 40%,#FFF4E2,#FDE6DA);display:flex;align-items:center;justify-content:center;overflow:hidden">
<img src="${head}" style="width:${size * 0.94}px;height:${size * 0.94}px;object-fit:contain;margin-top:${size * 0.04}px"></div></body></html>`;

const og = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:64px;padding:0 90px;box-sizing:border-box;
background:radial-gradient(900px 500px at 10% -10%,#fff4e2,transparent 60%),radial-gradient(700px 500px at 110% 10%,#fde6da,transparent 55%),#FFF9F0;font-family:system-ui,sans-serif}
h1{font-size:58px;line-height:1.1;color:#26344A;margin:0 0 20px}p{font-size:30px;color:#6B7486;margin:0}.b{color:#E9AC3C;font-weight:800;letter-spacing:.12em;font-size:22px;text-transform:uppercase;margin-bottom:18px}
img{height:520px;width:auto;flex:none}</style></head><body><img src="${logo}"><div><div class="b">elofik.com</div><h1>Codziennie jedno mądre słowo</h1><p>Personalizowane bajki audio dla dzieci 4–7 lat</p></div></body></html>`;

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
const shots = [
  [192, "icon-192.png", true],
  [512, "icon-512.png", true],
  [512, "icon-maskable-512.png", false],
  [180, "apple-touch-icon.png", false],
  [48, "favicon-48.png", true],
];
for (const [size, name, rounded] of shots) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(iconHtml(size, rounded));
  await page.screenshot({ path: path.join(root, "public/icons", name), omitBackground: true });
}
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og);
await page.screenshot({ path: path.join(root, "public/og.png") });
await browser.close();
console.log("✓ ikony, favicona i og.png wygenerowane z grafik marki");
