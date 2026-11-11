/**
 * Renderuje reklamę (src/components/video/AdFilm.tsx) do plików MP4 dla Meta:
 *   public/video/elofik-reklama-9x16.mp4 (Reels/Stories) i elofik-reklama-4x5.mp4 (feed).
 * Klatki: Playwright (deterministyczna animacja — funkcja czasu), muzyka: synteza z kodu, montaż: FFmpeg.
 *
 *   npx next start -p 3310 &          # albo działający serwer
 *   AD_URL=http://localhost:3310 npx tsx scripts/render-ad.ts
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finish, pad, pluck, SR } from "../src/lib/audio/music";

const BASE = process.env.AD_URL ?? "http://localhost:3310";
const FPS = 30;
const DURATION = 25;
const FORMATS: Record<string, number> = { "9x16": 1920, "4x5": 1350 };
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/video");

/** Ścieżka dźwiękowa reklamy: ciepłe akordy, motyw Elofika na początku i przy logo, akcenty na wejścia scen. */
function soundtrack(): Buffer {
  const b = new Float32Array(Math.floor((DURATION + 0.5) * SR));
  const chords = [[130.81, 196.0, 329.63], [110.0, 164.81, 261.63], [87.31, 130.81, 220.0], [98.0, 146.83, 246.94], [130.81, 196.0, 329.63]];
  chords.forEach((c, i) => pad(b, i * 5 - 0.4, 6.2, c, 0.42));
  const motif = [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99];
  motif.forEach((f, i) => pluck(b, 0.15 + i * 0.16, f, 0.5, 1.2));
  // spokojna melodia pentatoniki co pół sekundy
  const penta = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
  let s = 77;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let t = 1.6; t < 20.8; t += 0.5) if (rnd() > 0.35) pluck(b, t, penta[Math.floor(rnd() * penta.length)], 0.16 + rnd() * 0.1, 1.2);
  // akcenty: dymek z imieniem, naklejki, dymki rodziny, pytanie dziecka
  [[0.2, 1046.5], [9.3, 659.25], [9.85, 783.99], [10.4, 1046.5], [14.1, 587.33], [14.8, 659.25], [15.5, 783.99], [18.1, 880.0], [19.4, 1046.5]].forEach(([t, f]) => pluck(b, t, f, 0.34, 1.5));
  // finał przy logo
  motif.forEach((f, i) => pluck(b, 21.2 + i * 0.15, f, 0.55, 1.6));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => pluck(b, 22.6, f, 0.3, 2.4));
  // wyciszenie na końcu
  const fade = Math.floor(1.2 * SR);
  const end = Math.floor(DURATION * SR);
  for (let i = 0; i < b.length; i++) b[i] *= i > end ? 0 : i > end - fade ? (end - i) / fade : 1;
  return finish(b, 0.7);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "elofik-ad-"));
  const wav = path.join(tmp, "music.wav");
  fs.writeFileSync(wav, soundtrack());
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  for (const [format, height] of Object.entries(FORMATS)) {
    const page = await browser.newPage({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/video/render?format=${format}`);
    await page.waitForFunction(() => typeof window.__adSeek === "function");
    await page.evaluate(() => document.fonts.ready);
    // wstępne wczytanie wszystkich grafik (każda scena raz)
    for (let t = 0; t < DURATION; t += 1) await page.evaluate((v) => window.__adSeek!(v), t);
    await page.waitForLoadState("networkidle");
    const frames = path.join(tmp, format);
    fs.mkdirSync(frames);
    const total = DURATION * FPS;
    for (let i = 0; i < total; i++) {
      await page.evaluate((v) => window.__adSeek!(v), i / FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 95, clip: { x: 0, y: 0, width: 1080, height } });
      if (i % 150 === 0) console.log(format, `${i}/${total}`);
    }
    await page.close();
    const out = path.join(outDir, `elofik-reklama-${format}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"), "-i", wav,
      "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-t", String(DURATION), "-movflags", "+faststart", out]);
    // miniatura (klatka z hakiem)
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "2.4", "-i", out, "-frames:v", "1", "-q:v", "3", path.join(outDir, `elofik-reklama-${format}.jpg`)]);
    console.log("✓", out, `${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
