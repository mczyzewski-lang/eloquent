"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Check, Gauge, Heart, Loader2, MessageCircleHeart, Pause, Play, RotateCcw, RotateCw, Sparkles as SparklesIcon, Volume2 } from "lucide-react";
import { Elofik, Sparkles } from "@/components/elofik/Elofik";
import { StoryCover } from "@/components/elofik/StoryCover";
import { Button, buttonVariants } from "@/components/ui/button";
import { VoiceGreeting } from "./VoiceGreeting";
import { playElofikMotif, speakSequence } from "@/lib/client/speech";
import type { Locale } from "@/lib/domain/command-matcher";
import { cn, formatDuration } from "@/lib/utils";

export interface StoryMeta {
  storyId: string;
  dayNumber: number;
  title: string;
  wordOfDay: string;
  wordDefinition: string;
  parentQuestion: string;
  estimatedMinutes: number;
  coverUrl?: string | null;
}

interface AudioInfo {
  audioUrl: string;
  durationMs: number;
  timeline: { segmentId: string; startMs: number; endMs: number; text: string }[];
  provider: "elevenlabs" | "mock";
  resumeAt: number;
  favorite: boolean;
}

interface GreetingInfo {
  audioUrl: string;
  text: string;
  provider: "elevenlabs" | "mock";
  variantId: string;
}

// Operacje na elemencie audio poza komponentem (czytelniej i zgodnie z regułami React Compiler)
function seekTo(a: HTMLAudioElement | null, sec: number) {
  if (a) a.currentTime = Math.max(0, sec);
}
function seekBy(a: HTMLAudioElement | null, delta: number) {
  if (a) seekTo(a, Math.min((a.duration || Infinity) - 0.5, a.currentTime + delta));
}
function setMuted(a: HTMLAudioElement, muted: boolean) {
  a.muted = muted;
}
function setRateOn(a: HTMLAudioElement | null, rate: number) {
  if (a) a.playbackRate = rate;
}

async function post(url: string, body: unknown) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true });
}

const event = (storyId: string, name: string) => void post("/api/progress", { action: "event", storyId, name }).catch(() => undefined);

