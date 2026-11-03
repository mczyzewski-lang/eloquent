/**
 * Elofik — mały elf opowieści. Wektorowa maskotka zgodna z character sheet (docs/BRAND.md):
 * wyraźne, delikatnie spiczaste (ale niedługie) uszy, łagodne brązowe oczy, potargane karmelowe włosy,
 * szałwiowy sweterek, brązowe buciki, torba na słowa z ciepłym, złotym blaskiem. Zero motywów świątecznych.
 */
import { cn } from "@/lib/utils";

export type ElofikMood = "idle" | "listening" | "happy" | "waving" | "telling" | "sleepy";

export function Elofik({ mood = "idle", className, title = "Elofik, mały elf opowieści" }: { mood?: ElofikMood; className?: string; title?: string }) {
  const happy = mood === "happy" || mood === "waving";
  const sleepy = mood === "sleepy";
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label={title} className={cn(`mood-${mood}`, "h-auto w-full overflow-visible", className)}>
      <defs>
        <radialGradient id="elo-skin" cx="45%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FBDDC2" />
          <stop offset="100%" stopColor="#EDBB94" />
        </radialGradient>
        <linearGradient id="elo-sweater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9C4A5" />
          <stop offset="100%" stopColor="#7FA07F" />
        </linearGradient>
        <linearGradient id="elo-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C98A58" />
          <stop offset="100%" stopColor="#9E6238" />
        </linearGradient>
        <radialGradient id="elo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE7A8" stopOpacity="1" />
          <stop offset="100%" stopColor="#F6C76D" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="290" rx="62" ry="8" fill="#26344A" opacity="0.12" />

      <g className="elofik-body-all">
        {/* buciki */}
        <rect x="88" y="254" width="28" height="30" rx="13" fill="#8A5A3B" />
        <rect x="124" y="254" width="28" height="30" rx="13" fill="#8A5A3B" />
        <ellipse cx="100" cy="281" rx="17" ry="7" fill="#6E4329" />
        <ellipse cx="140" cy="281" rx="17" ry="7" fill="#6E4329" />

        {/* lewa ręka */}
        <path d="M70 196 Q52 222 60 248" stroke="url(#elo-sweater)" strokeWidth="20" strokeLinecap="round" fill="none" />
        <circle cx="61" cy="250" r="10" fill="url(#elo-skin)" />

        {/* sweterek */}
        <path d="M66 200 Q70 172 120 168 Q170 172 174 200 L178 252 Q120 270 62 252 Z" fill="url(#elo-sweater)" />
        <path d="M64 246 Q120 262 176 246" stroke="#6F9270" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
        {[84, 98, 112, 126, 140, 154].map((x) => (
          <line key={x} x1={x} y1="250" x2={x + 1} y2="259" stroke="#6F9270" strokeWidth="2" opacity="0.5" />
        ))}
        <path d="M100 172 Q120 186 140 172" stroke="#8DAE8B" strokeWidth="7" fill="none" strokeLinecap="round" />

        {/* pasek i torba na słowa */}
        <path d="M150 176 Q120 214 84 236" stroke="#8A5A3B" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="84" cy="240" r="26" fill="url(#elo-glow)" opacity="0.9" />
        <rect x="68" y="228" width="34" height="28" rx="9" fill="#A86E45" />
        <path d="M68 238 Q85 246 102 238" stroke="#8A5A3B" strokeWidth="3" fill="none" />
        <path d="M85 231 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7z" fill="#F6C76D" />

        {/* prawa ręka (macha) */}
        {mood === "waving" ? (
          // ręka uniesiona, macha sama dłoń (obrót wokół nadgarstka) — ramię pozostaje nieruchome
          <g>
            <path d="M168 198 Q198 194 200 162" stroke="url(#elo-sweater)" strokeWidth="20" strokeLinecap="round" fill="none" />
            <g className="elofik-hand-wave">
              <ellipse cx="201" cy="146" rx="10" ry="12.5" fill="url(#elo-skin)" />
              <ellipse cx="190.5" cy="152" rx="4" ry="6.5" transform="rotate(-38 190.5 152)" fill="url(#elo-skin)" />
              <path d="M197 136 L197 141 M201.5 134.5 L201.5 140 M206 136 L206 141" stroke="#E3A27C" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
        ) : (
          <g className="elofik-arm-r">
            <path d="M170 196 Q190 220 182 246" stroke="url(#elo-sweater)" strokeWidth="20" strokeLinecap="round" fill="none" />
            <circle cx="181" cy="248" r="10" fill="url(#elo-skin)" />
          </g>
        )}

        {/* głowa */}
        <g className="elofik-head">
          <g className="elofik-ear-l">
            <path d="M70 98 Q44 92 34 80 Q40 108 70 138 Z" fill="url(#elo-skin)" />
            <path d="M66 104 Q50 98 44 90 Q48 108 66 128 Z" fill="#F3A8A0" opacity="0.55" />
          </g>
          <g className="elofik-ear-r">
            <path d="M170 98 Q196 92 206 80 Q200 108 170 138 Z" fill="url(#elo-skin)" />
            <path d="M174 104 Q190 98 196 90 Q192 108 174 128 Z" fill="#F3A8A0" opacity="0.55" />
          </g>

          <circle cx="120" cy="118" r="60" fill="url(#elo-skin)" />

          {/* włosy — miękkie, lekko potargane */}
          <path
            d="M62 112 Q58 70 92 58 Q100 40 122 46 Q140 36 154 52 Q184 58 180 104 Q170 86 156 84 Q160 96 150 100 Q144 82 128 80 Q126 94 114 96 Q112 82 98 82 Q92 96 80 98 Q78 88 72 90 Q66 98 62 112 Z"
            fill="url(#elo-hair)"
          />
          <path d="M116 50 Q112 34 124 26 Q122 38 130 44" fill="url(#elo-hair)" />
          <path d="M96 66 Q108 60 118 64" stroke="#E0A673" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />

          {/* brwi */}
          <path d="M88 108 Q98 102 108 107" stroke="#9E6238" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M132 107 Q142 102 152 108" stroke="#9E6238" strokeWidth="3.5" fill="none" strokeLinecap="round" />

          {/* oczy */}
          {sleepy ? (
            <>
              <path d="M88 128 Q98 134 108 128" stroke="#3B2A22" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M132 128 Q142 134 152 128" stroke="#3B2A22" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          ) : happy ? (
            <>
              <path d="M87 130 Q98 116 109 130" stroke="#3B2A22" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M131 130 Q142 116 153 130" stroke="#3B2A22" strokeWidth="5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <g className="elofik-blink">
              <ellipse cx="98" cy="128" rx="11" ry="13" fill="#4A2F22" />
              <ellipse cx="142" cy="128" rx="11" ry="13" fill="#4A2F22" />
              <ellipse cx="98" cy="129" rx="6.5" ry="8" fill="#7A4B32" />
              <ellipse cx="142" cy="129" rx="6.5" ry="8" fill="#7A4B32" />
              <circle cx="102" cy="122" r="4" fill="white" />
              <circle cx="146" cy="122" r="4" fill="white" />
              <circle cx="95" cy="133" r="1.8" fill="white" opacity="0.8" />
              <circle cx="139" cy="133" r="1.8" fill="white" opacity="0.8" />
            </g>
          )}

          {/* policzki, nos, usta */}
          <ellipse cx="82" cy="148" rx="10" ry="6" fill="#F39C8F" opacity="0.45" />
          <ellipse cx="158" cy="148" rx="10" ry="6" fill="#F39C8F" opacity="0.45" />
          <ellipse cx="120" cy="142" rx="5" ry="3.6" fill="#E3A27C" />
          {happy || mood === "telling" ? (
            <path className="elofik-mouth" d="M104 154 Q120 174 136 154 Q120 160 104 154 Z" fill="#B5524A" />
          ) : (
            <path className="elofik-mouth" d="M106 155 Q120 166 134 155" stroke="#B5524A" strokeWidth="4" fill="none" strokeLinecap="round" />
          )}
        </g>
      </g>
    </svg>
  );
}

export function Sparkles({ className, count = 7 }: { className?: string; count?: number }) {
  const pts = [
    [8, 20], [88, 12], [18, 72], [92, 64], [50, 4], [70, 88], [30, 40], [96, 36], [4, 50],
  ].slice(0, count);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {pts.map(([x, y], i) => (
        <svg key={i} viewBox="0 0 20 20" className="absolute h-4 w-4 animate-twinkle text-gold" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.35}s` }}>
          <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

export { Logo } from "./Logo";
