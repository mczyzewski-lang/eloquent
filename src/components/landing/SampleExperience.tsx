"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, Loader2, Play, RotateCcw, Sparkles as SparklesIcon } from "lucide-react";
import { Elofik, Sparkles, type ElofikMood } from "@/components/elofik/Elofik";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getNameForms, sampleCtaLabel, validateName } from "@/lib/domain/names";
import { track } from "@/lib/client/analytics";
import { speakSequence } from "@/lib/client/speech";
import { cn } from "@/lib/utils";

type Phase = "idle" | "preparing" | "playing" | "done" | "error";

interface SampleResponse {
  audioUrl: string;
  provider: "elevenlabs" | "mock";
  timeline: { segmentId: string; startMs: number; endMs: number; text: string }[];
  durationMs: number;
}

const PREP_STEPS = ["Elofik nastawia uszy…", "Szuka w torbie mądrego słowa…", "Zapisuje imię w swojej księdze…", "Przygoda gotowa!"];

export function SampleExperience({ variant = "parents" }: { variant?: "parents" | "grandparents" }) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prepStep, setPrepStep] = useState(0);
  const [data, setData] = useState<SampleResponse | null>(null);
  const [caption, setCaption] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopSpeech = useRef<() => void>(() => undefined);
  const honeypot = useRef<HTMLInputElement>(null);

  const valid = validateName(name);
  const forms = valid.ok ? getNameForms(valid.name) : null;
  const cta = name.trim() ? sampleCtaLabel(name) : "Posłuchaj bajki dla Leona";

  useEffect(() => () => stopSpeech.current(), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid.ok) {
      setError(valid.reason === "empty" ? "Wpisz imię dziecka 🙂" : valid.reason === "not_allowed" ? "Spróbuj innego imienia." : "Imię może zawierać tylko litery.");
      return;
    }
    setError(null);
    setPhase("preparing");
    setPrepStep(0);
    track("sample_name_submitted", { known: Boolean(forms?.known) });
    const started = Date.now();
    const ticker = setInterval(() => setPrepStep((s) => Math.min(s + 1, PREP_STEPS.length - 1)), 650);
    try {
      const res = await fetch("/api/sample", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: valid.name, website: honeypot.current?.value ?? "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Coś poszło nie tak");
      // animacja przygotowania trwa min. ~2 s — to część efektu „wow”
      await new Promise((r) => setTimeout(r, Math.max(0, 2200 - (Date.now() - started))));
      setData(json);
      setPhase("playing");
      play(json);
    } catch (err) {
      setPhase("error");
      setError((err as Error).message);
    } finally {
      clearInterval(ticker);
    }
  }

  function play(d: SampleResponse) {
    track("sample_played", { provider: d.provider });
    if (d.provider === "mock") {
      // tryb demo: głos przeglądarki + napisy
      stopSpeech.current = speakSequence(
        d.timeline.map((t) => t.text),
        { onSegment: (i) => setCaption(d.timeline[i].text), onEnd: finish },
      );
      setCaption(d.timeline[0]?.text ?? "");
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    a.src = d.audioUrl;
    a.currentTime = 0;
    void a.play().catch(() => setPhase("done"));
  }

  function finish() {
    setPhase("done");
    track("sample_completed");
  }

  function onTime() {
    const a = audioRef.current;
    if (!a || !data) return;
    const ms = a.currentTime * 1000;
    const seg = data.timeline.find((t) => ms >= t.startMs && ms <= t.endMs + 400);
    if (seg) setCaption(seg.text);
  }

  const mood: ElofikMood = phase === "preparing" ? "listening" : phase === "playing" ? "telling" : phase === "done" ? "waving" : "idle";
  const display = forms?.nominative ?? "Leon";
  const genitive = forms?.genitive;
  const onboardingHref = useMemo(() => `/onboarding?imie=${encodeURIComponent(display)}`, [display]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative mx-auto w-40 sm:w-64">
        {(phase === "playing" || phase === "done") && <Sparkles />}
        <motion.div animate={phase === "idle" ? { y: [0, -8, 0] } : { y: 0 }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <Elofik mood={mood} />
        </motion.div>
      </div>

      <audio ref={audioRef} preload="none" onTimeUpdate={onTime} onEnded={finish} className="hidden" />

      <AnimatePresence mode="wait">
        {(phase === "idle" || phase === "error") && (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card-soft mt-2 p-5 sm:p-6">
            <p className="text-center font-display text-xl font-semibold text-navy">
              {variant === "parents" ? "Stwórz pierwszą bajkę dla swojego dziecka" : "Posłuchaj, jak Elofik wita wnuka"}
            </p>
            <label htmlFor="child-name" className="mt-4 block text-sm font-semibold text-muted">
              Jak ma na imię Twoje dziecko?
            </label>
            <Input
              id="child-name"
              name="childName"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="go"
              maxLength={30}
              placeholder="np. Leon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 text-center text-xl"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "name-error" : undefined}
            />
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {error && (
              <p id="name-error" role="alert" className="mt-2 text-center text-sm font-semibold text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-4 w-full whitespace-normal text-center leading-tight" data-testid="sample-cta">
              <Headphones className="h-5 w-5" />
              {cta}
            </Button>
            <p className="mt-3 text-center text-xs text-muted">Bez konta i bez e-maila. Fragment trwa ok. 30 sekund.</p>
          </motion.form>
        )}

        {phase === "preparing" && (
          <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-soft mt-2 p-6 text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-gold-deep" />
            <AnimatePresence mode="wait">
              <motion.p key={prepStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-3 font-display text-lg text-navy">
                {PREP_STEPS[prepStep]}
              </motion.p>
            </AnimatePresence>
            <p className="mt-1 text-sm text-muted">Przygotowujemy przygodę dla: {display}</p>
          </motion.div>
        )}

        {phase === "playing" && (
          <motion.div key="play" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card-soft mt-2 p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-deep">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-deep opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold-deep" />
              </span>
              Elofik opowiada
            </div>
            <p className="mt-3 min-h-24 font-display text-lg leading-relaxed text-navy" aria-live="polite">
              {caption}
            </p>
            {data?.provider === "mock" && <p className="mt-2 text-xs text-muted">Tryb demo: czyta syntezator przeglądarki. W aplikacji słyszysz głos Elofika.</p>}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { stopSpeech.current(); audioRef.current?.pause(); finish(); }}>
              Pomiń
            </Button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card-soft mt-2 p-6 text-center">
            <SparklesIcon className="mx-auto h-6 w-6 text-gold-deep" />
            <p className="mt-2 font-display text-2xl font-semibold text-navy">
              {genitive ? `A to dopiero początek przygód ${genitive}!` : `A to dopiero początek przygód, w których gra ${display}!`}
            </p>
            <p className="mt-3 text-muted">Elofik może zaprosić do historii także mamę, tatę, babcię, dziadka, rodzeństwo i ukochanego zwierzaka.</p>
            <Link href={onboardingHref} className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full whitespace-normal leading-tight")} onClick={() => track("onboarding_started", { from: "sample" })}>
              {genitive ? `Stwórz świat Elofika dla ${genitive}` : "Stwórz świat Elofika dla swojego dziecka"}
            </Link>
            <button type="button" onClick={() => data && (setPhase("playing"), play(data))} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-navy">
              <RotateCcw className="h-4 w-4" /> Posłuchaj jeszcze raz
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "idle" && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-cream/75">
          <Play className="h-4 w-4" /> Elofik wypowie imię dziecka w bajce
        </p>
      )}
    </div>
  );
}
