import type { CSSProperties } from "react";

export type BotanicalIllustrationVariant =
  | "home" | "sprout" | "habit" | "calendar" | "insights" | "finance"
  | "focus" | "goals" | "checkin" | "work" | "wellness"
  | "training" | "tree" | "settings";

type Palette = {
  halo: string;
  leaf: string;
  deep: string;
  blush: string;
  soil: string;
  aqua: string;
  gold: string;
};

const palettes: Record<BotanicalIllustrationVariant, Palette> = {
  home:     { halo: "#f3e8d7", leaf: "#8eae78", deep: "#456c4d", blush: "#e9ad91", soil: "#c58c68", aqua: "#a7c8bd", gold: "#edc77f" },
  sprout:   { halo: "#e3edd6", leaf: "#8fb476", deep: "#477451", blush: "#f2c6a7", soil: "#d28d67", aqua: "#a8cbbd", gold: "#edc77f" },
  habit:    { halo: "#e2eedf", leaf: "#88b47a", deep: "#477451", blush: "#f1c4a3", soil: "#d28d67", aqua: "#a8cbbd", gold: "#edc77f" },
  calendar: { halo: "#f5e8d8", leaf: "#8eae78", deep: "#587d59", blush: "#eebd9c", soil: "#c98a67", aqua: "#a8c9c0", gold: "#edc77f" },
  insights: { halo: "#e2ece3", leaf: "#86ad80", deep: "#3e7054", blush: "#eebd9c", soil: "#c98a67", aqua: "#a8c9c0", gold: "#edc77f" },
  finance:  { halo: "#f3ead6", leaf: "#83a973", deep: "#477451", blush: "#e7bd7e", soil: "#c98a67", aqua: "#a8c9c0", gold: "#edc77f" },
  focus:    { halo: "#e5eee1", leaf: "#86ad79", deep: "#416f50", blush: "#ecc4a2", soil: "#c98a67", aqua: "#a8c9c0", gold: "#edc77f" },
  goals:    { halo: "#e6edd9", leaf: "#8aad70", deep: "#477451", blush: "#edc19e", soil: "#ca8964", aqua: "#a8c9c0", gold: "#edc77f" },
  checkin:  { halo: "#f6e6df", leaf: "#8eae7b", deep: "#527957", blush: "#e9a99f", soil: "#ca8964", aqua: "#b8d7d5", gold: "#edc77f" },
  work:     { halo: "#e8ecdf", leaf: "#8fac78", deep: "#527657", blush: "#efc4a4", soil: "#ca8964", aqua: "#a8c9c0", gold: "#edc77f" },
  wellness: { halo: "#e2eee9", leaf: "#86b19a", deep: "#46745e", blush: "#edc4a4", soil: "#ca8964", aqua: "#8fc4c8", gold: "#edc77f" },
  training: { halo: "#f2e8d9", leaf: "#87a976", deep: "#4c7250", blush: "#eab99a", soil: "#ca8964", aqua: "#a8c9c0", gold: "#edc77f" },
  tree:     { halo: "#dcebd2", leaf: "#75a56c", deep: "#3f704b", blush: "#f0c8a6", soil: "#c98a66", aqua: "#a8c9c0", gold: "#edc77f" },
  settings: { halo: "#e8e9df", leaf: "#8da87c", deep: "#587359", blush: "#edc4a5", soil: "#ca8964", aqua: "#a8c9c0", gold: "#edc77f" },
};

