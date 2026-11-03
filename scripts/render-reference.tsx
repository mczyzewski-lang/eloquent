/**
 * Arkusz referencyjny Elofika (character reference sheet) dla OpenAI Images.
 * Renderuje maskotkę z kodu (src/components/elofik/Elofik.tsx) w kilku pozach
 * do public/brand/elofik-reference.png — ten obraz jest dołączany do każdego
 * generowania okładki, aby postać była zawsze taka sama.
 *
 *   npx tsx scripts/render-reference.tsx      (PW_CHROMIUM=/ścieżka/do/chrome — opcjonalnie)
 */
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { Elofik, type ElofikMood } from "../src/components/elofik/Elofik";

const root = path.resolve(__dirname, "..");
// tylko reguły maskotki (pozy uszu, głowy, dłoni) — bez Tailwinda
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8").split("/* Uszy Elofika")[1]?.replace(/^[^\n]*\n/, "") ?? "";
const poses: [ElofikMood, string][] = [
  ["idle", "front view, neutral"],
  ["waving", "waving hello with his hand"],
  ["happy", "joyful"],
  ["listening", "listening, head tilted"],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{animation:none!important}
body{margin:0;width:1536px;height:1024px;background:#FFFFFF;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center}
.row{display:flex;gap:40px;align-items:flex-end}
.pose{width:330px;text-align:center;color:#26344A;font-size:20px}
h1{font-size:30px;color:#26344A;margin:0 0 24px}
</style><style>${css}</style></head><body>
<h1>ELOFIK — character reference sheet (storytelling elf)</h1>
<div class="row">${poses
  .map(([mood, label]) => `<div class="pose">${renderToStaticMarkup(<Elofik mood={mood} />)}<p>${label}</p></div>`)
  .join("")}</div>
</body></html>`;

async function main() {
  const out = path.join(root, "public/brand");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "elofik-reference.html"), html);
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(out, "elofik-reference.png") });
  await browser.close();
  fs.rmSync(path.join(out, "elofik-reference.html"));
  console.log("✓ public/brand/elofik-reference.png");
}

void main();
