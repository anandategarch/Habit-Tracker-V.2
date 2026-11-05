import type { CSSProperties } from "react";

export type BotanicalIllustrationVariant =
  | "sprout" | "habit" | "calendar" | "insights" | "finance"
  | "focus" | "goals" | "checkin" | "work" | "wellness"
  | "training" | "tree" | "settings";

type Palette = { halo: string; leaf: string; deep: string; blush: string; soil: string };
const palettes: Record<BotanicalIllustrationVariant, Palette> = {
  sprout:   { halo: "#e3edd6", leaf: "#8fb476", deep: "#477451", blush: "#f2c6a7", soil: "#d28d67" },
  habit:    { halo: "#e2eedf", leaf: "#88b47a", deep: "#477451", blush: "#f1c4a3", soil: "#d28d67" },
  calendar: { halo: "#f5e8d8", leaf: "#8eae78", deep: "#587d59", blush: "#eebd9c", soil: "#c98a67" },
  insights: { halo: "#e2ece3", leaf: "#86ad80", deep: "#3e7054", blush: "#eebd9c", soil: "#c98a67" },
  finance:  { halo: "#f3ead6", leaf: "#83a973", deep: "#477451", blush: "#e7bd7e", soil: "#c98a67" },
  focus:    { halo: "#e5eee1", leaf: "#86ad79", deep: "#416f50", blush: "#ecc4a2", soil: "#c98a67" },
  goals:    { halo: "#e6edd9", leaf: "#8aad70", deep: "#477451", blush: "#edc19e", soil: "#ca8964" },
  checkin:  { halo: "#f6e6df", leaf: "#8eae7b", deep: "#527957", blush: "#e9a99f", soil: "#ca8964" },
  work:     { halo: "#e8ecdf", leaf: "#8fac78", deep: "#527657", blush: "#efc4a4", soil: "#ca8964" },
  wellness: { halo: "#e2eee9", leaf: "#86b19a", deep: "#46745e", blush: "#edc4a4", soil: "#ca8964" },
  training: { halo: "#f2e8d9", leaf: "#87a976", deep: "#4c7250", blush: "#eab99a", soil: "#ca8964" },
  tree:     { halo: "#dcebd2", leaf: "#75a56c", deep: "#3f704b", blush: "#f0c8a6", soil: "#c98a66" },
  settings: { halo: "#e8e9df", leaf: "#8da87c", deep: "#587359", blush: "#edc4a5", soil: "#ca8964" },
};

