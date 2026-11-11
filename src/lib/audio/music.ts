/**
 * Muzyka do bajek generowana kodem (bez plików i licencji): dżingiel Elofika na początek
 * i cichy, zapętlony podkład pod narracją. Synteza addytywna do PCM → WAV; miks robi FFmpeg.
 * Zmiana brzmienia = nowa MUSIC_VERSION (nowe klucze złożonych nagrań).
 */
import { encodeWav } from "./wav";

export const MUSIC_VERSION = "MUSIC_V1";
const SR = 44100;

/** Długość dżingla przed pierwszym słowem (ms). */
export const JINGLE_LEAD_MS = 2500;
/** Wybrzmienie podkładu po ostatnim słowie (ms). */
export const MUSIC_TAIL_MS = 3200;

/** Dźwięk „kalimby”: szybki atak, miękkie wybrzmienie, lekka oktawa na początku. */
function pluck(out: Float32Array, at: number, freq: number, gain: number, decay = 1.1, wrap = false) {
  const n = Math.floor(decay * 1.6 * SR);
  const start = Math.floor(at * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / (decay * 0.32));
    const v = (Math.sin(2 * Math.PI * freq * t) + 0.32 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t / 0.08) + 0.1 * Math.sin(2 * Math.PI * freq * 3 * t) * Math.exp(-t / 0.05)) * env * gain;
    let idx = start + i;
    if (idx >= out.length) {
      if (!wrap) break;
      idx %= out.length;
    }
    out[idx] += v;
  }
}

/** Miękki akord tła z powolnym wejściem i wyjściem. */
function pad(out: Float32Array, at: number, dur: number, freqs: number[], gain: number, wrap = false) {
  const n = Math.floor(dur * SR);
  const start = Math.floor(at * SR);
  const edge = Math.min(1.6, dur / 3);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / edge) * Math.min(1, (dur - t) / edge);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t + 1) + 0.18 * Math.sin(2 * Math.PI * f * 2 * t);
    let idx = start + i;
    if (idx >= out.length) {
      if (!wrap) break;
      idx %= out.length;
    }
    out[idx] += (v / freqs.length) * env * env * gain;
  }
}

function finish(buf: Float32Array, peak: number): Buffer {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  const k = max > 0 ? peak / max : 1;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return encodeWav(buf, SR);
}

let cache: { jingle: Buffer; bed: Buffer } | null = null;

/** Dżingiel (motyw Elofika) i 24-sekundowa pętla podkładu. Liczone raz na proces. */
export function storyMusic(): { jingle: Buffer; bed: Buffer } {
  if (cache) return cache;
  // dżingiel: ten sam motyw, który gra aplikacja po „Hej Elofik!”
  const j = new Float32Array(Math.floor(3.6 * SR));
  pad(j, 0, 3.4, [261.63, 329.63, 392.0], 0.16);
  [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99].forEach((f, i) => pluck(j, 0.12 + i * 0.17, f, 0.5, 1.2));
  pluck(j, 1.35, 1046.5, 0.32, 1.6);
  pluck(j, 1.52, 1318.5, 0.22, 1.8);

  // podkład: C – a – F – G, po 6 s; rzadkie nuty pentatoniki; pętla bez szwu (ogony zawijają się na początek)
  const LOOP = 24;
  const b = new Float32Array(LOOP * SR);
  const chords = [
    [130.81, 196.0, 329.63],
    [110.0, 164.81, 261.63],
    [87.31, 130.81, 220.0],
    [98.0, 146.83, 246.94],
  ];
  chords.forEach((c, i) => pad(b, i * 6 - 0.8 + (i === 0 ? LOOP : 0), 7.6, c, 0.5, true));
  const penta = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
  let s = 4242;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 26; i++) {
    const at = i * (LOOP / 26) + rnd() * 0.3;
    if (rnd() < 0.42) continue;
    pluck(b, at, penta[Math.floor(rnd() * penta.length)], 0.1 + rnd() * 0.08, 1.4, true);
  }
  cache = { jingle: finish(j, 0.8), bed: finish(b, 0.6) };
  return cache;
}

/** Czy do bajek dokładamy muzykę (domyślnie tak; STORY_MUSIC=0 wyłącza). */
export function storyMusicEnabled(): boolean {
  return process.env.STORY_MUSIC !== "0";
}
