/**
 * Scenografia filmu w stylu płaskiej kreskówki dla przedszkolaków: proste kształty,
 * płaskie pastelowe kolory, warstwy przesuwające się z różną prędkością (paralaksa).
 */
import { GROUND, H, MEADOW_X, OAK_X, SQUIRREL_TREE_X, STONE_X, STREAM_X, rng } from "./timeline";

/** Grupa elementów scenografii (styl płaskiej kreskówki — bez cieni i faktur). */
export function Cut({ children }: { children: React.ReactNode; dx?: number; dy?: number; o?: number }) {
  return <g>{children}</g>;
}

function hillPath(seed: number, base: number, amp: number, len: number): string {
  const r = rng(seed);
  const a = r() * 6, b = r() * 6, f1 = 420 + r() * 260, f2 = 150 + r() * 90;
  let d = `M0,${H}`;
  for (let x = 0; x <= len; x += 40) d += ` L${x},${(base - amp * (Math.sin(x / f1 + a) * 0.7 + Math.sin(x / f2 + b) * 0.3 + 0.6)).toFixed(1)}`;
  return `${d} L${len},${H} Z`;
}

function RoundTree({ x, base, s, crown, trunk }: { x: number; base: number; s: number; crown: string; trunk: string }) {
  return (
    <g transform={`translate(${x},${base}) scale(${s})`}>
      <rect x={-9} y={-120} width={18} height={124} rx={6} fill={trunk} />
      <circle cx={0} cy={-170} r={62} fill={crown} />
      <circle cx={-44} cy={-132} r={44} fill={crown} />
      <circle cx={46} cy={-136} r={48} fill={crown} />
    </g>
  );
}

function Pine({ x, base, s, fill, trunk }: { x: number; base: number; s: number; fill: string; trunk: string }) {
  return (
    <g transform={`translate(${x},${base}) scale(${s})`}>
      <rect x={-7} y={-40} width={14} height={44} fill={trunk} />
      <path d="M0,-250 L52,-150 L28,-150 L68,-80 L36,-80 L84,-30 L-84,-30 L-36,-80 L-68,-80 L-28,-150 L-52,-150 Z" fill={fill} />
    </g>
  );
}

/** Dalekie wzgórza (dwie warstwy) — rodzic przesuwa je z różną prędkością. */
export function FarHills({ layer }: { layer: 1 | 2 }) {
  return layer === 1 ? (
    <Cut dy={6} o={0.08}><path d={hillPath(11, 520, 110, 2800)} fill="#dfe9f3" /></Cut>
  ) : (
    <Cut dy={7} o={0.1}>
      <path d={hillPath(23, 600, 120, 3600)} fill="#cfe4d6" />
      {Array.from({ length: 16 }, (_, i) => <Pine key={i} x={120 + i * 215 + (i % 3) * 30} base={548 + (i % 4) * 14} s={0.42 + (i % 3) * 0.08} fill="#bcd9c8" trunk="#bcd9c8" />)}
    </Cut>
  );
}

/** Środkowy las. */
export function MidForest() {
  const r = rng(77);
  const trees = Array.from({ length: 34 }, (_, i) => ({ x: 60 + i * 140 + r() * 70, kind: r() > 0.45, s: 0.85 + r() * 0.55, c: i % 3 }));
  const crowns = ["#a9d1b0", "#b9dba6", "#9cc7b3"];
  return (
    <Cut>
      <path d={hillPath(41, 668, 46, 4700)} fill="#bfdcb4" />
      {trees.map((t, i) =>
        t.kind ? <RoundTree key={i} x={t.x} base={660} s={t.s} crown={crowns[t.c]} trunk="#c3a48c" /> : <Pine key={i} x={t.x} base={664} s={t.s} fill={crowns[(t.c + 1) % 3]} trunk="#c3a48c" />,
      )}
    </Cut>
  );
}