export function StoryExperience({
  story,
  childName,
  childAddress,
  locale,
  voiceRitual,
  needsConsent,
}: {
  story: StoryMeta;
  childName: string;
  childAddress: string;
  locale: Locale;
  voiceRitual: boolean;
  needsConsent: boolean;
}) {
  const [stage, setStage] = useState<"ritual" | "player" | "finished">(voiceRitual ? "ritual" : "player");
  const [audio, setAudio] = useState<AudioInfo | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const greetingRef = useRef<GreetingInfo | null>(null);
  const greetingEl = useRef<HTMLAudioElement>(null);
  const storyEl = useRef<HTMLAudioElement>(null);
  const primed = useRef(false);

  // Prefetch: audio bajki i powitania przygotowujemy od razu po wejściu — odpowiedź Elofika startuje bez czekania na TTS.
  useEffect(() => {
    event(story.storyId, "story_opened");
    if (voiceRitual) event(story.storyId, "voice_greeting_screen_viewed");
    fetch(`/api/stories/${story.storyId}/audio`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setAudio(j);
        if (storyEl.current) {
          storyEl.current.src = j.audioUrl;
          storyEl.current.preload = "auto";
        }
      })
      .catch((e) => setAudioError(e.message));
    if (voiceRitual) {
      post("/api/greeting", { storyId: story.storyId })
        .then((r) => r.json())
        .then((g: GreetingInfo) => {
          greetingRef.current = g;
          if (greetingEl.current && g.audioUrl) {
            greetingEl.current.src = g.audioUrl;
            greetingEl.current.preload = "auto";
            greetingEl.current.load();
          }
        })
        .catch(() => undefined);
    }
  }, [story.storyId, voiceRitual]);

  /** iOS/Safari: odblokowanie elementów audio w geście użytkownika (dotknięcie mikrofonu). */
  const prime = useCallback(() => {
    if (primed.current) return;
    primed.current = true;
    for (const el of [greetingEl.current, storyEl.current]) {
      if (!el || !el.src) continue;
      el.muted = true;
      el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = false; }).catch(() => { el.muted = false; });
    }
  }, []);

  const playGreeting = useCallback(async () => {
    const g = greetingRef.current;
    const el = greetingEl.current;
    await new Promise<void>((resolve) => {
      if (!g) return resolve();
      if (g.provider === "mock") {
        speakSequence([g.text], { lang: locale, onEnd: resolve });
        setTimeout(resolve, 12_000);
        return;
      }
      if (!el) return resolve();
      el.muted = false;
      el.currentTime = 0;
      el.onended = () => resolve();
      el.play().catch(() => resolve());
    });
    event(story.storyId, "voice_greeting_response_played");
    const motif = playElofikMotif();
    await new Promise((r) => setTimeout(r, Math.min(2200, motif * 1000)));
  }, [locale, story.storyId]);

  const getStoryEl = useCallback(() => storyEl.current, []);
  const onFinished = useCallback(() => setStage("finished"), []);

  const startStory = useCallback(
    (from: "ritual" | "skip") => {
      setStage("player");
      if (from === "ritual") event(story.storyId, "voice_greeting_to_story_started");
    },
    [story.storyId],
  );

  return (
    <>
      <audio ref={greetingEl} preload="auto" className="hidden" />
      <audio ref={storyEl} preload="auto" className="hidden" playsInline />
      {stage === "ritual" && (
        <VoiceGreeting
          storyId={story.storyId}
          locale={locale}
          childName={childAddress}
          needsConsent={needsConsent}
          onUserGesture={prime}
          onRecognized={async () => {
            await playGreeting();
            startStory("ritual");
          }}
          onSkip={(reason) => {
            prime();
            void post("/api/voice/skip", { storyId: story.storyId, reason });
            startStory("skip");
          }}
        />
      )}
      {stage !== "ritual" && (
        <StoryPlayer story={story} childName={childName} audio={audio} audioError={audioError} getEl={getStoryEl} autoStart onFinished={onFinished} finished={stage === "finished"} locale={locale} />
      )}
    </>
  );
}

