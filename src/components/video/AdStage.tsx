"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AD_FORMATS, AD_W, AdFilm, type AdFormat } from "./AdFilm";

declare global {
  interface Window { __adSeek?: (t: number) => void }
}

/** Scena w skali 1:1 do renderowania klatek (scripts/render-ad.ts ustawia czas przez window.__adSeek). */
export function AdStage({ format, initial }: { format: AdFormat; initial: number }) {
  const [t, setT] = useState(initial);
  useEffect(() => {
    window.__adSeek = (v: number) => flushSync(() => setT(v));
    return () => { delete window.__adSeek; };
  }, []);
  return (
    <div style={{ position: "fixed", left: 0, top: 0, width: AD_W, height: AD_FORMATS[format], zIndex: 9999 }} data-ad-stage>
      <AdFilm t={t} format={format} />
    </div>
  );
}
