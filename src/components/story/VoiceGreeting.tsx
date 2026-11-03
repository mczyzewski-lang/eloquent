"use client";

/**
 * Rytuał „Hej Elofik!”.
 * - Mikrofon włącza się dopiero po dotknięciu przycisku; sesja trwa maks. kilka sekund.
 * - ElevenLabs Scribe v2 Realtime przez WebSocket z jednorazowym tokenem z backendu (VAD).
 * - Dopasowanie komendy po stronie urządzenia; na serwer trafia tylko wynik (bez transkrypcji).
 * - Po rozpoznaniu połączenie i mikrofon są natychmiast zamykane.
 * - Zawsze dostępna opcja pominięcia (dotyk), po 2 nieudanych próbach — wyraźny fallback.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, Mic, MicOff, ShieldCheck } from "lucide-react";
import { Elofik, Sparkles, type ElofikMood } from "@/components/elofik/Elofik";
import { Button } from "@/components/ui/button";
import { matchGreetingCommand, GREETING_PROMPT, type Locale } from "@/lib/domain/command-matcher";
import { cn } from "@/lib/utils";

type Phase = "intro" | "consent" | "connecting" | "listening" | "retry" | "responding" | "transition";

interface StartResponse {
  sessionId: string;
  mode: "scribe" | "simulated";
  token: string | null;
  modelId: string;
  languageCode: string;
  keyterms: string[];
  maxSeconds: number;
}

interface Props {
  storyId: string;
  locale: Locale;
  childName: string;
  needsConsent: boolean;
  /** Wywoływane w geście użytkownika — pozwala „odblokować” elementy audio na iOS. */
  onUserGesture: () => void;
  /** Rozpoznano powitanie → odtwórz odpowiedź Elofika. Zwraca Promise zakończenia odpowiedzi. */
  onRecognized: () => Promise<void>;
  /** Pominięcie rytuału (dotyk / brak mikrofonu). */
  onSkip: (reason: string) => void;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error ?? "Błąd"), { status: res.status, code: json.code });
  return json as T;
}

