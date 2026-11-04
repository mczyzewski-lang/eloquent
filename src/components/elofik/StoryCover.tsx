/**
 * Okładka bajki: ilustracja bazowa (wspólna dla wszystkich rodzin) + imię dziecka jako warstwa tekstowa w UI.
 * Nigdy nie generujemy osobnej grafiki dla imienia.
 */
import { Elofik } from "./Elofik";
import { cn } from "@/lib/utils";

const SCENES = [
  { sky: ["#FDE9C9", "#F8DDD0"], ground: "#9DB89A", accent: "#F6C76D", kind: "forest" },
  { sky: ["#DDEFE9", "#FFF4E2"], ground: "#6FB7B0", accent: "#F6C76D", kind: "stream" },
  { sky: ["#E9E4F5", "#FDE6DA"], ground: "#A9C4A5", accent: "#F8DDD0", kind: "cloud" },
  { sky: ["#FBE3D3", "#FFF4E2"], ground: "#9DB89A", accent: "#F6C76D", kind: "music" },
  { sky: ["#E7F1DA", "#FFF4E2"], ground: "#7FA07F", accent: "#F6C76D", kind: "leaf" },
  { sky: ["#DDEFF5", "#FDF2E4"], ground: "#F1D9A8", accent: "#6FB7B0", kind: "shells" },
  { sky: ["#26344A", "#3A4B66"], ground: "#1D2738", accent: "#F6C76D", kind: "stars" },
] as const;

export function sceneFor(day: number) {
  return SCENES[(Math.max(1, day) - 1) % SCENES.length];
}

function SceneArt({ kind, accent, ground }: { kind: string; accent: string; ground: string }) {
  switch (kind) {
    case "forest":
      return (
        <g>
          {[30, 70, 250, 290].map((x, i) => (
            <g key={x}>
              <rect x={x - 5} y={140 - (i % 2) * 20} width="10" height="70" fill="#8A5A3B" opacity="0.6" />
              <circle cx={x} cy={130 - (i % 2) * 20} r={i % 2 ? 34 : 28} fill="#7FA07F" opacity="0.8" />
            </g>
          ))}
          {[120, 140, 160, 182, 204].map((x, i) => (
            <circle key={x} cx={x} cy={222 - i * 3} r="3.5" fill="#E8EEF6" stroke={accent} strokeWidth="1.5" />
          ))}
        </g>
      );
    case "stream":
      return (
        <g>
          <path d="M0 200 Q80 180 160 205 T320 195 L320 240 L0 240Z" fill="#9FD3CC" />
          {[70, 110, 150, 190, 230].map((x) => (
            <ellipse key={x} cx={x} cy={205} rx="14" ry="6" fill="#C9BBA8" />
          ))}
        </g>
      );
    case "cloud":
      return (
        <g>
          <g fill="white" opacity="0.95">
            <circle cx="230" cy="60" r="22" />
            <circle cx="252" cy="66" r="18" />
            <circle cx="210" cy="68" r="16" />
          </g>
          <path d="M40 150 A140 140 0 0 1 300 150" stroke="#F39C8F" strokeWidth="6" fill="none" opacity="0.5" />
          <path d="M50 150 A130 130 0 0 1 290 150" stroke={accent} strokeWidth="6" fill="none" opacity="0.6" />
          <path d="M60 150 A120 120 0 0 1 280 150" stroke="#6FB7B0" strokeWidth="6" fill="none" opacity="0.5" />
        </g>
      );
    case "music":
      return (
        <g fill={accent}>
          {[[60, 70], [250, 50], [270, 120], [40, 130]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r="7" />
              <rect x="5" y="-26" width="3" height="26" />
            </g>
          ))}
        </g>
      );
    case "leaf":
      return <path d="M200 110 Q290 90 300 190 Q220 200 200 110Z" fill="#7FA07F" stroke="#6F9270" strokeWidth="3" />;
    case "shells":
      return (
        <g>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={240 + Math.cos(a) * 40} cy={190 + Math.sin(a) * 14} r="6" fill={i === 3 ? "#F39C8F" : "#FBEFDC"} stroke="#C9BBA8" />;
          })}
        </g>
      );
    case "stars":
      return (
        <g fill={accent}>
          {[[40, 40], [90, 80], [260, 40], [220, 100], [290, 140], [150, 30], [30, 120]].map(([x, y], i) => (
            <path key={i} transform={`translate(${x} ${y}) scale(${i % 3 === 0 ? 1.2 : 0.7})`} d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" />
          ))}
          <circle cx="270" cy="60" r="18" fill="#FFF4E2" opacity="0.9" />
        </g>
      );
    default:
      return <rect width="1" height="1" fill={ground} />;
  }
}

export function StoryCover({
  day,
  title,
  word,
  childName,
  className,
  compact = false,
  imageUrl,
}: {
  /** Okładka wygenerowana w panelu (OpenAI). Brak = wektorowa scena z maskotką. */
  imageUrl?: string | null;
  day: number;
  title?: string;
  word?: string;
  childName?: string;
  className?: string;
  compact?: boolean;
}) {
  const s = sceneFor(day);
  const dark = s.kind === "stars";
  return (
    <div className={cn("relative overflow-hidden rounded-[1.75rem]", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- okładka z własnego API, już zoptymalizowana (webp)
        <img src={imageUrl} alt={title ? `Ilustracja: ${title}` : ""} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
      <>
      <svg viewBox="0 0 320 240" className="block h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={`sky-${day}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.sky[0]} />
            <stop offset="100%" stopColor={s.sky[1]} />
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill={`url(#sky-${day})`} />
        <path d="M0 200 Q160 170 320 200 L320 240 L0 240Z" fill={s.ground} opacity={dark ? 0.9 : 0.55} />
        <SceneArt kind={s.kind} accent={s.accent} ground={s.ground} />
      </svg>
      <div className={cn("absolute left-1/2 -translate-x-1/2", compact || !title ? "bottom-[6%] w-[34%]" : "bottom-[22%] w-[28%]")}>
        <Elofik mood={dark ? "sleepy" : "idle"} fallback={null} />
      </div>
      </>
      )}
      {!compact && (word || childName) && (
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {word && <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy backdrop-blur">{word}</span>}
          {childName && <span className="rounded-full bg-gold/90 px-3 py-1 text-xs font-bold text-navy">dla: {childName}</span>}
        </div>
      )}
      {!compact && title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/75 to-transparent px-4 pb-3 pt-10">
          <p className="font-display text-lg font-semibold leading-tight text-cream drop-shadow">{title}</p>
        </div>
      )}
    </div>
  );
}
