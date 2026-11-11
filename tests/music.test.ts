import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assembleSegments, hasFfmpeg } from "@/lib/audio/ffmpeg";
import { JINGLE_LEAD_MS, MUSIC_TAIL_MS, storyMusic } from "@/lib/audio/music";
import { wavDurationMs } from "@/lib/audio/wav";

/** Średnia głośność (dB) fragmentu pliku — pomiar FFmpeg. */
function meanDb(file: string, from: number, dur: number): number {
  let out = "";
  try {
    execFileSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(dur), "-i", file, "-af", "volumedetect", "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = String((e as { stderr?: Buffer }).stderr ?? "");
  }
  if (!out) out = execFileSync("sh", ["-c", `ffmpeg -hide_banner -ss ${from} -t ${dur} -i "${file}" -af volumedetect -f null - 2>&1`]).toString();
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(out)?.[1] ?? NaN);
}

describe("Muzyka w bajkach", () => {
  it("dżingiel i pętla podkładu powstają z kodu", () => {
    const m = storyMusic();
    expect(wavDurationMs(m.jingle)).toBeGreaterThan(3000);
    expect(wavDurationMs(m.bed)).toBe(24_000);
    expect(storyMusic()).toBe(m); // liczone raz
  });

  it("miks: dżingiel przed narracją, cichy podkład pod głosem, wybrzmienie na końcu", async () => {
    const prev = process.env.ELOFIK_DISABLE_FFMPEG;
    process.env.ELOFIK_DISABLE_FFMPEG = "0"; // testy domyślnie działają bez FFmpeg — tu sprawdzamy prawdziwy miks
    try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { process.env.ELOFIK_DISABLE_FFMPEG = prev; return; }
    expect(await hasFfmpeg()).toBe(true);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elofik-music-"));
    // „mowa” zastępcza: 2 segmenty MP3 po 4 s
    const seg = path.join(dir, "seg.mp3");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=220:duration=4", "-af", "volume=0.5", seg]);
    const audio = fs.readFileSync(seg);
    const parts = [{ audio, ext: "mp3" as const, pauseAfterMs: 2000 }, { audio, ext: "mp3" as const, pauseAfterMs: 0 }];
    const plain = await assembleSegments(parts);
    const mixed = await assembleSegments(parts, { ...storyMusic(), leadMs: JINGLE_LEAD_MS, tailMs: MUSIC_TAIL_MS });
    expect(plain.leadMs).toBe(0);
    expect(mixed.leadMs).toBe(JINGLE_LEAD_MS);
    expect(Math.abs(mixed.durationMs - (plain.durationMs + JINGLE_LEAD_MS + MUSIC_TAIL_MS))).toBeLessThan(400);
    const file = path.join(dir, "mixed.mp3");
    fs.writeFileSync(file, mixed.audio);
    const jingle = meanDb(file, 0.2, 1.8); // przed narracją gra dżingiel
    const voice = meanDb(file, JINGLE_LEAD_MS / 1000 + 0.5, 3); // narracja
    const pause = meanDb(file, JINGLE_LEAD_MS / 1000 + 4.4, 1.2); // pauza między segmentami — sam podkład
    expect(jingle).toBeGreaterThan(-40);
    expect(pause).toBeGreaterThan(-60); // podkład słychać…
    expect(voice - pause).toBeGreaterThan(8); // …ale jest wyraźnie cichszy od głosu
    console.log(`głośność [dB] dżingiel=${jingle} głos=${voice} podkład=${pause}`);
    fs.rmSync(dir, { recursive: true, force: true });
    process.env.ELOFIK_DISABLE_FFMPEG = prev;
  }, 60_000);
});