function Scene({ variant, palette }: {
  variant: BotanicalIllustrationVariant;
  palette: Palette;
}) {
  const { leaf, deep, blush, soil, aqua, gold } = palette;
  const paper = "#fffaf1";

  switch (variant) {
    case "home":
      return (
        <g>
          <circle cx="143" cy="25" r="13" fill={gold} />
          <path d="M25 73 86 26l61 47" fill="#f2dfc8" stroke={deep} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M39 67v46h94V67" fill={paper} stroke={deep} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M76 113V82h22v31" fill={soil} stroke={deep} strokeWidth="2.8" />
          <rect x="49" y="78" width="15" height="15" rx="3" fill={aqua} stroke={deep} strokeWidth="2" />
          <rect x="111" y="78" width="13" height="15" rx="3" fill={aqua} stroke={deep} strokeWidth="2" />
          <path d="M18 115h145" stroke={leaf} strokeWidth="4.5" strokeLinecap="round" />
          <path className="botanical-illustration__leaf" d="M24 108c-2-12 6-21 17-22 4 12-3 21-17 22Z" fill={leaf} />
          <path d="M39 111c2-11 10-17 20-16 1 11-7 17-20 16Z" fill="#a5c58b" />
          <path d="M149 111c2-9 9-14 17-12 0 9-7 14-17 12Z" fill={leaf} />
          <path d="M147 44c5-5 11-5 15 0" stroke={blush} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "habit":
      return (
        <g>
          <rect x="48" y="14" width="84" height="101" rx="11" fill={paper} stroke={deep} strokeWidth="3.5" />
          <path d="M72 14V8m36 6V8" stroke={soil} strokeWidth="5" strokeLinecap="round" />
          {[38, 63, 88].map((y, index) => (
            <g key={y}>
              <rect x="61" y={y} width="13" height="13" rx="3.5" fill={index < 2 ? "#a8c88c" : "#fff"} stroke={deep} strokeWidth="2" />
              {index < 2 && <path d={`m64 ${y + 6} 4 4 8-9`} stroke={deep} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
              <path d={`M84 ${y + 6}h31`} stroke="#b3b9a5" strokeWidth="4" strokeLinecap="round" />
            </g>
          ))}
          <path d="M25 99c10-14 20-15 28-6-7 11-17 13-28 6Z" fill={leaf} />
          <path d="M26 100 46 94" stroke={deep} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="145" cy="27" r="7" fill={blush} opacity=".85" />
        </g>
      );
    case "finance":
      return (
        <g>
          <ellipse cx="92" cy="112" rx="54" ry="5.5" fill={deep} opacity=".1" />
          <circle cx="43" cy="39" r="15" fill={gold} stroke="#a77a42" strokeWidth="2.5" />
          <path d="M43 30v18m5-13c-2-3-10-3-10 1 0 5 10 2 10 7 0 4-8 5-11 1" stroke="#815f32" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="48" y="48" width="91" height="61" rx="12" fill="#6e9671" stroke={deep} strokeWidth="3.5" />
          <path d="M57 49c4-18 54-26 73-5" stroke={deep} strokeWidth="3.5" fill="none" />
          <path d="M103 67h39a9 9 0 0 1 0 18h-39" fill="#f0d7a3" stroke={deep} strokeWidth="3" />
          <circle cx="116" cy="76" r="3" fill="#a77a42" />
          <path className="botanical-illustration__leaf" d="M82 48c-12-15-8-25 2-29 11 9 10 21-2 29Z" fill={leaf} />
          <path d="M83 46c-1-13 7-20 17-18 2 11-5 19-17 18Z" fill="#a8c98d" />
        </g>
      );
    case "calendar":
      return (
        <g>
          <rect x="34" y="24" width="108" height="87" rx="12" fill={paper} stroke={deep} strokeWidth="3.5" />
          <path d="M34 48h108" stroke={blush} strokeWidth="7" />
          <path d="M60 18v15m57-15v15" stroke={deep} strokeWidth="5" strokeLinecap="round" />
          {[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => (
            <rect key={`${row}-${col}`} x={51 + col * 21} y={60 + row * 14} width="10" height="8" rx="2" fill={row === 1 && col === 2 ? soil : "#e8eddf"} />
          )))}
          <circle cx="137" cy="93" r="17" fill={gold} stroke={deep} strokeWidth="2.5" />
          <path d="M137 83v11l7 4" stroke={deep} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "insights":
      return (
        <g>
          <rect x="26" y="18" width="124" height="94" rx="11" fill={paper} stroke={deep} strokeWidth="3.5" />
          <path d="M45 91V75h13v16m9 0V59h13v32m9 0V45h13v46m9 0V34h13v57" fill="#9dbc88" stroke="#557b59" strokeWidth="2.5" />
          <path d="m42 63 25-14 21 3 34-27" stroke={blush} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="124" cy="26" r="4" fill={gold} />
          <circle cx="139" cy="94" r="14" fill={gold} stroke={deep} strokeWidth="2.5" />
          <path d="m149 105 12 12" stroke={deep} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case "focus":
      return (
        <g>
          <circle cx="90" cy="66" r="43" fill={paper} stroke={deep} strokeWidth="3.5" />
          <path d="M90 31v6m0 58v6m-35-35h-6m88 0h-6" stroke={leaf} strokeWidth="3" strokeLinecap="round" />
          <path d="M90 43v24l18 11" stroke={soil} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="90" cy="66" r="4" fill={blush} />
          <path d="M78 13h24" stroke={deep} strokeWidth="4" strokeLinecap="round" />
          <path d="M90 13V7" stroke={deep} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case "goals":
      return (
        <g>
          <circle cx="39" cy="38" r="12" fill={gold} />
          <path d="M18 111 65 54l24 26 20-41 53 72Z" fill="#d8e5ca" stroke="#557c59" strokeWidth="3" strokeLinejoin="round" />
          <path d="m66 54 23 26 20-41" fill="none" stroke="#fffaf1" strokeWidth="3" strokeLinecap="round" />
          <path d="M91 39v58" stroke={deep} strokeWidth="4" strokeLinecap="round" />
          <path d="M93 40h32l-10 13 10 12H93Z" fill={blush} stroke={deep} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M28 110h128" stroke={leaf} strokeWidth="4" strokeLinecap="round" />
          <circle cx="144" cy="27" r="3" fill={gold} />
        </g>
      );
    case "checkin":
      return (
        <g>
          <path d="M41 84c-16-3-21-17-12-27 6-7 17-7 23-2 5-18 31-19 39-4 16-3 30 8 26 23 12 9 6 26-10 27H47" fill={paper} stroke="#557958" strokeWidth="3.5" />
          <circle cx="82" cy="66" r="29" fill={gold} stroke={deep} strokeWidth="3" />
          <path d="M70 62h2m20 0h2M72 77c6 8 16 8 22 0" stroke={deep} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="71" cy="70" r="3" fill={blush} opacity=".9" />
          <circle cx="94" cy="70" r="3" fill={blush} opacity=".9" />
          <path d="M145 28c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" fill={blush} />
        </g>
      );
    case "work":
      return (
        <g>
          <path d="M22 105h137" stroke={soil} strokeWidth="6" strokeLinecap="round" />
          <rect x="44" y="32" width="78" height="56" rx="7" fill="#6d8a78" stroke={deep} strokeWidth="3.5" />
          <rect x="51" y="39" width="64" height="42" rx="3" fill="#e8f0df" />
          <path d="m75 53 10-6 11 7-11 8Z" fill="#9bbd86" />
          <path d="M63 72h41" stroke="#b8c3aa" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 93h94l-9 10H45Z" fill="#d6a17c" stroke={deep} strokeWidth="2.5" />
          <rect x="135" y="57" width="18" height="35" rx="3" fill={paper} stroke={deep} strokeWidth="2.5" />
          <path d="M140 66h8m-8 7h8m-8 7h5" stroke={leaf} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "wellness":
      return (
        <g>
          <path d="M27 31h48l-7 80H35Z" fill="#d9edf0" stroke={deep} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M32 67h39l-4 40H36Z" fill={aqua} opacity=".86" />
          <path d="M39 49c-5-8 5-10 0-18m16 18c-5-8 5-10 0-18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M112 68c-20-2-24-23-8-33 16-9 31 5 24 22-3 7-9 11-16 11Z" fill="#e5a075" stroke={deep} strokeWidth="3" />
          <path className="botanical-illustration__leaf" d="M111 35c1-11 9-15 17-12-2 10-9 14-17 12Z" fill={leaf} stroke={deep} strokeWidth="1.4" />
          <path d="M92 108c4-12 13-16 22-11-2 11-11 15-22 11Z" fill="#e9c17f" />
        </g>
      );
    case "training":
      return (
        <g>
          <path d="M40 76h101" stroke={deep} strokeWidth="7" strokeLinecap="round" />
          <path d="M48 51v50m-12-40v30m94-40v50m12-40v30" stroke="#6d9670" strokeWidth="7" strokeLinecap="round" />
          <path d="M22 108c10-12 23-16 35-12 5 2 7 7 4 12H22Z" fill={blush} stroke={deep} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="m42 97 10-6m-2 10 10-6" stroke={paper} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="140" cy="28" r="10" fill={gold} />
        </g>
      );
    case "tree":
      return (
        <g>
          <path d="M90 108V68m0 16L66 64m24 20 26-27" stroke={soil} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="90" cy="43" r="27" fill="#91b578" stroke="#527958" strokeWidth="3" />
          <circle cx="66" cy="62" r="20" fill="#a9c88e" stroke="#527958" strokeWidth="3" />
          <circle cx="116" cy="62" r="20" fill="#6f9a6f" stroke="#527958" strokeWidth="3" />
          <path d="M90 107c-8 5-10 8-12 13m12-13c5 5 9 8 10 13m-10-13-21 10m21-10 22 10" stroke={soil} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M39 111c8-9 17-10 24-2-4 9-14 11-24 2Zm74 0c9-10 19-9 25 0-7 8-17 9-25 0Z" fill={leaf} />
        </g>
      );
    case "settings":
      return (
        <g>
          <path d="m83 14 8 3 7-5 10 8-2 8 5 7 9 2v13l-8 4-3 9 4 7-10 9-8-4-8 3-4 8H70l-3-9-8-3-8 4-10-9 4-8-3-8-8-4V43l9-2 4-7-2-8 10-8 7 5 8-3 3-9h10Z" fill="#e8dfc8" stroke={deep} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="83" cy="55" r="20" fill={paper} stroke={deep} strokeWidth="3" />
          <circle cx="83" cy="55" r="7" fill={leaf} />
          <path d="M132 34v66m-8-49h16m-16 30h16" stroke={soil} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="132" cy="51" r="5" fill={blush} stroke={deep} strokeWidth="2" />
          <circle cx="132" cy="81" r="5" fill={gold} stroke={deep} strokeWidth="2" />
        </g>
      );
    case "sprout":
    default:
      return (
        <g>
          <path d="M90 108V67" stroke={deep} strokeWidth="4" strokeLinecap="round" />
          <path className="botanical-illustration__leaf" d="M90 79C66 78 59 61 67 47c19 0 31 12 23 32Z" fill={leaf} />
          <path className="botanical-illustration__leaf botanical-illustration__leaf--second" d="M91 68c4-20 20-27 32-17-2 17-15 25-32 17Z" fill="#a8c98d" />
          <path d="M70 109c11-7 28-7 40 0" stroke={soil} strokeWidth="5" strokeLinecap="round" />
          <circle cx="115" cy="34" r="7" fill={gold} />
          <circle cx="52" cy="48" r="4" fill={blush} />
        </g>
      );
  }
}

export function BotanicalIllustration({ variant = "sprout", className = "" }: {
  variant?: BotanicalIllustrationVariant;
  className?: string;
}) {
  const palette = palettes[variant];
  const style = { "--botanical-halo": palette.halo } as CSSProperties;

  return (
    <div className={`botanical-illustration botanical-illustration--${variant} ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 180 132" fill="none" focusable="false">
        <circle cx="126" cy="58" r="48" fill={palette.halo} />
        <circle cx="158" cy="21" r="6" fill={palette.blush} opacity=".5" />
        <circle cx="22" cy="98" r="4" fill={palette.leaf} opacity=".26" />
        <path d="M15 116c21-10 42-10 63 0" stroke={palette.leaf} strokeWidth="2" strokeLinecap="round" opacity=".26" />
        <ellipse cx="94" cy="119" rx="59" ry="6" fill={palette.deep} opacity=".1" />
        <Scene variant={variant} palette={palette} />
      </svg>
    </div>
  );
}
