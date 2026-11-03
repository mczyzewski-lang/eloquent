"use client";
/**
 * Tryb demo bez klucza ElevenLabs: tekst czyta syntezator przeglądarki (Web Speech API).
 * W produkcji zawsze odtwarzamy nagrania głosu Elofika z ElevenLabs.
 */
export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith(lang)) ?? null;
}

export function speakSequence(texts: string[], opts: { lang?: string; rate?: number; onSegment?: (i: number) => void; onEnd?: () => void } = {}) {
  if (!canSpeak()) {
    opts.onEnd?.();
    return () => undefined;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let cancelled = false;
  const lang = opts.lang ?? "pl";
  texts.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang === "pl" ? "pl-PL" : lang;
    u.rate = opts.rate ?? 0.95;
    u.pitch = 1.25;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.onstart = () => !cancelled && opts.onSegment?.(i);
    if (i === texts.length - 1) u.onend = () => !cancelled && opts.onEnd?.();
    synth.speak(u);
  });
  return () => {
    cancelled = true;
    synth.cancel();
  };
}

/** Krótki, ciepły motyw muzyczny Elofika (harfa/arpeggio, WebAudio). Bez dzwoneczków. */
export function playElofikMotif(ctx?: AudioContext) {
  try {
    const ac = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99];
    notes.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = ac.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 1);
    });
    return 0.13 * notes.length + 0.6;
  } catch {
    return 0;
  }
}
