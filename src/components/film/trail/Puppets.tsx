/**
 * Postacie filmu. Elofik to grafiki marki z serwisu (public/brand/elofik/emocje) — silnik filmu
 * podmienia pozę zależnie od sceny i animuje ją (chód, podskok, przechył).
 * Jeżyk i wiewiórka są rysowane kodem w tym samym stylu płaskiej kreskówki z konturem.
 */

/** Pozy Elofika: szerokość przy wysokości 360 px oraz skala (pozy kucające są niższe). */
export const ELOFIK_SPRITES = {
  hello: { w: 246, k: 1 },
  confident: { w: 205, k: 1 },
  thinking: { w: 206, k: 1 },
  idea: { w: 220, k: 1.04 },
  surprised: { w: 219, k: 1 },
  worried: { w: 223, k: 1 },
  jumping: { w: 265, k: 1 },
  detective: { w: 296, k: 0.74 },
  wink: { w: 282, k: 1 },
  love: { w: 259, k: 1 },
} as const;
export type ElofikSprite = keyof typeof ELOFIK_SPRITES;
export const spriteUrl = (p: ElofikSprite) => `/brand/elofik/emocje/${p}.webp`;

export function ElofikPuppet() {
  return (
    <g id="e" opacity={0}>
      <ellipse id="e-shadow" cx={0} cy={2} rx={82} ry={12} fill="#27335f" opacity={0.18} />
      <g id="e-body">
        <image id="e-img" href={spriteUrl("hello")} x={-109} y={-318} width={218} height={318} preserveAspectRatio="xMidYMax meet" />
      </g>
    </g>
  );
}

/** Jeżyk-świetlik: na końcu każdego kolca iskierka (klasa film-tip = migotanie). */
export function HedgehogPuppet({ id, s = 1 }: { id: string; s?: number }) {
  const spikes = Array.from({ length: 9 }, (_, i) => {
    const a = (Math.PI * (i + 0.5)) / 9;
    return { x: -Math.cos(a) * 58 + 8, y: -Math.sin(a) * 62 - 26, a: (a * 180) / Math.PI - 90 };
  });
  return (
    <g id={id} opacity={0}>
      <g transform={`scale(${s})`} className="film-ink">
        <ellipse className="film-noink" cx={0} cy={2} rx={58} ry={8} fill="#27335f" opacity={0.16} />
        {spikes.map((p, i) => <path key={i} d="M-11,0 L0,-34 L11,0 Z" fill={i % 2 ? "#8a6247" : "#9d7354"} transform={`translate(${p.x * 0.72},${p.y * 0.72 + 2}) rotate(${p.a})`} />)}
        <path d="M-52,0 Q-56,-58 8,-60 Q62,-58 60,0 Z" fill="#b08462" />
        <path d="M-52,0 Q-88,-6 -98,-22 Q-74,-46 -40,-38 Q-30,-14 -52,0 Z" fill="#f6e3c8" />
        <circle cx={-98} cy={-22} r={6} fill="#3b2a1f" />
        <circle cx={-62} cy={-30} r={5} fill="#3b2a1f" /><circle cx={-60.5} cy={-31.5} r={1.6} fill="#fff" />
        <path d="M-80,-12 q8,6 16,0" stroke="#3b2a1f" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <ellipse cx={-22} cy={0} rx={10} ry={5} fill="#8a6247" /><ellipse cx={30} cy={0} rx={10} ry={5} fill="#8a6247" />
        {spikes.map((p, i) => (
          <g key={`t${i}`} className="film-tip film-noink" style={{ animationDelay: `${(i * 0.37) % 1.6}s` }}>
            <circle cx={p.x} cy={p.y} r={13} fill="#ffe9a3" opacity={0.35} />
            <circle cx={p.x} cy={p.y} r={5.5} fill="#fff6c9" />
          </g>
        ))}
      </g>
    </g>
  );
}

export function SquirrelPuppet() {
  return (
    <g id="sq" className="film-ink">
      <g id="sq-tail"><path d="M10,-6 Q62,-20 54,-78 Q46,-112 14,-98 Q40,-84 26,-52 Q18,-30 10,-6 Z" fill="#e39a5c" /></g>
      <ellipse cx={0} cy={-26} rx={22} ry={28} fill="#d98848" />
      <ellipse cx={-6} cy={-22} rx={11} ry={17} fill="#f6dcc0" />
      <circle cx={-10} cy={-62} r={20} fill="#d98848" />
      <path d="M-22,-76 L-20,-96 L-8,-80 Z M0,-80 L8,-98 L14,-76 Z" fill="#d98848" />
      <circle cx={-18} cy={-64} r={4.5} fill="#3b2a1f" /><circle cx={-19.5} cy={-65.5} r={1.5} fill="#fff" />
      <circle cx={-30} cy={-58} r={3.5} fill="#3b2a1f" />
      <ellipse cx={-20} cy={-30} rx={7} ry={5} fill="#c2743a" />
    </g>
  );
}
