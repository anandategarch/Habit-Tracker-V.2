"use client";

import type { CSSProperties } from "react";

/* ==========================================================================
   RUTINA OS — night garden illustration system
   Hand-drawn flat-3D SVG scenes for the dark precision console.
   DNA botani dipertahankan (tunas/daun pada tiap adegan) tetapi
   dipindahkan ke malam: panel grafit, garis rambut, aksen emerald.
   viewBox 176x132 · stroke 3 · round joins · decorative by default.
   ========================================================================== */

export type OsIllustrationVariant =
  | "overview" | "habits" | "finance" | "calendar" | "analytics" | "settings"
  | "empty" | "celebrate" | "search" | "budget" | "receipt" | "sync" | "journal";

/* ---------- palette (turunan token globals.css) ---------- */
const P = {
  canvas: "#090c0a",
  panel: "#141a15",
  panel2: "#1a211b",
  panelSoft: "#10150f",
  line: "#2c362e",
  lineSoft: "#232c25",
  ink: "#e9eee9",
  dim: "#a3aea5",
  faint: "#6d7a70",
  emerald: "#37d99a",
  emeraldStrong: "#17b877",
  emeraldDeep: "#0c8a58",
  gold: "#f2b64c",
  goldDeep: "#b8860b",
  coral: "#ec8b5f",
  crimson: "#f37272",
  sage: "#8aa892",
};

/* ---------- reusable bits ---------- */

