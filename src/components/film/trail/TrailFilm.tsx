"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Headphones, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ELOFIK_SPRITES, ElofikPuppet, HedgehogPuppet, SquirrelPuppet, spriteUrl, type ElofikSprite } from "./Puppets";
import { FarHills, Foreground, MainStage, MidForest, Stone } from "./World";
import { FilmSound } from "./sound";
import {
  BUBBLES, CAMERA_X, CAPTIONS, DURATION, ELOFIK_X, FOOTPRINTS, GROUND, H, HEDGEHOG_X, MEADOW_X, SKY_BOTTOM, SKY_TOP, SQUIRREL_TREE_X, STONE_X, STREAM_X, TINT, W, WORD,
  bounceOut, clamp, colorKey, key, lerp, rng, seg, smooth, window_,
} from "./timeline";

const FONT = { fontFamily: "var(--font-display)", fontWeight: 700 } as const;

/** Pozy Elofika w kolejnych scenach: [od sekundy, poza]. */
const POSES: [number, ElofikSprite][] = [
  [0, "hello"], [13.4, "confident"], [21.9, "surprised"], [23.1, "detective"], [28.6, "confident"], [33.6, "thinking"], [37, "confident"],
  [39.6, "surprised"], [41, "idea"], [43, "confident"], [47.6, "thinking"], [48.4, "detective"], [50.3, "surprised"], [52.2, "worried"],
  [54, "idea"], [57.2, "confident"], [62.6, "surprised"], [64.6, "jumping"], [70, "wink"], [77, "jumping"], [80, "love"],
];

