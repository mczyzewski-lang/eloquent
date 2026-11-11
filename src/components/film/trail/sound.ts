/**
 * Ścieżka dźwiękowa generowana w przeglądarce (Web Audio) — bez żadnych plików:
 * ciepłe tło akordów, pentatoniczna „kalimba” i efekty zsynchronizowane z filmem
 * (dzwoneczki śladów, bulgot strumyka, akord odkrycia, zbieranie słowa).
 * Zdarzenia są funkcją czasu filmu, więc muzyka trafia w obraz także po przewinięciu.
 */
import { FOOTPRINTS, rng } from "./timeline";

type Ev = { t: number; kind: "pluck" | "pad" | "twinkle" | "blub" | "chime" | "pop"; f: number; dur?: number; gain?: number };

const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const CHORDS = [
  [130.81, 196.0, 329.63],
  [110.0, 164.81, 261.63],
  [87.31, 130.81, 220.0],
  [98.0, 146.83, 246.94],
];
const STEP = 0.375;

/** Zdarzenia dźwiękowe z przedziału czasu filmu [a, b). */
function events(a: number, b: number): Ev[] {
  const out: Ev[] = [];
  // tło akordów co 3 s
  for (let i = Math.floor(a / 3); i * 3 < b; i++) {
    const t = i * 3;
    if (t < a || t > 80) continue;
    const night = t > 61;
    for (const f of CHORDS[i % CHORDS.length]) out.push({ t, kind: "pad", f: night ? f * 0.75 : f, dur: 3.4, gain: night ? 0.035 : 0.028 });
  }
  // „kalimba”: deterministyczna melodia, gęstsza w marszu, rzadsza nocą
  for (let i = Math.max(4, Math.floor(a / STEP)); i * STEP < b; i++) {
    const t = i * STEP;
    if (t < a || t < 1.5 || t > 79) continue;
    const r = rng(i * 7919 + 13);
    const night = t > 62;
    const quiet = (t > 44 && t < 50) || night;
    if (r() > (quiet ? 0.34 : 0.62)) continue;
    const idx = Math.floor(r() * (night ? 5 : 7)) + (night ? 4 : i % 8 < 4 ? 0 : 2);
    out.push({ t, kind: "pluck", f: PENTA[Math.min(PENTA.length - 1, idx)], gain: quiet ? 0.07 : 0.1 });
  }
  const once = (t: number, e: Omit<Ev, "t">) => {
    if (t >= a && t < b) out.push({ t, ...e });
  };
  // tytuł
  [0.5, 0.75, 1.0, 1.4].forEach((t, i) => once(t, { kind: "chime", f: [523.25, 659.25, 783.99, 1046.5][i], gain: 0.09 }));
  // ślady
  FOOTPRINTS.filter((f) => f.at > 0).forEach((f, i) => once(f.at, { kind: "twinkle", f: 1568 + (i % 5) * 220, gain: 0.06 }));
  // strumyk
  [34.1, 34.7, 35.2, 35.9, 36.4].forEach((t, i) => once(t, { kind: "blub", f: 300 + (i % 3) * 60, gain: 0.12 }));
  // wiewiórka
  once(39.6, { kind: "pop", f: 700, gain: 0.1 });
  // odkrycie jeżyka
  [50.4, 50.55, 50.7, 50.9, 51.2].forEach((t, i) => once(t, { kind: "chime", f: [392, 523.25, 659.25, 783.99, 1046.5][i], gain: 0.1 }));
  // świetliki zapalają się
  for (let i = 0; i < 14; i++) once(63 + i * 0.45, { kind: "twinkle", f: 1318 + ((i * 5) % 7) * 180, gain: 0.035 });
  // litery słowa i schowanie do torby
  for (let i = 0; i < 12; i++) once(71.6 + i * 0.26, { kind: "pluck", f: PENTA[i % PENTA.length] * 2, gain: 0.07 });
  for (let i = 0; i < 8; i++) once(77 + i * 0.12, { kind: "twinkle", f: 880 + i * 160, gain: 0.05 });
  [78.4, 78.6, 78.8, 79.2].forEach((t, i) => once(t, { kind: "chime", f: [523.25, 659.25, 783.99, 1046.5][i], gain: 0.11 }));
  return out;
}

