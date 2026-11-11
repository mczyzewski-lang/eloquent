"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const TrailFilm = dynamic(() => import("./trail/TrailFilm").then((m) => m.TrailFilm), { ssr: false });

/** Film ładowany dopiero, gdy zbliża się do ekranu (nie obciąża pierwszego wczytania strony). */
export function LazyFilm({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setShow(true); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {show ? <TrailFilm /> : <div className="w-full rounded-[2rem] bg-[#bfdcf3]" style={{ aspectRatio: "16 / 9" }} aria-hidden />}
    </div>
  );
}