function Ground({ cx = 88, cy = 116, rx = 46 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={5.5} fill={P.emerald} opacity={0.08} />;
}

/** daun sederhana: titik asal (x,y), panjang L, arah (rad), warna */
function Leaf({ x, y, len = 16, rot = -35, fill = P.emerald, opacity = 1 }: { x: number; y: number; len?: number; rot?: number; fill?: string; opacity?: number }) {
  return (
    <path
      d={`M0 0 C ${len * 0.42} ${-len * 0.34}, ${len * 0.86} ${-len * 0.26}, ${len} 0 C ${len * 0.8} ${len * 0.34}, ${len * 0.36} ${len * 0.3}, 0 0 Z`}
      transform={`translate(${x} ${y}) rotate(${rot})`}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** kilau 4 titik */
function Spark({ x, y, r = 4, fill = P.ink, opacity = 0.9 }: { x: number; y: number; r?: number; fill?: string; opacity?: number }) {
  const s = r;
  return (
    <path
      d={`M0 ${-s} C ${s * 0.18} ${-s * 0.3}, ${s * 0.3} ${-s * 0.18}, ${s} 0 C ${s * 0.3} ${s * 0.18}, ${s * 0.18} ${s * 0.3}, 0 ${s} C ${-s * 0.18} ${s * 0.3}, ${-s * 0.3} ${s * 0.18}, ${-s} 0 C ${-s * 0.3} ${-s * 0.18}, ${-s * 0.18} ${-s * 0.3}, 0 ${-s} Z`}
      transform={`translate(${x} ${y})`}
      fill={fill}
      opacity={opacity}
    />
  );
}

function CrescentMoon({ x, y, r = 10, fill = P.gold }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <path
      d={`M ${x + r * 0.35} ${y - r} A ${r} ${r} 0 1 0 ${x + r * 0.35} ${y + r} A ${r * 0.78} ${r * 0.78} 0 1 1 ${x + r * 0.35} ${y - r} Z`}
      fill={fill}
    />
  );
}

/* ---------- scenes ---------- */

function Scene({ variant }: { variant: OsIllustrationVariant }) {
  switch (variant) {
    case "overview":
      return (
        <g>
          <Ground />
          {/* panel konsol */}
          <rect x={34} y={30} width={106} height={70} rx={14} fill={P.panel} stroke={P.line} strokeWidth={3} />
          <circle cx={48} cy={42} r={2.6} fill={P.crimson} />
          <circle cx={58} cy={42} r={2.6} fill={P.gold} />
          <circle cx={68} cy={42} r={2.6} fill={P.sage} />
          <path d="M44 54 H130" stroke={P.lineSoft} strokeWidth={2.5} strokeLinecap="round" />
          {/* kurva konsistensi */}
          <path d="M48 86 C60 66 70 80 82 64 C92 52 104 58 116 46" fill="none" stroke={P.emerald} strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={116} cy={46} r={4.2} fill={P.emerald} />
          <circle cx={116} cy={46} r={9} fill={P.emerald} opacity={0.16} />
          {/* tunas tumbuh dari panel */}
          <path d="M128 30 C127 22 131 15 139 11" fill="none" stroke={P.emeraldStrong} strokeWidth={3} strokeLinecap="round" />
          <Leaf x={139} y={11} len={13} rot={-38} fill={P.emerald} />
          <Leaf x={133} y={17} len={9} rot={150} fill={P.emeraldDeep} />
          {/* orbit kecil */}
          <Spark x={26} y={44} r={3} fill={P.gold} />
          <circle cx={150} cy={86} r={2.6} fill={P.coral} />
        </g>
      );

    case "habits":
      return (
        <g>
          <Ground cx={88} cy={112} rx={40} />
          <rect x={46} y={22} width={86} height={88} rx={12} fill={P.panel} stroke={P.line} strokeWidth={3} />
          {/* klip papan */}
          <rect x={74} y={14} width={30} height={13} rx={6} fill={P.panel2} stroke={P.line} strokeWidth={3} />
          {/* baris centang */}
          {[46, 66, 86].map((y, i) => (
            <g key={y}>
              {i < 2 ? (
                <g>
                  <circle cx={62} cy={y} r={7.5} fill={P.emeraldDeep} stroke={P.emeraldStrong} strokeWidth={2.5} />
                  <path d={`m${62 - 3.4} ${y} 2.6 2.8 4.6-5.4`} fill="none" stroke={P.emerald} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ) : (
                <circle cx={62} cy={y} r={7.5} fill="none" stroke={P.lineSoft} strokeWidth={2.5} />
              )}
              <path d={`M78 ${y} H${i === 2 ? 104 : 118}`} stroke={P.lineSoft} strokeWidth={4} strokeLinecap="round" />
            </g>
          ))}
          {/* daun di pojok kartu */}
          <Leaf x={118} y={102} len={14} rot={-30} fill={P.emeraldDeep} />
          <Spark x={146} y={28} r={3.4} fill={P.gold} />
          <circle cx={30} cy={70} r={2.4} fill={P.faint} />
        </g>
      );

    case "finance":
      return (
        <g>
          <Ground cy={110} rx={44} />
          {/* dompet */}
          <rect x={38} y={48} width={98} height={54} rx={13} fill={P.panel} stroke={P.line} strokeWidth={3} />
          <path d="M38 62 H136" stroke={P.lineSoft} strokeWidth={2.5} />
          <rect x={98} y={66} width={38} height={22} rx={10} fill={P.panel2} stroke={P.line} strokeWidth={2.5} />
          <circle cx={117} cy={77} r={4} fill={P.gold} />
          {/* koin */}
          <circle cx={50} cy={38} r={11} fill={P.gold} stroke={P.goldDeep} strokeWidth={2.5} />
          <path d="M46 38 H54" stroke={P.goldDeep} strokeWidth={2.2} strokeLinecap="round" />
          {/* tanaman tumbuh dari dompet */}
          <path d="M84 48 C83 38 87 30 92 22" fill="none" stroke={P.emeraldStrong} strokeWidth={3} strokeLinecap="round" />
          <Leaf x={92} y={22} len={14} rot={-42} fill={P.emerald} />
          <Leaf x={87} y={30} len={10} rot={155} fill={P.emeraldDeep} />
          <Spark x={134} y={34} r={3} fill={P.gold} />
          <circle cx={28} cy={86} r={2.4} fill={P.faint} />
        </g>
      );

    case "calendar":
      return (
        <g>
          <Ground cy={112} rx={42} />
          {/* lembar kalender */}
          <rect x={36} y={28} width={100} height={82} rx={12} fill={P.panel} stroke={P.line} strokeWidth={3} />
          <rect x={60} y={20} width={13} height={13} rx={4} fill={P.panel2} stroke={P.line} strokeWidth={2.5} />
          <rect x={99} y={20} width={13} height={13} rx={4} fill={P.panel2} stroke={P.line} strokeWidth={2.5} />
          <path d="M44 50 H128" stroke={P.lineSoft} strokeWidth={2.5} strokeLinecap="round" />
          {/* grid hari: beberapa tercentang */}
          {Array.from({ length: 4 }).flatMap((_, row) =>
            Array.from({ length: 5 }).map((_, col) => {
              const x = 50 + col * 17;
              const y = 60 + row * 12.5;
              const done = (row * 5 + col) % 3 !== 1;
              return done ? (
                <rect key={`${row}-${col}`} x={x} y={y} width={8} height={8} rx={2.5} fill={P.emerald} opacity={row % 2 === 0 ? 0.95 : 0.45} />
              ) : (
                <rect key={`${row}-${col}`} x={x} y={y} width={8} height={8} rx={2.5} fill="none" stroke={P.lineSoft} strokeWidth={2} />
              );
            }),
          )}
          {/* bulan sabit + bintang (malam) */}
          <CrescentMoon x={148} y={22} r={9} />
          <Spark x={26} y={38} r={3} fill={P.dim} opacity={0.7} />
          <Spark x={158} y={64} r={2.4} fill={P.dim} opacity={0.5} />
        </g>
      );

    case "analytics":
      return (
        <g>
          <Ground cy={112} rx={42} />
          {/* panel grafik */}
          <rect x={32} y={28} width={92} height={70} rx={12} fill={P.panel} stroke={P.line} strokeWidth={3} />
          <rect x={46} y={62} width={12} height={22} rx={3} fill={P.emeraldDeep} />
          <rect x={65} y={52} width={12} height={32} rx={3} fill={P.emeraldStrong} />
          <rect x={84} y={40} width={12} height={44} rx={3} fill={P.emerald} />
          <rect x={103} y={68} width={12} height={16} rx={3} fill="none" stroke={P.lineSoft} strokeWidth={2.2} />
          {/* garis tren emas */}
          <path d="M48 54 L68 44 L88 32 L108 24" fill="none" stroke={P.gold} strokeWidth={3} strokeLinecap="round" />
          <path d="M108 24 l-7 -1.5 l3.5 6.5 Z" fill={P.gold} />
          {/* kaca pembesar */}
          <circle cx={140} cy={80} r={15} fill={P.panelSoft} stroke={P.dim} strokeWidth={3.5} />
          <path d="M133 76 a9 9 0 0 1 6-5" fill="none" stroke={P.emerald} strokeWidth={2.4} strokeLinecap="round" />
          <path d="M151 91 L161 101" stroke={P.dim} strokeWidth={4.5} strokeLinecap="round" />
        </g>
      );

    case "settings":
      return (
        <g>
          <Ground cy={112} rx={40} />
          <rect x={40} y={30} width={96} height={72} rx={14} fill={P.panel} stroke={P.line} strokeWidth={3} />
          {/* slider 1 */}
          <path d="M56 52 H120" stroke={P.lineSoft} strokeWidth={5} strokeLinecap="round" />
          <circle cx={80} cy={52} r={8.5} fill={P.panel} stroke={P.emerald} strokeWidth={3.2} />
          {/* slider 2 */}
          <path d="M56 80 H120" stroke={P.lineSoft} strokeWidth={5} strokeLinecap="round" />
          <circle cx={106} cy={80} r={8.5} fill={P.panel} stroke={P.gold} strokeWidth={3.2} />
          {/* daun kecil di pojok */}
          <Leaf x={112} y={40} len={12} rot={-28} fill={P.emeraldDeep} />
          <Spark x={30} y={40} r={3} fill={P.dim} opacity={0.6} />
          <circle cx={150} cy={78} r={2.4} fill={P.faint} />
        </g>
      );

    case "empty":
      return (
        <g>
          <Ground cy={110} rx={38} />
          {/* lingkar putus-putus: ruang menunggu diisi */}
          <circle cx={88} cy={72} r={35} fill="none" stroke={P.lineSoft} strokeWidth={2.2} strokeDasharray="4 7" strokeLinecap="round" />
          {/* stoples terbuka */}
          <rect x={56} y={36} width={64} height={11} rx={5.5} fill={P.panel2} stroke={P.line} strokeWidth={2.8} />
          <path d="M62 47 v50 a10 10 0 0 0 10 10 h32 a10 10 0 0 0 10-10 V47" fill={P.panelSoft} stroke={P.line} strokeWidth={3} />
          {/* tunas kecil di dasar stoples */}
          <path d="M88 100 C88 90 84 86 84 79" fill="none" stroke={P.emeraldStrong} strokeWidth={2.8} strokeLinecap="round" />
          <Leaf x={84} y={79} len={9} rot={-48} fill={P.emerald} />
          <Leaf x={86} y={86} len={7} rot={160} fill={P.emeraldDeep} />
          {/* debu melayang */}
          <circle cx={64} cy={64} r={1.8} fill={P.faint} />
          <circle cx={112} cy={58} r={2} fill={P.faint} />
          <circle cx={104} cy={84} r={1.6} fill={P.faint} />
        </g>
      );

    case "celebrate":
      return (
        <g>
          <Ground cy={108} rx={42} />
          {/* piala */}
          <path d="M68 34 H108 V48 a20 20 0 0 1 -40 0 Z" fill={P.emeraldStrong} stroke={P.emerald} strokeWidth={3} />
          <path d="M74 40 h6 v14" fill="none" stroke={P.emerald} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
          {/* pegangan */}
          <path d="M68 40 C54 42 54 58 68 60" fill="none" stroke={P.emeraldStrong} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M108 40 C122 42 122 58 108 60" fill="none" stroke={P.emeraldStrong} strokeWidth={3.2} strokeLinecap="round" />
          {/* batang + alas */}
          <path d="M88 72 V86" stroke={P.emeraldStrong} strokeWidth={4.5} strokeLinecap="round" />
          <rect x={74} y={86} width={28} height={8} rx={4} fill={P.panel2} stroke={P.line} strokeWidth={2.6} />
          <rect x={68} y={94} width={40} height={8} rx={4} fill={P.panel} stroke={P.line} strokeWidth={2.6} />
          {/* bintang di badan piala */}
          <Spark x={88} y={50} r={6.5} fill={P.gold} />
          {/* konfeti */}
          <Spark x={40} y={30} r={3.4} fill={P.gold} />
          <Spark x={140} y={26} r={4} fill={P.coral} />
          <Spark x={150} y={62} r={2.8} fill={P.emerald} />
          <rect x={30} y={58} width={7} height={7} rx={2} fill={P.gold} opacity={0.8} transform="rotate(24 33 61)" />
          <rect x={132} y={44} width={6} height={6} rx={2} fill={P.sage} opacity={0.8} transform="rotate(-18 135 47)" />
          <circle cx={58} cy={20} r={2.4} fill={P.emerald} />
        </g>
      );

    case "search":
      return (
        <g>
          <Ground cy={112} rx={40} />
          {/* struk di belakang */}
          <rect x={48} y={28} width={46} height={66} rx={7} fill={P.panelSoft} stroke={P.lineSoft} strokeWidth={2.6} />
          <path d="M58 44 H84" stroke={P.lineSoft} strokeWidth={3.5} strokeLinecap="round" />
          <path d="M58 56 H84" stroke={P.lineSoft} strokeWidth={3.5} strokeLinecap="round" />
          <path d="M58 68 H74" stroke={P.lineSoft} strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={64} cy={82} r={2.6} fill={P.gold} />
          {/* kaca pembesar besar */}
          <circle cx={106} cy={72} r={23} fill={P.panel} stroke={P.dim} strokeWidth={4} />
          <path d="M96 64 a12 12 0 0 1 9-5.5" fill="none" stroke={P.emerald} strokeWidth={3} strokeLinecap="round" />
          <path d="M123 88 L137 102" stroke={P.dim} strokeWidth={5} strokeLinecap="round" />
          {/* tanda tanya di lensa */}
          <path d="M103 70 c0-3.4 5-3.8 5 .2 c0 2.4-2.4 2.6-2.4 4.6" fill="none" stroke={P.faint} strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={105.8} cy={79.4} r={1.6} fill={P.faint} />
          <Spark x={36} y={40} r={2.8} fill={P.dim} opacity={0.6} />
        </g>
      );

    case "budget":
      return (
        <g>
          <Ground cy={110} rx={40} />
          {/* jarum pengukur di atas stoples */}
          <path d="M60 30 A30 30 0 0 1 116 30" fill="none" stroke={P.lineSoft} strokeWidth={4} strokeLinecap="round" />
          <path d="M88 26 L98 12" stroke={P.emerald} strokeWidth={3} strokeLinecap="round" />
          <circle cx={88} cy={26} r={3.4} fill={P.emerald} />
          {/* tutup stoples */}
          <rect x={64} y={40} width={48} height={11} rx={5.5} fill={P.panel2} stroke={P.line} strokeWidth={2.8} />
          <path d="M70 51 v42 a10 10 0 0 0 10 10 h26 a10 10 0 0 0 10-10 V51" fill={P.panelSoft} stroke={P.line} strokeWidth={3} />
          {/* tumpukan koin di dalam */}
          <circle cx={88} cy={94} r={7} fill={P.gold} stroke={P.goldDeep} strokeWidth={2} />
          <circle cx={79} cy={86} r={6} fill={P.gold} stroke={P.goldDeep} strokeWidth={2} />
          <circle cx={97} cy={86} r={6} fill={P.gold} stroke={P.goldDeep} strokeWidth={2} />
          <circle cx={88} cy={78} r={6} fill={P.gold} stroke={P.goldDeep} strokeWidth={2} />
          {/* koin sedang jatuh */}
          <circle cx={130} cy={34} r={7.5} fill={P.gold} stroke={P.goldDeep} strokeWidth={2.4} />
          <path d="M130 46 v6 m0 4 v3" stroke={P.faint} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 5" />
        </g>
      );

    case "receipt":
      return (
        <g>
          <Ground cy={112} rx={40} />
          {/* struk dengan zigzag bawah */}
          <path d="M56 26 h50 v62 l-8.3 8 -8.3-8 -8.4 8 -8.3-8 -8.4 8 -8.3-8 Z" fill={P.panelSoft} stroke={P.line} strokeWidth={3} strokeLinejoin="round" />
          <path d="M66 42 H96" stroke={P.lineSoft} strokeWidth={3.4} strokeLinecap="round" />
          <path d="M66 54 H96" stroke={P.lineSoft} strokeWidth={3.4} strokeLinecap="round" />
          <path d="M66 66 H84" stroke={P.lineSoft} strokeWidth={3.4} strokeLinecap="round" />
          <path d="M66 80 H96" stroke={P.emerald} strokeWidth={3.4} strokeLinecap="round" />
          {/* koin di samping */}
          <circle cx={124} cy={88} r={12.5} fill={P.gold} stroke={P.goldDeep} strokeWidth={2.6} />
          <circle cx={124} cy={88} r={7} fill="none" stroke={P.goldDeep} strokeWidth={2} opacity={0.7} />
          <circle cx={112} cy={66} r={6} fill={P.coral} stroke="#a34f33" strokeWidth={2} />
          <Spark x={142} y={40} r={3.2} fill={P.dim} opacity={0.7} />
        </g>
      );

    case "sync":
      return (
        <g>
          <Ground cy={108} rx={40} />
          {/* awan */}
          <path
            d="M62 86 a15 15 0 0 1 4-29.5 A19 19 0 0 1 102 50 a13.5 13.5 0 0 1 12 36 Z"
            fill={P.panel}
            stroke={P.line}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <path d="M78 78 l6.5 6.5 L97 73" fill="none" stroke={P.emerald} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {/* orbit panah sinkron */}
          <path d="M44 70 A45 45 0 0 1 66 34" fill="none" stroke={P.sage} strokeWidth={3} strokeLinecap="round" />
          <path d="M66 34 l-8.5 1.2 l4.6 7.2 Z" fill={P.sage} />
          <path d="M132 66 A45 45 0 0 1 110 100" fill="none" stroke={P.emeraldStrong} strokeWidth={3} strokeLinecap="round" />
          <path d="M110 100 l8.5 -1 l-4.8 -7.2 Z" fill={P.emeraldStrong} />
        </g>
      );

    case "journal":
      return (
        <g>
          <Ground cy={112} rx={42} />
          {/* buku terbuka */}
          <path d="M88 42 C77 34 62 33 50 37 v54 c12-4 27-3 38 5 Z" fill={P.panelSoft} stroke={P.line} strokeWidth={3} strokeLinejoin="round" />
          <path d="M88 42 C99 34 114 33 126 37 v54 c-12-4-27-3-38 5 Z" fill={P.panel} stroke={P.line} strokeWidth={3} strokeLinejoin="round" />
          <path d="M88 42 V96" stroke={P.line} strokeWidth={2.6} strokeLinecap="round" />
          {/* baris tulis di halaman kiri */}
          <path d="M58 50 H78" stroke={P.lineSoft} strokeWidth={3} strokeLinecap="round" />
          <path d="M58 60 H78" stroke={P.lineSoft} strokeWidth={3} strokeLinecap="round" />
          <path d="M58 70 H70" stroke={P.lineSoft} strokeWidth={3} strokeLinecap="round" />
          {/* pita pembatas */}
          <path d="M112 78 v16 l6-4.5 6 4.5 V78 Z" fill={P.coral} />
          {/* bulan + bintang */}
          <CrescentMoon x={148} y={24} r={8} />
          <Spark x={30} y={34} r={2.8} fill={P.dim} opacity={0.6} />
          <Leaf x={40} y={94} len={12} rot={-20} fill={P.emeraldDeep} />
        </g>
      );
  }
}

/* ---------- public component ---------- */

export function OsIllustration({
  variant,
  size = 88,
  className,
  style,
  title,
}: {
  variant: OsIllustrationVariant;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** isi untuk membuat ilustrasi informatif (role=img); tanpa ini ilustrasi dekoratif */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={(size / 176) * 132}
      viewBox="0 0 176 132"
      fill="none"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Scene variant={variant} />
    </svg>
  );
}