export function VoiceGreeting({ storyId, locale, childName, needsConsent, onUserGesture, onRecognized, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>(needsConsent ? "consent" : "intro");
  const [failures, setFailures] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [simText, setSimText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const connRef = useRef<{ close: () => void } | null>(null);
  const sessionRef = useRef<{ id: string; startedAt: number; done: boolean } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    try {
      connRef.current?.close(); // zamyka WebSocket i zwalnia mikrofon
    } catch {}
    connRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const finish = useCallback(
    async (outcome: "recognized" | "failed" | "timeout" | "error", confidence: number | null) => {
      const s = sessionRef.current;
      if (!s || s.done) return;
      s.done = true;
      cleanup();
      void post("/api/voice/finish", { sessionId: s.id, outcome, durationMs: Date.now() - s.startedAt, confidence }).catch(() => undefined);
      if (outcome === "recognized") {
        setPhase("responding");
        await onRecognized();
        setPhase("transition");
        return;
      }
      const f = failures + 1;
      setFailures(f);
      setMessage(outcome === "error" ? "Coś przerwało połączenie." : `Spróbuj jeszcze raz: ${GREETING_PROMPT[locale]}`);
      setPhase("retry");
    },
    [cleanup, failures, locale, onRecognized],
  );

  // Wypowiedź dziecka bywa dzielona przez VAD („hej…” pauza „Elofik”) — sprawdzamy także sklejone fragmenty.
  // Transkrypcja istnieje wyłącznie w pamięci tej sesji i nie opuszcza urządzenia.
  const heardRef = useRef<string[]>([]);
  const check = useCallback(
    (text: string, final: boolean) => {
      const joined = [...heardRef.current, text].join(" ").split(" ").slice(-8).join(" ");
      const r = matchGreetingCommand(joined, locale);
      const single = matchGreetingCommand(text, locale);
      if (single.matched || r.matched) return void finish("recognized", Math.max(single.confidence, r.confidence));
      if (!final || single.reason === "empty") return;
      heardRef.current.push(text);
      if (heardRef.current.length >= 2) void finish("failed", r.confidence);
    },
    [finish, locale],
  );

  async function start() {
    onUserGesture();
    setMessage(null);
    setPhase("connecting");
    let s: StartResponse;
    try {
      s = await post<StartResponse>("/api/voice/start", { storyId });
    } catch (e) {
      const err = e as Error & { status?: number };
      setMessage(err.message);
      setFailures((f) => Math.max(f, 2));
      setPhase("retry");
      return;
    }
    sessionRef.current = { id: s.sessionId, startedAt: Date.now(), done: false };
    heardRef.current = [];
    setSecondsLeft(s.maxSeconds);
    tickRef.current = setInterval(() => setSecondsLeft((x) => Math.max(0, x - 1)), 1000);
    timeoutRef.current = setTimeout(() => void finish("timeout", null), s.maxSeconds * 1000);

    if (s.mode === "simulated") {
      setSimulated(true);
      setPhase("listening");
      return;
    }
    try {
      const { Scribe, RealtimeEvents, CommitStrategy } = await import("@elevenlabs/client");
      const conn = Scribe.connect({
        token: s.token!,
        modelId: s.modelId,
        languageCode: s.languageCode,
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 0.7,
        minSpeechDurationMs: 150,
        keyterms: s.keyterms,
        filterBackgroundAudio: true,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      connRef.current = conn;
      conn.on(RealtimeEvents.SESSION_STARTED, () => setPhase("listening"));
      conn.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (m) => check(m.text, false));
      conn.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (m) => check(m.text, true));
      conn.on(RealtimeEvents.ERROR, () => void finish("error", null));
      conn.on(RealtimeEvents.AUTH_ERROR, () => void finish("error", null));
      conn.on(RealtimeEvents.CLOSE, () => {
        if (sessionRef.current && !sessionRef.current.done) void finish("error", null);
      });
    } catch (e) {
      const name = (e as Error).name;
      if (name === "NotAllowedError" || name === "NotFoundError") {
        setMessage("Brak dostępu do mikrofonu. Bajkę możesz rozpocząć dotykiem.");
        setFailures(2);
      }
      void finish("error", null);
    }
  }

  async function consent(accept: boolean) {
    await post("/api/account/voice-consent", { enabled: accept }).catch(() => undefined);
    if (!accept) return onSkip("no_consent");
    setPhase("intro");
  }

  const mood: ElofikMood = phase === "listening" || phase === "connecting" ? "listening" : phase === "responding" ? "waving" : phase === "transition" ? "happy" : "idle";
  const showFallback = failures >= 2;

  return (
    <div className="night fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-cream">
      <div className="flex w-full max-w-md justify-end">
        <button type="button" onClick={() => { cleanup(); onSkip("parent_skip"); }} className="rounded-full px-3 py-2 text-sm font-semibold text-cream/70 hover:bg-white/10 hover:text-cream" data-testid="skip-ritual">
          Pomiń powitanie
        </button>
      </div>

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <div className="relative w-56 sm:w-64">
          <div className={cn("absolute inset-6 rounded-full blur-3xl transition", phase === "responding" || phase === "transition" ? "bg-gold/50" : "bg-gold/20")} aria-hidden />
          {(phase === "responding" || phase === "transition") && <Sparkles count={9} />}
          <motion.div animate={phase === "intro" ? { y: [0, -10, 0] } : { y: 0 }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <Elofik mood={mood} />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {phase === "consent" && (
            <motion.div key="consent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl bg-white/10 p-5 text-left">
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-gold"><ShieldCheck className="h-5 w-5" /> Informacja dla rodzica</p>
              <p className="mt-2 text-sm leading-relaxed text-cream/90">
                Rytuał „Hej Elofik!” na kilka sekund włącza mikrofon — tylko po dotknięciu przycisku. Krótka wypowiedź jest przetwarzana na tekst przez naszego dostawcę (ElevenLabs), aby rozpoznać powitanie.
                <strong> Nie nagrywamy i nie przechowujemy głosu dziecka ani transkrypcji.</strong> Połączenie zamykamy zaraz po rozpoznaniu. Zgodę możesz cofnąć w ustawieniach konta.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={() => consent(true)}>Rozumiem, włączmy rytuał</Button>
                <Button variant="ghost" className="flex-1 text-cream hover:bg-white/10" onClick={() => consent(false)}>Wolę bez mikrofonu</Button>
              </div>
            </motion.div>
          )}

          {(phase === "intro" || phase === "retry") && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              <p className="font-display text-3xl font-semibold text-cream">{phase === "retry" ? "Elofik nie dosłyszał…" : "Elofik czeka na Ciebie!"}</p>
              <p className="mt-3 text-xl text-cream/85">{message ?? <>Powiedz: <strong className="text-gold">{GREETING_PROMPT[locale]}</strong></>}</p>
            </motion.div>
          )}

          {(phase === "connecting" || phase === "listening") && (
            <motion.div key="listen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4" role="status" aria-live="polite">
              <p className="font-display text-2xl font-semibold text-cream">{phase === "connecting" ? "Elofik nastawia uszy…" : "Słucham…"}</p>
              <SoundWave active={phase === "listening"} />
              <p className="text-sm text-cream/60">Mikrofon wyłączy się sam za {secondsLeft} s</p>
            </motion.div>
          )}

          {phase === "responding" && (
            <motion.p key="resp" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 font-display text-3xl font-semibold text-gold">
              Heeej, {childName}!
            </motion.p>
          )}
          {phase === "transition" && (
            <motion.p key="tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 font-display text-2xl text-cream">Zaczynamy przygodę…</motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md space-y-3">
        {(phase === "intro" || phase === "retry") && (
          <Button size="xl" className="w-full" onClick={start} data-testid="mic-button">
            <Mic className="h-6 w-6" /> {phase === "retry" ? "Spróbuj jeszcze raz" : "Przywitaj się z Elofikiem"}
          </Button>
        )}

        {phase === "listening" && simulated && (
          <div className="rounded-3xl bg-white/10 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-gold">Tryb demo — symulacja rozpoznania głosu</p>
            <p className="mt-1 text-xs text-cream/70">Bez klucza ElevenLabs nie łączymy się ze Scribe. Wpisz, co „powiedziało” dziecko:</p>
            <div className="mt-2 flex gap-2">
              <input value={simText} onChange={(e) => setSimText(e.target.value)} placeholder="np. hej elofik" className="h-11 flex-1 rounded-xl bg-white/90 px-3 text-navy" aria-label="Symulowana wypowiedź" />
              <Button size="sm" onClick={() => { heardRef.current.push(""); check(simText, true); }}>Wyślij</Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="sage" className="flex-1" onClick={() => check("Hej, Elofik!", true)} data-testid="simulate-ok">„Hej, Elofik!”</Button>
              <Button size="sm" variant="ghost" className="flex-1 text-cream hover:bg-white/10" onClick={() => { heardRef.current.push("mama"); check("gdzie jest piłka", true); }}>Hałas w tle</Button>
            </div>
          </div>
        )}

        {(showFallback || phase === "listening" || phase === "connecting") && phase !== "responding" && (
          <Button variant={showFallback ? "soft" : "ghost"} size={showFallback ? "lg" : "md"} className={cn("w-full", !showFallback && "text-cream/80 hover:bg-white/10")} onClick={() => { cleanup(); onSkip(showFallback ? "mic_failed" : "touch"); }} data-testid="touch-start">
            {showFallback ? <MicOff className="h-5 w-5" /> : <Hand className="h-5 w-5" />}
            {showFallback ? "Nie działa mikrofon? Rozpocznij bajkę dotykiem" : "Rozpocznij dotykiem"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SoundWave({ active }: { active: boolean }) {
  return (
    <div className="my-4 flex h-12 items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-gold"
          animate={active ? { height: [8, 18 + ((i * 7) % 26), 8] } : { height: 6 }}
          transition={{ duration: 0.8 + (i % 3) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
        />
      ))}
    </div>
  );
}