function Flower({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-1.5} y={0} width={3} height={26} fill="#8fbf86" />
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-9} rx={6} ry={9} fill={c} transform={`rotate(${a})`} />)}
      <circle r={5} fill="#ffe08a" />
    </g>
  );
}

function Mushroom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-6} y={-20} width={12} height={22} rx={5} fill="#fbeedd" />
      <path d="M-24,-18 Q0,-52 24,-18 Z" fill="#f0a9a0" />
      <circle cx={-8} cy={-28} r={3.5} fill="#fff6ea" /><circle cx={8} cy={-25} r={3} fill="#fff6ea" />
    </g>
  );
}

function Fern({ x, y, s = 1, fill = "#8cc3a0" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {[-50, -25, 0, 25, 50].map((a) => <path key={a} d="M0,0 Q-14,-60 0,-120 Q14,-60 0,0 Z" fill={fill} transform={`rotate(${a})`} />)}
    </g>
  );
}

/** Główna scena (świat w skali 1:1): ziemia, dąb, strumyk, drzewo wiewiórki, polana. */
export function MainStage() {
  const r = rng(5);
  const decor = Array.from({ length: 70 }, (_, i) => ({ x: 760 + i * 92 + r() * 50, k: r(), c: ["#f7b8c4", "#c9b8f2", "#ffd98a", "#f6c6a8"][i % 4] })).filter(
    (d) => Math.abs(d.x - STREAM_X - 90) > 170 && Math.abs(d.x - STONE_X) > 190 && Math.abs(d.x - SQUIRREL_TREE_X) > 90,
  );
  const LEN = 7200;
  return (
    <>
      {/* ziemia, mech i ścieżka */}
      <Cut dy={-6} o={0.1}>
        <path d={`M0,${GROUND} ${Array.from({ length: LEN / 60 + 1 }, (_, i) => `L${i * 60},${GROUND - 6 - Math.sin(i * 0.7) * 5}`).join(" ")} L${LEN},${H} L0,${H} Z`} fill="#c6dfa6" />
      </Cut>
      <path d={`M0,${GROUND + 26} ${Array.from({ length: LEN / 80 + 1 }, (_, i) => `L${i * 80},${GROUND + 22 + Math.sin(i * 0.9) * 7}`).join(" ")} L${LEN},${GROUND + 86} L0,${GROUND + 86} Z`} fill="#f4e4c6" />
      <path d={`M0,${GROUND + 84} L${LEN},${GROUND + 84} L${LEN},${H} L0,${H} Z`} fill="#b5d49a" />

      {/* stary dąb z dziuplą Elofika */}
      <Cut dx={12} dy={10}>
        <path d={`M${OAK_X - 150},${GROUND} Q${OAK_X - 110},520 ${OAK_X - 120},330 L${OAK_X - 190},230 L${OAK_X - 120},250 L${OAK_X - 60},120 L${OAK_X + 40},240 L${OAK_X + 120},110 L${OAK_X + 190},260 L${OAK_X + 290},210 L${OAK_X + 235},340 Q${OAK_X + 220},540 ${OAK_X + 290},${GROUND} Z`} fill="#c9a17e" />
        <circle cx={OAK_X - 170} cy={150} r={170} fill="#a5d0a4" />
        <circle cx={OAK_X + 60} cy={40} r={220} fill="#b6dba6" />
        <circle cx={OAK_X + 300} cy={150} r={180} fill="#9fcaa8" />
        <circle cx={OAK_X + 110} cy={190} r={120} fill="#c3e2ae" />
      </Cut>
      {/* drzwi, okienko, lampion */}
      <path d={`M${OAK_X + 75},${GROUND} L${OAK_X + 75},600 Q${OAK_X + 130},520 ${OAK_X + 185},600 L${OAK_X + 185},${GROUND} Z`} fill="#8d5f3f" />
      <path d={`M${OAK_X + 87},${GROUND} L${OAK_X + 87},606 Q${OAK_X + 130},545 ${OAK_X + 173},606 L${OAK_X + 173},${GROUND} Z`} fill="#a8744b" />
      <circle cx={OAK_X + 160} cy={650} r={6} fill="#f6c34d" />
      <circle cx={OAK_X - 30} cy={520} r={38} fill="#8d5f3f" />
      <circle id="oak-window" cx={OAK_X - 30} cy={520} r={30} fill="#ffe7a0" />
      <path d={`M${OAK_X - 60},520 H${OAK_X} M${OAK_X - 30},490 V550`} stroke="#8d5f3f" strokeWidth={5} />
      <rect x={OAK_X + 60} y={GROUND - 6} width={140} height={14} rx={6} fill="#b98a63" />
      <g transform={`translate(${OAK_X + 222},560)`}>
        <rect x={-2} y={-40} width={4} height={40} fill="#8d5f3f" />
        <rect x={-13} y={0} width={26} height={34} rx={6} fill="#f6c34d" />
        <rect x={-8} y={5} width={16} height={24} rx={4} fill="#fff3c4" />
      </g>
      {/* tabliczka przy ścieżce */}
      <g transform="translate(1160,690)">
        <rect x={-4} y={-70} width={8} height={78} fill="#b98a63" />
        <path d="M-56,-104 H44 L64,-86 L44,-68 H-56 Z" fill="#e7c9a3" />
        <path d="M-40,-90 H30 M-40,-80 H10" stroke="#b98a63" strokeWidth={4} strokeLinecap="round" />
      </g>

      {decor.map((d, i) => (d.k > 0.72 ? <Mushroom key={i} x={d.x} y={GROUND + 2} s={0.7 + d.k * 0.5} /> : d.k > 0.25 ? <Flower key={i} x={d.x} y={GROUND - 24} c={d.c} s={0.8 + d.k * 0.5} /> : <Fern key={i} x={d.x} y={GROUND + 2} s={0.34} fill="#9fcf9a" />))}

      {/* strumyk z kładką */}
      <path d={`M${STREAM_X - 30},${GROUND - 4} Q${STREAM_X + 90},${GROUND + 10} ${STREAM_X + 210},${GROUND - 4} L${STREAM_X + 330},${H} L${STREAM_X - 170},${H} Z`} fill="#a9daee" />
      <path d={`M${STREAM_X - 10},${GROUND + 4} Q${STREAM_X + 90},${GROUND + 18} ${STREAM_X + 190},${GROUND + 4} L${STREAM_X + 270},${H} L${STREAM_X - 110},${H} Z`} fill="#c4e7f5" />
      {[0, 1, 2, 3].map((i) => <path key={i} className="film-wave" d={`M${STREAM_X - 60 + i * 12},${GROUND + 40 + i * 42} q30,-12 60,0 t60,0 t60,0 t60,0`} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" opacity={0.75} style={{ animationDelay: `${i * -0.7}s` }} />)}
      <ellipse cx={STREAM_X + 10} cy={GROUND + 120} rx={34} ry={14} fill="#d9d3e6" />
      <ellipse cx={STREAM_X + 200} cy={GROUND + 150} rx={40} ry={16} fill="#cfc8e0" />
      <Cut dy={8}>
        <rect x={STREAM_X - 70} y={GROUND - 6} width={330} height={24} rx={12} fill="#c39a74" />
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={STREAM_X - 50 + i * 52} y={GROUND - 6} width={6} height={24} fill="#a87c58" />)}
      </Cut>

      {/* drzewo wiewiórki: pień wychodzi poza kadr, gałąź nad ścieżką */}
      <Cut dx={12} dy={8}>
        <path d={`M${SQUIRREL_TREE_X - 70},${GROUND} Q${SQUIRREL_TREE_X - 46},400 ${SQUIRREL_TREE_X - 56},-20 L${SQUIRREL_TREE_X + 66},-20 Q${SQUIRREL_TREE_X + 52},400 ${SQUIRREL_TREE_X + 84},${GROUND} Z`} fill="#c4a183" />
        <path d={`M${SQUIRREL_TREE_X - 40},400 Q${SQUIRREL_TREE_X - 150},372 ${SQUIRREL_TREE_X - 250},388 L${SQUIRREL_TREE_X - 250},366 Q${SQUIRREL_TREE_X - 150},338 ${SQUIRREL_TREE_X - 40},352 Z`} fill="#c4a183" />
        <circle cx={SQUIRREL_TREE_X - 270} cy={350} r={54} fill="#a9d6a2" />
        <circle cx={SQUIRREL_TREE_X - 215} cy={318} r={44} fill="#bfe0a8" />
        <circle cx={SQUIRREL_TREE_X + 10} cy={60} r={190} fill="#a5d0a4" />
        <circle cx={SQUIRREL_TREE_X + 190} cy={130} r={130} fill="#b6dba6" />
      </Cut>
      <ellipse cx={SQUIRREL_TREE_X + 8} cy={300} rx={22} ry={30} fill="#9c7a5f" />

      {/* polana świetlików: domki jeżyków w pagórku */}
      <Cut dy={-5} o={0.1}><path d={`M${MEADOW_X + 150},${GROUND} Q${MEADOW_X + 420},${GROUND - 190} ${MEADOW_X + 720},${GROUND} Z`} fill="#b3d79b" /></Cut>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${MEADOW_X + 300 + i * 130},${GROUND - 6 - (i === 1 ? 18 : 0)})`}>
          <path d="M-30,0 V-36 Q0,-76 30,-36 V0 Z" fill="#a8744b" />
          <circle className="film-window" cx={0} cy={-34} r={11} fill="#ffe7a0" />
        </g>
      ))}
      {Array.from({ length: 26 }, (_, i) => <Flower key={i} x={MEADOW_X - 380 + i * 44 + (i % 3) * 12} y={GROUND - 20 + (i % 4) * 5} c={["#f7b8c4", "#c9b8f2", "#ffd98a", "#ffffff"][i % 4]} s={0.75 + (i % 3) * 0.2} />)}
    </>
  );
}

/** Omszały kamień (unosi się, gdy Elofik zagląda pod spód). */
export function Stone() {
  return (
    <Cut dx={10} dy={8}>
      <path d={`M${STONE_X - 130},${GROUND + 6} Q${STONE_X - 150},${GROUND - 120} ${STONE_X - 40},${GROUND - 176} Q${STONE_X + 80},${GROUND - 210} ${STONE_X + 140},${GROUND - 110} Q${STONE_X + 170},${GROUND - 30} ${STONE_X + 130},${GROUND + 6} Z`} fill="#cfc9df" />
      <path d={`M${STONE_X - 118},${GROUND - 110} Q${STONE_X - 80},${GROUND - 170} ${STONE_X - 40},${GROUND - 176} Q${STONE_X + 80},${GROUND - 210} ${STONE_X + 140},${GROUND - 110} Q${STONE_X + 80},${GROUND - 150} ${STONE_X + 30},${GROUND - 128} Q${STONE_X - 30},${GROUND - 100} ${STONE_X - 118},${GROUND - 110} Z`} fill="#a9d6a2" />
      <circle cx={STONE_X - 50} cy={GROUND - 70} r={10} fill="#bdb6d2" /><circle cx={STONE_X + 60} cy={GROUND - 50} r={14} fill="#bdb6d2" />
    </Cut>
  );
}

/** Pierwszy plan: paprocie i trawy przesuwające się szybciej niż scena. */
export function Foreground() {
  const r = rng(303);
  return (
    <>
      {Array.from({ length: 30 }, (_, i) => {
        const x = 80 + i * 300 + r() * 160;
        return i % 4 === 1 ? null : <Fern key={i} x={x} y={H + 30} s={1.1 + r() * 0.7} fill={i % 2 ? "#79b79c" : "#8cc7a3"} />;
      })}
    </>
  );
}