/** Film „Elofik i tajemniczy ślad” — animacja 2D w całości z kodu (SVG + Web Audio). */
export function TrailFilm({ initialTime, ctaHref = "/#probka", className }: { initialTime?: number; ctaHref?: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const time = useRef(initialTime ?? 3.4);
  const sound = useRef<FilmSound | null>(null);
  const cache = useRef(new Map<string, Element | null>());
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(initialTime !== undefined);
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState(-1);
  const [ended, setEnded] = useState((initialTime ?? 0) >= DURATION);
  const captionRef = useRef(-1);
  const [second, setSecond] = useState(Math.floor(initialTime ?? 0));
  const secondRef = useRef(-1);

  const stars = useMemo(() => { const r = rng(9); return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 520, s: 1 + r() * 2.2, k: r() * 6 })); }, []);
  const flies = useMemo(() => { const r = rng(21); return Array.from({ length: 90 }, () => ({ x: MEADOW_X - 620 + r() * 1500, y: 200 + r() * 500, a: r() * 6, b: r() * 6, s: 3 + r() * 4 })); }, []);

  const frame = useCallback((t: number) => {
    const root = svg.current;
    if (!root) return;
    const $ = (id: string) => {
      let el = cache.current.get(id);
      if (el === undefined) { el = root.querySelector(`#${id}`); cache.current.set(id, el); }
      return el as SVGElement | null;
    };
    const tf = (id: string, v: string) => $(id)?.setAttribute("transform", v);
    const op = (id: string, v: number) => $(id)?.setAttribute("opacity", v.toFixed(3));

    const cam = key(t, CAMERA_X);
    tf("L1", `translate(${(-cam * 0.12).toFixed(1)},0)`);
    tf("L2", `translate(${(-cam * 0.28).toFixed(1)},0)`);
    tf("L3", `translate(${(-cam * 0.55).toFixed(1)},0)`);
    tf("L4", `translate(${(-cam).toFixed(1)},0)`);
    tf("L6", `translate(${(-cam).toFixed(1)},0)`);
    tf("L5", `translate(${(-cam * 1.35).toFixed(1)},0)`);

    // niebo, światło, słońce i księżyc
    $("sky-a")?.setAttribute("stop-color", colorKey(t, SKY_TOP));
    $("sky-b")?.setAttribute("stop-color", colorKey(t, SKY_BOTTOM));
    $("tint")?.setAttribute("fill", colorKey(t, TINT));
    const night = smooth(seg(t, 61, 68));
    const day = seg(t, 1.5, 61);
    tf("sun", `translate(${lerp(220, 1420, day).toFixed(1)},${(640 - Math.sin(Math.PI * day) * 500).toFixed(1)})`);
    op("sun", 1 - seg(t, 59.5, 62));
    tf("moon", `translate(1290,${lerp(560, 170, smooth(seg(t, 61.5, 70))).toFixed(1)})`);
    op("moon", night);
    op("stars", Math.max(night, 1 - seg(t, 0, 5) * 1.2) * 0.95);
    op("oak-window", 1);

    // ---------- Elofik (grafiki marki: poza zależna od sceny) ----------
    const ex = key(t, ELOFIK_X);
    const speed = Math.abs(key(t + 0.05, ELOFIK_X) - key(t - 0.05, ELOFIK_X)) / 0.1;
    const walk = clamp(speed / 140);
    const phase = ex / 30;
    let pi = 0;
    for (let i = 0; i < POSES.length; i++) if (t >= POSES[i][0]) pi = i;
    const [poseAt, pose] = POSES[pi];
    const sprite = ELOFIK_SPRITES[pose];
    const img = $("e-img");
    if (img && img.getAttribute("data-pose") !== pose) {
      const hh = 318 * sprite.k, ww = (hh * sprite.w) / 360;
      img.setAttribute("data-pose", pose);
      img.setAttribute("href", spriteUrl(pose));
      img.setAttribute("x", (-ww / 2).toFixed(1));
      img.setAttribute("y", (-hh).toFixed(1));
      img.setAttribute("width", ww.toFixed(1));
      img.setAttribute("height", hh.toFixed(1));
    }
    const kneel = pose === "detective" ? 1 : 0;
    const jump = pose === "jumping" ? 1 : Math.max(window_(t, 50.3, 51.2, 0.2), 0);
    const hop = Math.abs(Math.sin(phase)) * 16 * walk + Math.abs(Math.sin(t * 8)) * 34 * jump;
    // „pyk” przy zmianie pozy: krótkie ściśnięcie i rozciągnięcie
    const pop = t - poseAt < 0.36 && pi > 0 ? Math.sin(((t - poseAt) / 0.36) * Math.PI) : 0;
    const breathe = Math.sin(t * 2.2) * 0.012 * (1 - walk);
    op("e", seg(t, 7.6, 8.2));
    const es = lerp(0.8, 1, smooth(seg(t, 7.6, 9.2)));
    tf("e", `translate(${ex.toFixed(1)},${(GROUND + 6).toFixed(1)}) scale(${es.toFixed(3)})`);
    tf("e-shadow", `scale(${(1 - hop / 110).toFixed(2)},1)`);
    tf("e-body", `translate(0,${(-hop).toFixed(1)}) rotate(${(Math.sin(phase) * 5 * walk + walk * 3 + Math.sin(t * 1.3) * 1.2).toFixed(2)}) scale(${(1 + pop * 0.07 - breathe).toFixed(3)},${(1 - pop * 0.09 + breathe + Math.abs(Math.cos(phase)) * 0.03 * walk).toFixed(3)})`);

    // ---------- ślady ----------
    FOOTPRINTS.forEach((f, i) => {
      const k = f.at ? bounceOut(seg(t, f.at, f.at + 0.45)) : 1;
      tf(`fp${i}`, `translate(${f.x},${f.y}) rotate(${f.rot}) scale(${k.toFixed(3)})`);
      op(`fp${i}`, (f.at && t < f.at ? 0 : 1) * (0.72 + 0.28 * Math.sin(t * 4 + i * 1.7)));
    });

    // ---------- strumyk i wiewiórka ----------
    const blub = window_(t, 33.6, 37.6, 0.4);
    for (let i = 0; i < 6; i++) {
      const p = ((t * 0.55 + i * 0.17) % 1 + 1) % 1;
      tf(`bl${i}`, `translate(${STREAM_X + 30 + i * 26 + Math.sin(t * 3 + i) * 6},${(GROUND + 60 - p * 150).toFixed(1)}) scale(${(0.5 + p * 0.7).toFixed(2)})`);
      op(`bl${i}`, blub * (1 - p) * 0.9);
    }
    const sq = smooth(seg(t, 39.5, 40.1)) * (1 - smooth(seg(t, 43.6, 44.4)));
    tf("sq-pos", `translate(${(SQUIRREL_TREE_X - 20 - sq * 92).toFixed(1)},${(353 - Math.abs(Math.sin(t * 7)) * 6 * window_(t, 40, 43, 0.3)).toFixed(1)})`);
    tf("sq-tail", `rotate(${(Math.sin(t * 5) * 9).toFixed(1)},10,-6)`);

    // ---------- kamień i jeżyk ----------
    tf("stone", `rotate(${key(t, [[50, 0], [50.8, -24], [55.8, -24], [56.8, 0]]).toFixed(1)},${STONE_X - 130},${GROUND + 6})`);
    op("stone-glow", key(t, [[43.5, 0], [46.5, 0.75], [50.2, 1], [52, 0]]) * (0.75 + 0.25 * Math.sin(t * 4)));
    const hx = key(t, HEDGEHOG_X);
    const hSpeed = Math.abs(key(t + 0.05, HEDGEHOG_X) - key(t - 0.05, HEDGEHOG_X)) / 0.1;
    const hMove = clamp(hSpeed / 100);
    const hFlip = t > 57 ? -1 : 1;
    op("h", seg(t, 50.3, 50.8));
    tf("h", `translate(${hx.toFixed(1)},${(GROUND + 6 - Math.abs(Math.sin(hx / 20)) * 10 * hMove - Math.abs(Math.sin(t * 8)) * 10 * window_(t, 63.4, 66.5, 0.3)).toFixed(1)}) scale(${hFlip},1)`);
    for (let i = 0; i < 3; i++) {
      op(`hf${i}`, seg(t, 58, 59));
      tf(`hf${i}`, `translate(${MEADOW_X + 170 + i * 78},${(GROUND + 8 - Math.abs(Math.sin(t * 7 + i * 1.3)) * 14 * seg(t, 62.4, 63.2)).toFixed(1)})`);
    }

    // ---------- świetliki i gwiazdy ----------
    flies.forEach((f, i) => {
      const el = $(`ff${i}`);
      if (!el) return;
      const o = night * (0.45 + 0.55 * Math.sin(t * 2.6 + f.a * 3)) * seg(t, 62 + (i % 14) * 0.4, 63 + (i % 14) * 0.4);
      el.setAttribute("opacity", Math.max(0, o).toFixed(2));
      if (o > 0) {
        el.setAttribute("cx", (f.x + Math.sin(t * 0.55 + f.a) * 38).toFixed(1));
        el.setAttribute("cy", (f.y + Math.cos(t * 0.7 + f.b) * 26 - seg(t, 62, 70) * 30).toFixed(1));
      }
    });

    // ---------- słowo dnia ----------
    const sx = ex - 34, sy = GROUND - 92;
    for (let i = 0; i < WORD.length; i++) {
      const a = 71.6 + i * 0.26;
      const pop = bounceOut(seg(t, a, a + 0.5));
      const fly = smooth(seg(t, 76.9 + i * 0.08, 78.1 + i * 0.08));
      const bx = ex + 40 + (i - (WORD.length - 1) / 2) * 62;
      const by = 330 - Math.sin((Math.PI * (i + 0.5)) / WORD.length) * 80 + Math.sin(t * 2.2 + i * 0.6) * 7;
      tf(`w${i}`, `translate(${lerp(bx, sx, fly).toFixed(1)},${lerp(by, sy, fly * fly).toFixed(1)}) scale(${(pop * lerp(1, 0.12, fly)).toFixed(3)}) rotate(${(Math.sin(t * 1.7 + i) * 6 + fly * 200).toFixed(1)})`);
      op(`w${i}`, t < a ? 0 : 1 - seg(fly, 0.9, 1));
    }
    tf("bag-glow", `translate(${sx.toFixed(1)},${sy}) scale(${(1 + Math.sin(t * 7) * 0.12).toFixed(2)})`);
    op("bag-glow", window_(t, 77.6, 81, 0.6));

    // ---------- dymki ----------
    for (const b of BUBBLES) {
      const k = window_(t, b.from, b.to, 0.28);
      let x = ex - cam + 30, y = GROUND - 345 + kneel * 84 - hop;
      if (b.anchor === "squirrel") { x = SQUIRREL_TREE_X - 150 - cam; y = 236; }
      if (b.anchor === "hedgehog") { x = hx - cam + 10; y = GROUND - 130; }
      if (b.anchor === "stream") { x = STREAM_X + 110 - cam; y = GROUND - 80; }
      tf(b.id, `translate(${clamp(x, 220, W - 220).toFixed(1)},${y.toFixed(1)}) scale(${bounceOut(k).toFixed(3)})`);
      op(b.id, k > 0 ? 1 : 0);
    }

    // ---------- tytuł ----------
    const out = 1 - seg(t, 5.5, 6.4);
    op("title", out);
    tf("title-1", `translate(0,${lerp(-520, 0, bounceOut(seg(t, 0.35, 1.7))).toFixed(1)}) rotate(-3,800,330)`);
    tf("title-2", `translate(0,${lerp(-620, 0, bounceOut(seg(t, 0.7, 2.1))).toFixed(1)}) rotate(2,800,470)`);
    op("title-3", seg(t, 2.2, 3));

    // ---------- napisy i pasek postępu ----------
    const ci = CAPTIONS.findIndex((c) => t >= c.from && t < c.to);
    if (ci !== captionRef.current) { captionRef.current = ci; setCaption(ci); }
    if (Math.floor(t) !== secondRef.current) { secondRef.current = Math.floor(t); setSecond(secondRef.current); }
    if (bar.current) bar.current.style.width = `${(clamp(t / DURATION) * 100).toFixed(2)}%`;
  }, [flies]);

  // pętla animacji
  useEffect(() => {
    frame(time.current);
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time.current += dt;
      if (time.current >= DURATION) {
        time.current = DURATION;
        frame(DURATION);
        setPlaying(false);
        setEnded(true);
        sound.current?.stop();
        return;
      }
      frame(time.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onHide = () => { if (document.hidden) { setPlaying(false); sound.current?.stop(); } };
    document.addEventListener("visibilitychange", onHide);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onHide); };
  }, [playing, frame]);

  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    for (const p of Object.keys(ELOFIK_SPRITES) as ElofikSprite[]) new Image().src = spriteUrl(p);
  }, []);

  const play = useCallback((from?: number) => {
    if (from !== undefined) time.current = from;
    if (time.current >= DURATION - 0.05) time.current = 0;
    setEnded(false);
    setStarted(true);
    setPlaying(true);
    if (!muted) {
      sound.current ??= new FilmSound();
      sound.current.start(time.current);
    }
  }, [muted]);

  const pause = useCallback(() => { setPlaying(false); sound.current?.stop(); }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    if (m) sound.current?.stop();
    else if (playing) { sound.current ??= new FilmSound(); sound.current.start(time.current); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    time.current = clamp((e.clientX - r.left) / r.width) * DURATION;
    setEnded(false);
    frame(time.current);
    if (playing && !muted) sound.current?.start(time.current);
  };

  const showEnd = ended;

  return (
    <div className={cn("@container", className)}>
    <div ref={wrap} className={cn("film-root relative w-full overflow-hidden rounded-[2rem] bg-[#223058] shadow-[0_0_0_4px_#fff6e6,0_0_0_7px_#3b2a1f,0_12px_0_7px_rgb(20_26_50/0.25)]", !playing && "film-paused")} style={{ aspectRatio: "16 / 9" }}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Film animowany: Elofik i tajemniczy ślad" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">
            <stop id="sky-a" offset="0%" stopColor="#bfdcf3" />
            <stop id="sky-b" offset="100%" stopColor="#fdf1dc" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6c9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffe9a3" stopOpacity="0" />
          </radialGradient>
          <clipPath id="sq-clip"><rect x={SQUIRREL_TREE_X - 400} y={150} width={344} height={300} /></clipPath>
        </defs>

        <rect width={W} height={H} fill="url(#skyg)" />
        <g id="stars">{stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fffbe6" className="film-tip" style={{ animationDelay: `${s.k}s` }} />)}</g>
        <g id="sun"><circle r={92} fill="#fff3c4" opacity={0.5} /><circle r={62} fill="#ffe08a" /></g>
        <g id="moon" opacity={0}><circle r={56} fill="#fff6d8" /><circle cx={22} cy={-12} r={48} fill="#6f77c2" opacity={0.9} /></g>
        {/* chmury z papieru */}
        <g opacity={0.9}>
          {[[180, 150, 1], [760, 90, 0.8], [1260, 190, 1.1]].map(([x, y, s], i) => (
            <g key={i} className="film-cloud" style={{ animationDelay: `${i * -7}s` }} transform={`translate(${x},${y}) scale(${s})`}>
              <ellipse cx={0} cy={0} rx={90} ry={30} fill="#fff" /><circle cx={-40} cy={-18} r={34} fill="#fff" /><circle cx={14} cy={-30} r={44} fill="#fff" /><circle cx={58} cy={-10} r={28} fill="#fff" />
            </g>
          ))}
        </g>

        <g id="L1"><FarHills layer={1} /></g>
        <g id="L2"><FarHills layer={2} /></g>
        <g id="L3"><MidForest /></g>
        <g id="L4">
          <MainStage />
          {FOOTPRINTS.map((f, i) => (
            <g key={i} id={`fp${i}`} opacity={0}>
              <g transform="scale(1.7)" fill="#eef2ff" stroke="#93a6e6" strokeWidth={1.6}>
                <ellipse cx={0} cy={0} rx={9} ry={6.5} /><circle cx={-8} cy={-10} r={3.2} /><circle cx={0} cy={-12.5} r={3.2} /><circle cx={8} cy={-10} r={3.2} />
              </g>
              <path className="film-tip" d="M30,-34 l3,8 8,3 -8,3 -3,8 -3,-8 -8,-3 8,-3 z" fill="#ffffff" stroke="#93a6e6" strokeWidth={1} />
            </g>
          ))}
          {Array.from({ length: 6 }, (_, i) => <circle key={i} id={`bl${i}`} r={11} fill="#ffffff" stroke="#8fcbe6" strokeWidth={3} opacity={0} />)}
          <g clipPath="url(#sq-clip)"><g id="sq-pos"><SquirrelPuppet /></g></g>
          <g id="stone"><Stone /></g>
          <ElofikPuppet />
        </g>
        <g id="L5"><Foreground /></g>

        {/* światło pory dnia: mnożenie barwy na papierze */}
        <rect id="tint" width={W} height={H} fill="#ffffff" style={{ mixBlendMode: "multiply" }} />

        {/* wszystko, co świeci — ponad światłem */}
        <g id="L6">
          <g id="stone-glow" opacity={0}><ellipse cx={STONE_X + 10} cy={GROUND - 6} rx={250} ry={70} fill="url(#glow)" /><ellipse cx={STONE_X + 10} cy={GROUND + 2} rx={150} ry={16} fill="#fff6c9" /></g>
          <HedgehogPuppet id="h" />
          {[0, 1, 2].map((i) => <HedgehogPuppet key={i} id={`hf${i}`} s={0.5 + i * 0.06} />)}
          {flies.map((f, i) => <circle key={i} id={`ff${i}`} r={f.s * 3.2} fill="url(#glow)" opacity={0} />)}
          <circle id="bag-glow" r={70} fill="url(#glow)" opacity={0} />
          {WORD.split("").map((ch, i) => (
            <g key={i} id={`w${i}`} opacity={0}>
              <rect x={-27} y={-36} width={54} height={66} rx={14} fill="#3b2a1f" opacity={0.25} transform="translate(4,6)" />
              <rect x={-27} y={-36} width={54} height={66} rx={14} fill={["#ffe08a", "#f7b8c4", "#c9e7b0", "#c9b8f2"][i % 4]} />
              <text x={0} y={14} textAnchor="middle" fontSize={46} fill="#27335f" style={FONT}>{ch}</text>
            </g>
          ))}
        </g>

        {/* dymki (w układzie ekranu) */}
        {BUBBLES.map((b) => {
          const w = b.text.length * 17.5 + 56;
          return (
            <g key={b.id} id={b.id} opacity={0}>
              <path d="M-14,-20 L0,6 L18,-20 Z" fill="#3b2a1f" opacity={0.22} transform="translate(5,7)" />
              <rect x={-w / 2} y={-92} width={w} height={74} rx={30} fill="#3b2a1f" opacity={0.22} transform="translate(5,7)" />
              <path d="M-14,-22 L0,4 L18,-22 Z" fill="#fffdf6" />
              <rect x={-w / 2} y={-92} width={w} height={74} rx={30} fill="#fffdf6" />
              <text x={0} y={-43} textAnchor="middle" fontSize={34} fill="#27335f" style={FONT}>{b.text}</text>
            </g>
          );
        })}

        {/* tytuł */}
        <g id="title" opacity={0}>
          <g id="title-1">
            <text x={806} y={372} textAnchor="middle" fontSize={190} fill="#3b2a1f" opacity={0.3} style={{ ...FONT, fontWeight: 800 }}>Elofik</text>
            <text x={800} y={364} textAnchor="middle" fontSize={190} fill="#fffdf6" stroke="#27335f" strokeWidth={10} paintOrder="stroke" style={{ ...FONT, fontWeight: 800 }}>Elofik</text>
          </g>
          <g id="title-2">
            <rect x={380} y={410} width={840} height={110} rx={55} fill="#3b2a1f" opacity={0.25} transform="translate(6,8)" />
            <rect x={380} y={410} width={840} height={110} rx={55} fill="#ffe08a" />
            <text x={800} y={488} textAnchor="middle" fontSize={70} fill="#27335f" style={FONT}>i tajemniczy ślad</text>
          </g>
          <text id="title-3" x={800} y={585} textAnchor="middle" fontSize={30} fill="#27335f" opacity={0} style={{ ...FONT, fontWeight: 600, letterSpacing: "0.2em" }}>KRÓTKI FILM</text>
        </g>
      </svg>

      {/* napisy */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6.5%] flex justify-center px-[2%] @max-[620px]:hidden">
        {caption >= 0 && !showEnd && (
          <p key={caption} className="film-caption max-w-[96%] rounded-[1.2em] bg-[#fffdf6]/95 px-[1em] py-[0.35em] text-center font-display font-semibold leading-tight text-navy shadow-[0_0.2em_0_rgb(59_42_31/0.25)]" style={{ fontSize: "clamp(10px, 1.62cqw, 22px)" }}>
            {CAPTIONS[caption].text}
          </p>
        )}
      </div>

      {/* plansza końcowa */}
      {showEnd && (
        <div className="film-caption absolute inset-0 flex flex-col items-center justify-center gap-[2.2cqw] bg-[#223058]/80 px-[6%] text-center">
          <p className="font-display font-bold uppercase tracking-[0.2em] text-gold" style={{ fontSize: "clamp(10px, 1.6cqw, 20px)" }}>Słowo dnia</p>
          <p className="font-display font-bold text-cream" style={{ fontSize: "clamp(22px, 5.4cqw, 72px)", lineHeight: 1.05 }}>dociekliwość</p>
          <p className="max-w-[70%] text-cream/90" style={{ fontSize: "clamp(11px, 1.9cqw, 24px)" }}>to chęć, żeby dowiedzieć się, jak coś naprawdę jest — zadawanie pytań i szukanie odpowiedzi.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-display font-semibold text-navy shadow-[inset_0_0_0_2.5px_#3b2a1f,0_4px_0_#3b2a1f]" data-testid="film-cta"><Headphones className="h-5 w-5" /> Posłuchaj całej bajki z imieniem dziecka</Link>
            <button type="button" onClick={() => play(0)} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 font-display font-semibold text-cream"><RotateCcw className="h-4 w-4" /> Jeszcze raz</button>
          </div>
        </div>
      )}

      {/* start */}
      {!started && (
        <button type="button" onClick={() => play(0)} className="absolute inset-0 flex items-end justify-center pb-[9%]" aria-label="Odtwórz film" data-testid="film-play">
          <span className="flex items-center gap-3 rounded-full bg-gold px-7 py-4 font-display text-lg font-semibold text-navy shadow-[inset_0_0_0_2.5px_#3b2a1f,0_5px_0_#3b2a1f] transition active:translate-y-[3px]">
            <Play className="h-6 w-6" /> Obejrzyj film · 1 min 24 s
          </span>
        </button>
      )}

      {/* sterowanie */}
      {started && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-[#141a32]/70 to-transparent px-3 pb-2 pt-6 text-cream">
          <button type="button" onClick={() => (playing ? pause() : play())} aria-label={playing ? "Pauza" : "Odtwórz"} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 hover:bg-white/25" data-testid="film-toggle">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="relative h-2.5 flex-1 cursor-pointer rounded-full bg-white/25" onClick={seek} role="slider" aria-label="Pozycja filmu" aria-valuemin={0} aria-valuemax={DURATION} aria-valuenow={second} tabIndex={0}
            onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { time.current = clamp(time.current + (e.key === "ArrowRight" ? 5 : -5), 0, DURATION); frame(time.current); if (playing && !muted) sound.current?.start(time.current); } }}>
            <div ref={bar} className="absolute inset-y-0 left-0 rounded-full bg-gold" />
          </div>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Włącz dźwięk" : "Wycisz"} aria-pressed={muted} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen?.())} aria-label="Pełny ekran" className="hidden h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 hover:bg-white/25 sm:flex">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
      {/* na telefonie napisy pod filmem — nie zasłaniają sceny */}
      <p className="mt-3 min-h-[4.5em] px-2 text-center font-display text-[15px] font-semibold leading-snug text-navy @min-[620px]:hidden" aria-live="off">
        {caption >= 0 && !showEnd ? CAPTIONS[caption].text : ""}
      </p>
    </div>
  );
}