function Accent({ variant, palette }: { variant: BotanicalIllustrationVariant; palette: Palette }) {
  const { leaf, deep, blush, soil } = palette;
  if (variant === "calendar") return <g><rect x="13" y="44" width="48" height="43" rx="8" fill="#fffaf3" stroke={blush} strokeWidth="2"/><path d="M13 56h48M25 38v12M49 38v12" stroke={deep} strokeWidth="3" strokeLinecap="round"/><path d="M24 66h7M39 66h7M24 77h7" stroke={leaf} strokeWidth="4" strokeLinecap="round"/><circle cx="51" cy="77" r="5" fill={blush}/></g>;
  if (variant === "insights") return <g><rect x="13" y="47" width="51" height="40" rx="8" fill="#fffaf3" stroke="#d8e5d1" strokeWidth="2"/><path d="M24 77V68M38 77V59M52 77V53" stroke={leaf} strokeWidth="6" strokeLinecap="round"/><path d="m21 61 12-7 10 2 13-12" stroke={deep} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="56" cy="44" r="4" fill={blush}/></g>;
  if (variant === "finance") return <g><rect x="14" y="58" width="47" height="31" rx="8" fill="#fffaf3" stroke="#ead8bd" strokeWidth="2"/><path d="M19 58c3-10 32-10 37 0" stroke={soil} strokeWidth="3" strokeLinecap="round"/><circle cx="39" cy="70" r="9" fill="#f3d79b" stroke="#c28e4d" strokeWidth="1.5"/><path d="M39 64v12M42 66c-2-2-7-2-7 1 0 3 7 1 7 4 0 3-5 3-8 1" stroke="#9c713b" strokeWidth="1.5" strokeLinecap="round"/></g>;
  if (variant === "focus") return <g><circle cx="38" cy="66" r="23" fill="#fffaf3" stroke="#d8e5d1" strokeWidth="3"/><path d="M38 51v15l10 6M38 37v4M38 91v4M10 66h4M62 66h4" stroke={deep} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="38" cy="66" r="2.5" fill={blush}/></g>;
  if (variant === "goals") return <g><circle cx="39" cy="66" r="23" fill="#fffaf3" stroke="#e8d9c5" strokeWidth="2"/><circle cx="39" cy="66" r="14" stroke={leaf} strokeWidth="3"/><circle cx="39" cy="66" r="5" fill={blush}/><path d="m44 48 13-10-2 13" stroke={deep} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></g>;
  if (variant === "checkin") return <g><path d="M39 86S15 72 15 57c0-8 6-13 13-13 5 0 9 3 11 8 2-5 6-8 12-8 7 0 12 5 12 13 0 15-24 29-24 29Z" fill="#fffaf3" stroke={blush} strokeWidth="2.5" strokeLinejoin="round"/><path d="M29 61c3-4 7-4 10 0M42 61c3-4 7-4 10 0" stroke={deep} strokeWidth="2" strokeLinecap="round"/><path d="M34 70c3 4 8 4 11 0" stroke={soil} strokeWidth="2" strokeLinecap="round"/></g>;
  if (variant === "work") return <g><rect x="14" y="43" width="49" height="44" rx="8" fill="#fffaf3" stroke="#d8e5d1" strokeWidth="2"/><path d="M24 55h24M24 66h17M24 77h17" stroke={leaf} strokeWidth="3" strokeLinecap="round"/><circle cx="53" cy="76" r="8" fill={blush}/><path d="m49 76 3 3 5-6" stroke={deep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g>;
  if (variant === "wellness") return <g><path d="M17 58h39l-5 29H23l-6-29Z" fill="#fffaf3" stroke="#d8e5d1" strokeWidth="2" strokeLinejoin="round"/><path d="M56 64h6c8 0 8 14 0 14h-8M30 51c-5-7 5-7 0-14M42 51c-5-7 5-7 0-14" stroke={soil} strokeWidth="2.7" strokeLinecap="round"/><path d="M29 73c6 4 12 4 18 0" stroke={blush} strokeWidth="3" strokeLinecap="round"/></g>;
  if (variant === "training") return <g><path d="M14 61h9M54 61h9M23 50v22M29 45v34M52 50v22M58 45v34" stroke={deep} strokeWidth="4" strokeLinecap="round"/><path d="M29 61h23" stroke={soil} strokeWidth="5" strokeLinecap="round"/><path d="M18 39c7-8 16-10 24-9M49 91c7-2 12-6 16-12" stroke={blush} strokeWidth="2.5" strokeLinecap="round"/></g>;
  if (variant === "tree") return <g><path d="M39 91V69" stroke={soil} strokeWidth="5" strokeLinecap="round"/><circle cx="39" cy="58" r="17" fill={leaf}/><circle cx="27" cy="65" r="11" fill={deep} opacity=".85"/><circle cx="51" cy="66" r="11" fill="#a9c58c"/><circle cx="39" cy="46" r="10" fill="#a9c58c"/></g>;
  if (variant === "settings") return <g><circle cx="39" cy="65" r="21" fill="#fffaf3" stroke="#d8e5d1" strokeWidth="2"/><circle cx="39" cy="65" r="8" stroke={deep} strokeWidth="3"/><path d="M39 39v5M39 86v5M13 65h5M60 65h5M21 47l4 4M53 79l4 4M57 47l-4 4M25 79l-4 4" stroke={leaf} strokeWidth="4" strokeLinecap="round"/></g>;
  return <g><circle cx="38" cy="66" r="19" fill="#fffaf3" stroke="#dce8d5" strokeWidth="2"/><path d="M38 78V61" stroke={deep} strokeWidth="2.5" strokeLinecap="round"/><path d="M38 66c-13-1-16-9-11-16 10 0 15 6 11 16Z" fill={leaf}/><path d="M38 66c1-13 9-17 16-11-1 10-7 15-16 11Z" fill={deep}/></g>;
}

export function BotanicalIllustration({ variant = "sprout", className = "" }: {
  variant?: BotanicalIllustrationVariant;
  className?: string;
}) {
  const palette = palettes[variant];
  const style = { "--botanical-halo": palette.halo } as CSSProperties;
  return (
    <div className={`botanical-illustration botanical-illustration--${variant} ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 184 136" fill="none" focusable="false">
        <circle cx="128" cy="58" r="47" fill={palette.halo}/>
        <circle cx="154" cy="25" r="7" fill={palette.blush} opacity=".42"/>
        <circle cx="30" cy="104" r="5" fill={palette.leaf} opacity=".22"/>
        <path d="M20 111c22-12 44-12 67 0" stroke={palette.leaf} strokeWidth="2" strokeLinecap="round" opacity=".28"/>
        <Accent variant={variant} palette={palette}/>
        <ellipse cx="105" cy="119" rx="48" ry="7" fill={palette.deep} opacity=".1"/>
        <path d="M94 91C92 73 94 58 97 44" stroke={palette.deep} strokeWidth="4" strokeLinecap="round"/>
        <path className="botanical-illustration__leaf" d="M96 64C78 64 69 51 74 40c16-2 27 7 22 24Z" fill={palette.leaf}/>
        <path className="botanical-illustration__leaf botanical-illustration__leaf--second" d="M97 57c3-17 16-23 27-15-1 15-11 22-27 15Z" fill={palette.deep}/>
        <path d="M82 87h29l-4 28H86l-4-28Z" fill={palette.soil}/>
        <path d="M79 86h35v8H79z" fill={palette.blush}/>
        <path d="M88 99h22" stroke="#fff1df" strokeWidth="2" strokeLinecap="round" opacity=".65"/>
        <path d="M95 36c-1-5 2-8 6-9 5 2 7 7 4 11-3 4-7 3-10-2Z" fill={palette.blush}/>
        <circle cx="104" cy="34" r="3" fill="#fff4df"/>
        <path d="M137 104c4-8 10-9 15-3-1 7-8 10-15 3Z" fill={palette.leaf} opacity=".7"/>
      </svg>
    </div>
  );
}