function StoryPlayer({
  story,
  childName,
  audio,
  audioError,
  getEl,
  autoStart,
  onFinished,
  finished,
  locale,
}: {
  story: StoryMeta;
  childName: string;
  audio: AudioInfo | null;
  audioError: string | null;
  /** Element audio należy do rodzica (odblokowany w geście użytkownika podczas rytuału). */
  getEl: () => HTMLAudioElement | null;
  autoStart: boolean;
  onFinished: () => void;
  finished: boolean;
  locale: Locale;
}) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [measured, setMeasured] = useState(0);
  const [rate, setRate] = useState(1);
  const [favOverride, setFavOverride] = useState<boolean | null>(null);
  const [discussed, setDiscussed] = useState(false);
  const [voiceOverride, setVoiceOverride] = useState<boolean | null>(null);
  const started = useRef(false);
  const lastSave = useRef(0);
  const stopSpeech = useRef<() => void>(() => undefined);

  const duration = measured || (audio?.durationMs ?? 0) / 1000;
  const favorite = favOverride ?? audio?.favorite ?? false;
  const browserVoice = voiceOverride ?? audio?.provider === "mock";
  const segIdx = useMemo(() => {
    if (!audio) return 0;
    const ms = time * 1000;
    let i = 0;
    for (let k = 0; k < audio.timeline.length; k++) if (audio.timeline[k].startMs <= ms) i = k;
    return i;
  }, [audio, time]);

  const save = useCallback(
    (ev: "start" | "progress" | "complete") => {
      const a = getEl();
      if (!a) return;
      const durationSec = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : (audio?.durationMs ?? 0) / 1000;
      void post("/api/progress", { action: "playback", storyId: story.storyId, positionSec: a.currentTime, durationSec, event: ev });
    },
    [audio, getEl, story.storyId],
  );

  useEffect(() => {
    const a = getEl();
    if (!audio || !a) return;
    if (!a.src.endsWith(audio.audioUrl)) a.src = audio.audioUrl;
    if (audio.resumeAt > 5 && audio.resumeAt < audio.durationMs / 1000 - 10) a.currentTime = audio.resumeAt;
    if (autoStart && !started.current) {
      started.current = true;
      a.play().catch(() => undefined);
    }
  }, [audio, autoStart, getEl]);

  // Kontrolki systemowe (ekran blokady, słuchawki) — Media Session API
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: story.title, artist: "Elofik", album: `Dzień ${story.dayNumber} — ${story.wordOfDay}`, artwork: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
    navigator.mediaSession.setActionHandler("play", () => void getEl()?.play());
    navigator.mediaSession.setActionHandler("pause", () => getEl()?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => seekBy(getEl(), -15));
    navigator.mediaSession.setActionHandler("seekforward", () => seekBy(getEl(), 15));
  }, [getEl, story]);

  useEffect(() => {
    const a = getEl();
    if (!a) return;
    const onPlay = () => {
      setPlaying(true);
      if (!lastSave.current) save("start");
      lastSave.current = Date.now();
    };
    const onPause = () => {
      setPlaying(false);
      save("progress");
      stopSpeech.current();
    };
    const onTime = () => {
      setTime(a.currentTime);
      if (a.duration && Number.isFinite(a.duration)) setMeasured(a.duration);
      if (Date.now() - lastSave.current > 10_000) {
        lastSave.current = Date.now();
        save("progress");
      }
    };
    const onEnded = () => {
      setPlaying(false);
      save("complete");
      stopSpeech.current();
      onFinished();
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [getEl, onFinished, save]);

  // tryb demo: głos przeglądarki czyta bieżący segment, nagranie zastępcze jest wyciszone
  useEffect(() => {
    const a = getEl();
    if (!a || !audio) return;
    setMuted(a, browserVoice);
    stopSpeech.current();
    if (browserVoice && playing) stopSpeech.current = speakSequence([audio.timeline[segIdx]?.text ?? ""], { lang: locale, rate: rate * 1.05 });
  }, [audio, browserVoice, getEl, locale, playing, rate, segIdx]);

  useEffect(() => {
    setRateOn(getEl(), rate);
  }, [getEl, rate]);

  useEffect(() => () => stopSpeech.current(), []);

  const toggle = () => {
    const a = getEl();
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  if (finished) {
    return (
      <main className="paper min-h-dvh px-5 py-8">
        <div className="mx-auto max-w-md text-center">
          <div className="relative mx-auto w-40">
            <Sparkles />
            <Elofik mood="happy" />
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">{story.dayNumber > 0 ? `Dzień ${story.dayNumber}` : "Sekretna bajka"}</p>
          <h1 className="mt-2 text-3xl font-semibold">Dzisiaj poznaliśmy słowo: <span className="uppercase text-gold-deep">{story.wordOfDay}</span>!</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{story.wordDefinition}</p>
          <div className="card-soft mt-6 p-5 text-left">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sage-deep"><MessageCircleHeart className="h-5 w-5" /> Zadanie dla rodzica</p>
            <p className="mt-2 font-display text-xl text-navy">Zapytaj dziecko: {story.parentQuestion}</p>
            <Button variant={discussed ? "sage" : "soft"} className="mt-4 w-full" onClick={() => { setDiscussed(!discussed); void post("/api/progress", { action: "word_discussed", storyId: story.storyId, value: !discussed }); }}>
              <Check className="h-5 w-5" /> {discussed ? "Porozmawialiśmy o tym słowie" : "Oznacz: porozmawialiśmy"}
            </Button>
            <p className="mt-2 text-xs text-muted">Samo wysłuchanie bajki nie oznacza opanowania słowa — rozmowa pomaga je utrwalić.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/app" className={buttonVariants({ size: "lg" })}>Wróć do biblioteki</Link>
            <button type="button" className="text-sm font-semibold text-muted hover:text-navy" onClick={() => location.reload()}>Posłuchaj jeszcze raz</button>
          </div>
        </div>
      </main>
    );
  }

  const progress = duration ? (time / duration) * 100 : 0;
  return (
    <main className="night min-h-dvh px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-cream">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem-env(safe-area-inset-bottom))] max-w-md flex-col">
        <div className="flex items-center justify-between">
          <Link href="/app" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Wróć do biblioteki">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <p className="text-sm font-semibold text-cream/70">{story.dayNumber > 0 ? `Dzień ${story.dayNumber}` : "Sekretna bajka"}</p>
          <button type="button" aria-pressed={favorite} aria-label="Ulubione" onClick={() => { setFavOverride(!favorite); void post("/api/progress", { action: "favorite", storyId: story.storyId, value: !favorite }); }} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
            <Heart className={cn("h-6 w-6", favorite && "fill-peach-deep text-peach-deep")} />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-2 w-full max-w-[min(100%,36dvh)]">
          <StoryCover day={story.dayNumber} word={story.wordOfDay} childName={childName} imageUrl={story.coverUrl} className="aspect-square shadow-2xl" />
        </motion.div>

        <div className="mt-4 text-center">
          <h1 className="text-2xl font-semibold text-cream">{story.title}</h1>
          <p className="mt-1 text-cream/70">Słowo dnia: <strong className="text-gold">{story.wordOfDay}</strong> · {story.estimatedMinutes} min</p>
        </div>

        <p className="mt-3 line-clamp-3 min-h-[3.75rem] text-center text-sm leading-relaxed text-cream/75" aria-live="off">
          {audio?.timeline[segIdx]?.text.slice(0, 180)}
          {(audio?.timeline[segIdx]?.text.length ?? 0) > 180 ? "…" : ""}
        </p>

        <div className="mt-auto pt-3">
          {!audio && !audioError && (
            <p className="flex items-center justify-center gap-2 py-6 text-cream/80"><Loader2 className="h-5 w-5 animate-spin" /> Elofik układa przygodę…</p>
          )}
          {audioError && <p className="rounded-2xl bg-red-500/20 p-3 text-center">{audioError}</p>}
          {audio && (
            <>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.5}
                value={time}
                onChange={(e) => seekTo(getEl(), Number(e.target.value))}
                aria-label="Pozycja odtwarzania"
                className="w-full accent-[#F6C76D]"
                style={{ background: `linear-gradient(to right, #F6C76D ${progress}%, rgb(255 255 255 / .2) ${progress}%)` }}
              />
              <div className="flex justify-between text-xs text-cream/60">
                <span>{formatDuration(time)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6">
                <button type="button" onClick={() => seekBy(getEl(), -15)} aria-label="Cofnij 15 sekund" className="relative flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10">
                  <RotateCcw className="h-7 w-7" />
                  <span className="absolute text-[10px] font-bold">15</span>
                </button>
                <button type="button" onClick={toggle} aria-label={playing ? "Pauza" : "Odtwórz"} className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-navy shadow-[0_0_0_8px_rgb(246_199_109/0.2)] transition active:scale-95" data-testid="play-toggle">
                  {playing ? <Pause className="h-9 w-9" /> : <Play className="ml-1 h-9 w-9" />}
                </button>
                <button type="button" onClick={() => seekBy(getEl(), 15)} aria-label="Przewiń 15 sekund" className="relative flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10">
                  <RotateCw className="h-7 w-7" />
                  <span className="absolute text-[10px] font-bold">15</span>
                </button>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Gauge className="h-4 w-4 text-cream/60" />
                {[0.8, 1, 1.2].map((r) => (
                  <button key={r} type="button" onClick={() => setRate(r)} className={cn("rounded-full px-3 py-1 text-sm font-semibold", rate === r ? "bg-white/20 text-cream" : "text-cream/60")}>
                    {r}×
                  </button>
                ))}
              </div>
              {audio.provider === "mock" && (
                <label className="mt-4 flex items-center justify-center gap-2 text-xs text-cream/60">
                  <input type="checkbox" checked={browserVoice} onChange={(e) => setVoiceOverride(e.target.checked)} />
                  <Volume2 className="h-4 w-4" /> Tryb demo: czytaj głosem przeglądarki (brak klucza ElevenLabs)
                </label>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-cream/50">
                <SparklesIcon className="h-3.5 w-3.5" /> Możesz odłożyć telefon — bajka gra także przy wygaszonym ekranie.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
