"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Elofik } from "@/components/elofik/Elofik";
import { speakSequence } from "@/lib/client/speech";
import { track } from "@/lib/client/analytics";

export function GiftPlayer({ audioUrl, provider, timeline }: { audioUrl: string; provider: "elevenlabs" | "mock"; timeline: { startMs: number; text: string }[] }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("");
  const stop = useRef<() => void>(() => undefined);

  useEffect(() => () => stop.current(), []);

  function play() {
    track("gift_opened");
    if (provider === "mock") {
      setPlaying(true);
      stop.current = speakSequence(timeline.map((t) => t.text), { onSegment: (i) => setCaption(timeline[i].text), onEnd: () => setPlaying(false) });
      setCaption(timeline[0]?.text ?? "");
      return;
    }
    void ref.current?.play();
  }
  function pause() {
    if (provider === "mock") {
      stop.current();
      setPlaying(false);
    } else ref.current?.pause();
  }
  return (
    <div className="card-soft p-5">
      <audio
        ref={ref}
        src={audioUrl}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const ms = e.currentTarget.currentTime * 1000;
          let c = "";
          for (const t of timeline) if (t.startMs <= ms) c = t.text;
          setCaption(c);
        }}
      />
      <div className="flex items-center gap-4">
        <button type="button" onClick={playing ? pause : play} aria-label={playing ? "Pauza" : "Odtwórz"} className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-gold text-navy shadow-soft" data-testid="gift-play">
          {playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
        </button>
        <div className="w-14 flex-none"><Elofik mood={playing ? "reading" : "hello"} /></div>
        <button type="button" onClick={() => { pause(); if (ref.current) ref.current.currentTime = 0; play(); }} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-muted"><RotateCcw className="h-4 w-4" /> Posłuchaj ponownie</button>
      </div>
      <p className="mt-4 min-h-16 text-lg leading-relaxed text-navy">{caption}</p>
      {provider === "mock" && <p className="text-xs text-muted">Tryb demo: czyta syntezator przeglądarki.</p>}
    </div>
  );
}
