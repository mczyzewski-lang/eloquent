/**
 * Składanie segmentów audio przez FFmpeg: ujednolicenie formatu (44.1 kHz mono),
 * pauzy między segmentami, normalizacja głośności (loudnorm EBU R128), eksport MP3.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { concatWavs, silenceWav, wavDurationMs } from "./wav";

let ffmpegAvailable: boolean | null = null;

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", () => resolve({ code: 127, stdout, stderr }));
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function hasFfmpeg(): Promise<boolean> {
  if (process.env.ELOFIK_DISABLE_FFMPEG === "1") return false;
  if (ffmpegAvailable === null) ffmpegAvailable = (await run(process.env.FFMPEG_PATH ?? "ffmpeg", ["-version"])).code === 0;
  return ffmpegAvailable;
}

export async function probeDurationMs(file: string): Promise<number> {
  const r = await run(process.env.FFPROBE_PATH ?? "ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  const sec = parseFloat(r.stdout.trim());
  return Number.isFinite(sec) ? Math.round(sec * 1000) : 0;
}

export interface AssemblyInput {
  audio: Buffer;
  ext: "mp3" | "wav";
  pauseAfterMs: number;
}

export interface AssemblyOutput {
  audio: Buffer;
  contentType: string;
  ext: "mp3" | "wav";
  durationMs: number;
  /** Czas trwania każdego segmentu (bez pauzy) — do osi czasu napisów */
  segmentDurationsMs: number[];
  /** O ile przesunięty jest początek pierwszego segmentu (dżingiel przed narracją) */
  leadMs: number;
}

export interface AssemblyMusic {
  jingle: Buffer;
  bed: Buffer;
  leadMs: number;
  tailMs: number;
}

export async function assembleSegments(parts: AssemblyInput[], music?: AssemblyMusic | null): Promise<AssemblyOutput> {
  if (!parts.length) throw new Error("Brak segmentów do złożenia");
  const allWav = parts.every((p) => p.ext === "wav");

  if (!(await hasFfmpeg())) {
    if (!allWav) throw new Error("FFmpeg jest wymagany do składania plików MP3");
    const chunks: Buffer[] = [];
    const durations: number[] = [];
    for (const p of parts) {
      chunks.push(p.audio);
      durations.push(wavDurationMs(p.audio));
      if (p.pauseAfterMs > 0) chunks.push(silenceWav(p.pauseAfterMs));
    }
    const audio = concatWavs(chunks);
    return { audio, contentType: "audio/wav", ext: "wav", durationMs: wavDurationMs(audio), segmentDurationsMs: durations, leadMs: 0 };
  }

  const dir = path.join(os.tmpdir(), `elofik-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    const files: string[] = [];
    const durations: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const f = path.join(dir, `s${i}.${parts[i].ext}`);
      await fs.writeFile(f, parts[i].audio);
      files.push(f);
      durations.push(parts[i].ext === "wav" ? wavDurationMs(parts[i].audio) : await probeDurationMs(f));
    }
    const filters = parts
      .map((p, i) => `[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,apad=pad_dur=${(p.pauseAfterMs / 1000).toFixed(3)}[a${i}]`)
      .join(";");
    const cat = `${parts.map((_, i) => `[a${i}]`).join("")}concat=n=${parts.length}:v=0:a=1[cat]`;
    const out = path.join(dir, "out.mp3");
    const inputs = files.flatMap((f) => ["-i", f]);
    let graph: string;
    if (music) {
      // dżingiel → narracja z cichym, zapętlonym podkładem → wybrzmienie i wyciszenie
      const jingle = path.join(dir, "jingle.wav");
      const bed = path.join(dir, "bed.wav");
      await fs.writeFile(jingle, music.jingle);
      await fs.writeFile(bed, music.bed);
      inputs.push("-i", jingle, "-stream_loop", "-1", "-i", bed);
      const n = parts.length;
      const voiceMs = durations.reduce((sum, d, i) => sum + d + parts[i].pauseAfterMs, 0);
      const total = (music.leadMs + voiceMs + music.tailMs) / 1000;
      graph = [
        filters,
        cat,
        // głos normalizujemy PRZED miksem — inaczej normalizacja podbijałaby podkład w pauzach
        `[cat]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100,adelay=${music.leadMs}:all=1,apad=pad_dur=${(music.tailMs / 1000).toFixed(3)}[voice]`,
        `[${n}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,volume=0.5[jin]`,
        `[${n + 1}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono,volume=0.14,afade=t=in:st=0.8:d=2.5[bed]`,
        `[voice][jin][bed]amix=inputs=3:duration=first:dropout_transition=0:normalize=0[mix]`,
        `[mix]afade=t=out:st=${Math.max(0, total - 2.6).toFixed(3)}:d=2.6,alimiter=limit=0.89[out]`,
      ].join(";");
    } else {
      graph = `${filters};${cat};[cat]loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
    }
    const args = ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ac", "1", "-ar", "44100", "-b:a", "128k", out];
    const r = await run(process.env.FFMPEG_PATH ?? "ffmpeg", args);
    if (r.code !== 0) throw new Error(`FFmpeg error: ${r.stderr.slice(0, 500)}`);
    const audio = await fs.readFile(out);
    return { audio, contentType: "audio/mpeg", ext: "mp3", durationMs: await probeDurationMs(out), segmentDurationsMs: durations, leadMs: music?.leadMs ?? 0 };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
