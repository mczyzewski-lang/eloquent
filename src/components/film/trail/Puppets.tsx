/**
 * Papierowe lalki. Części ciała mają identyfikatory — silnik filmu (TrailFilm) ustawia im
 * obroty i przesunięcia w każdej klatce. Układ lokalny: stopy w punkcie (0,0), oś Y w górę ujemna.
 * Elofik zgodny z wizerunkiem marki: rude włosy z loczkiem, piegi, długie spiczaste uszy,
 * zielona tunika z listkiem, beżowe spodnie, brązowe buty z kremowym mankietem, torba, granatowa książka.
 */
const SKIN = "#f7cfa4";
const HAIR = "#d97a2e";
const HAIR_D = "#b85f1f";
const TUNIC = "#86b356";
const TUNIC_D = "#6f9a45";
const INK = "#3b2a1f";

export function ElofikPuppet() {
  return (
    <g id="e" opacity={0}>
      <ellipse id="e-shadow" cx={0} cy={4} rx={64} ry={10} fill="#27335f" opacity={0.16} />
      <g id="e-flip">
        <g id="e-body">
          {/* ręka z tyłu — trzyma książkę */}
          <g id="e-arm-back" transform="translate(-34,-142)">
            <rect x={-11} y={0} width={22} height={62} rx={11} fill={TUNIC_D} />
            <g id="e-book" transform="translate(-6,70) rotate(14)">
              <rect x={-22} y={-26} width={44} height={54} rx={5} fill="#2f3f73" />
              <rect x={-22} y={-26} width={8} height={54} rx={3} fill="#f6c34d" />
              <path d="M4,-10 L7,-2 L15,1 L7,4 L4,12 L1,4 L-7,1 L1,-2 Z" fill="#f6c34d" />
            </g>
            <circle cx={0} cy={66} r={12} fill={SKIN} />
          </g>
          {/* nogi */}
          <g id="e-leg-back" transform="translate(-18,-66)">
            <rect x={-13} y={0} width={26} height={48} rx={8} fill="#d9b67c" />
            <rect x={-15} y={38} width={30} height={12} rx={5} fill="#f5e6c8" />
            <path d="M-15,48 H15 Q30,50 30,62 Q30,68 22,68 H-15 Z" fill="#8a5a36" />
          </g>
          <g id="e-leg-front" transform="translate(16,-66)">
            <rect x={-13} y={0} width={26} height={48} rx={8} fill="#e6c48c" />
            <rect x={-15} y={38} width={30} height={12} rx={5} fill="#fff1d6" />
            <path d="M-15,48 H15 Q30,50 30,62 Q30,68 22,68 H-15 Z" fill="#9a6640" />
          </g>
          {/* tunika z kapturem i listkiem */}
          <path d="M-44,-150 Q0,-166 44,-150 L60,-58 Q0,-44 -60,-58 Z" fill={TUNIC} />
          <path d="M-60,-58 Q0,-44 60,-58 L58,-70 Q0,-56 -58,-70 Z" fill={TUNIC_D} />
          <path d="M-40,-150 Q0,-124 40,-150 Q22,-168 0,-166 Q-22,-168 -40,-150 Z" fill={TUNIC_D} />
          <path d="M-8,-112 q-12,-14 0,-26 q4,12 0,26 M8,-112 q12,-14 0,-26 q-4,12 0,26" fill="#dfeab2" />
          <circle cx={0} cy={-146} r={6} fill="#f6c34d" />
          {/* pasek torby i torba */}
          <path d="M-34,-150 L46,-84" stroke="#8a5a36" strokeWidth={8} strokeLinecap="round" />
          <g id="e-satchel" transform="translate(44,-80)">
            <rect x={-20} y={-6} width={40} height={34} rx={9} fill="#9a6a42" />
            <path d="M-20,-2 Q0,18 20,-2 V-6 H-20 Z" fill="#b07a4c" />
            <circle cx={0} cy={8} r={5} fill="#f6c34d" />
          </g>
          {/* głowa */}
          <g id="e-head" transform="translate(0,-208)">
            <g id="e-ear-l"><path d="M-46,4 L-120,-22 Q-96,22 -44,30 Z" fill={SKIN} /><path d="M-56,6 L-102,-10 Q-86,16 -54,22 Z" fill="#f3b48f" /></g>
            <g id="e-ear-r"><path d="M46,4 L120,-22 Q96,22 44,30 Z" fill={SKIN} /><path d="M56,6 L102,-10 Q86,16 54,22 Z" fill="#f3b48f" /></g>
            <circle r={60} fill={SKIN} />
            {/* włosy: czupryna z loczkiem i grzywką */}
            <path d="M-62,-6 Q-74,-58 -30,-70 Q-6,-92 30,-74 Q70,-64 64,-8 Q52,-34 30,-30 Q22,-10 4,-34 Q-6,-8 -26,-30 Q-44,-28 -62,-6 Z" fill={HAIR} />
            <path d="M-4,-78 Q-10,-106 16,-104 Q30,-102 26,-88 Q18,-96 10,-90 Q6,-84 12,-74 Z" fill={HAIR} />
            <path d="M-30,-70 Q-10,-64 4,-34 Q-2,-58 -30,-70 Z M30,-74 Q26,-50 30,-30 Q40,-54 30,-74 Z" fill={HAIR_D} />
            {/* twarz */}
            <g id="e-eyes">
              <circle cx={-22} cy={2} r={12} fill={INK} /><circle cx={22} cy={2} r={12} fill={INK} />
              <circle cx={-18} cy={-3} r={4.5} fill="#fff" /><circle cx={26} cy={-3} r={4.5} fill="#fff" />
            </g>
            <path d="M-36,-16 q14,-10 26,-2 M12,-18 q14,-8 26,2" stroke={HAIR_D} strokeWidth={5} strokeLinecap="round" fill="none" />
            <circle cx={-38} cy={22} r={10} fill="#f6a98f" opacity={0.7} /><circle cx={38} cy={22} r={10} fill="#f6a98f" opacity={0.7} />
            {[-44, -36, -40, 36, 44, 40].map((x, i) => <circle key={i} cx={x} cy={i % 3 === 2 ? 14 : 20} r={1.8} fill="#d98a5c" />)}
            <circle cx={0} cy={14} r={5} fill="#eeb38c" />
            <path id="e-smile" d="M-16,28 Q0,46 16,28 Q0,36 -16,28 Z" fill="#c6574a" />
            <ellipse id="e-oh" cx={0} cy={34} rx={8} ry={10} fill="#c6574a" opacity={0} />
          </g>
          {/* ręka z przodu (gesty) */}
          <g id="e-arm-front" transform="translate(36,-142)">
            <rect x={-11} y={0} width={22} height={62} rx={11} fill={TUNIC} />
            <circle cx={0} cy={66} r={12} fill={SKIN} />
          </g>
        </g>
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
      <g transform={`scale(${s})`}>
        <ellipse cx={0} cy={2} rx={58} ry={8} fill="#27335f" opacity={0.16} />
        {spikes.map((p, i) => <path key={i} d="M-11,0 L0,-34 L11,0 Z" fill={i % 2 ? "#8a6247" : "#9d7354"} transform={`translate(${p.x * 0.72},${p.y * 0.72 + 2}) rotate(${p.a})`} />)}
        <path d="M-52,0 Q-56,-58 8,-60 Q62,-58 60,0 Z" fill="#b08462" />
        <path d="M-52,0 Q-88,-6 -98,-22 Q-74,-46 -40,-38 Q-30,-14 -52,0 Z" fill="#f6e3c8" />
        <circle cx={-98} cy={-22} r={6} fill="#3b2a1f" />
        <circle cx={-62} cy={-30} r={5} fill="#3b2a1f" /><circle cx={-60.5} cy={-31.5} r={1.6} fill="#fff" />
        <path d="M-80,-12 q8,6 16,0" stroke="#3b2a1f" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <ellipse cx={-22} cy={0} rx={10} ry={5} fill="#8a6247" /><ellipse cx={30} cy={0} rx={10} ry={5} fill="#8a6247" />
        {spikes.map((p, i) => (
          <g key={`t${i}`} className="film-tip" style={{ animationDelay: `${(i * 0.37) % 1.6}s` }}>
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
    <g id="sq">
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