export class FilmSound {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private scheduledTo = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** czas filmu odpowiadający chwili ac.currentTime === base */
  private offset = 0;

  private ensure() {
    if (this.ac) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ac = new Ctor();
    this.master = this.ac.createGain();
    this.master.gain.value = 0.9;
    const lp = this.ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    this.master.connect(lp).connect(this.ac.destination);
  }

  /** Start od czasu filmu `t` (wywoływać w geście użytkownika). */
  start(t: number) {
    this.ensure();
    const ac = this.ac!;
    void ac.resume();
    this.master!.gain.cancelScheduledValues(ac.currentTime);
    this.master!.gain.setTargetAtTime(0.9, ac.currentTime, 0.05);
    this.offset = t - ac.currentTime;
    this.scheduledTo = t;
    this.tick();
    this.timer ??= setInterval(() => this.tick(), 90);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ac && this.master) this.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.04);
  }

  dispose() {
    this.stop();
    void this.ac?.close();
    this.ac = null;
  }

  private tick() {
    const ac = this.ac;
    if (!ac) return;
    const now = ac.currentTime + this.offset;
    const until = now + 0.3;
    if (until <= this.scheduledTo) return;
    for (const e of events(Math.max(this.scheduledTo, now - 0.02), until)) this.play(e, Math.max(ac.currentTime, e.t - this.offset));
    this.scheduledTo = until;
  }

  private play(e: Ev, at: number) {
    const ac = this.ac!;
    const g = ac.createGain();
    g.connect(this.master!);
    const o = ac.createOscillator();
    const peak = e.gain ?? 0.08;
    const env = (attack: number, decay: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
      o.start(at);
      o.stop(at + attack + decay + 0.05);
    };
    switch (e.kind) {
      case "pad": {
        o.type = "triangle";
        o.frequency.value = e.f;
        const o2 = ac.createOscillator();
        o2.type = "sine";
        o2.frequency.value = e.f * 1.003;
        o2.connect(g);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(peak, at + 1.1);
        g.gain.linearRampToValueAtTime(0.0001, at + (e.dur ?? 3));
        o.start(at); o2.start(at);
        o.stop(at + (e.dur ?? 3) + 0.1); o2.stop(at + (e.dur ?? 3) + 0.1);
        break;
      }
      case "pluck": {
        o.type = "sine";
        o.frequency.value = e.f;
        // lekko „drewniany” atak kalimby: krótki drugi ton oktawę wyżej
        const o2 = ac.createOscillator();
        const g2 = ac.createGain();
        o2.type = "triangle";
        o2.frequency.value = e.f * 2;
        g2.gain.setValueAtTime(peak * 0.35, at);
        g2.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
        o2.connect(g2).connect(this.master!);
        o2.start(at); o2.stop(at + 0.15);
        env(0.006, 0.9);
        break;
      }
      case "twinkle":
        o.type = "sine";
        o.frequency.setValueAtTime(e.f, at);
        o.frequency.exponentialRampToValueAtTime(e.f * 1.5, at + 0.12);
        env(0.004, 0.35);
        break;
      case "chime":
        o.type = "triangle";
        o.frequency.value = e.f;
        env(0.01, 1.6);
        break;
      case "blub":
        o.type = "sine";
        o.frequency.setValueAtTime(e.f, at);
        o.frequency.exponentialRampToValueAtTime(e.f * 2.2, at + 0.09);
        env(0.01, 0.14);
        break;
      case "pop":
        o.type = "square";
        o.frequency.setValueAtTime(e.f, at);
        o.frequency.exponentialRampToValueAtTime(e.f * 0.5, at + 0.08);
        env(0.003, 0.1);
        break;
    }
    o.connect(g);
  }
}
