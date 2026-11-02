import type { CSSProperties } from "react";

export type AppIconName =
  | "home" | "habits" | "finance" | "calendar" | "insights" | "goals"
  | "checkin" | "work" | "wellness" | "training" | "growth" | "settings";

const paths: Record<AppIconName, React.ReactNode> = {
  home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9 19v-6h6v6" /><path d="M3 10.5 12 3l9 7.5" /></>,
  habits: <><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="m8 9 1.5 1.5L12 8M14 9h3M8 15l1.5 1.5L12 14M14 15h3" /></>,
  finance: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 9h18M7 15h3M16 13v4M14 15h4" /><path d="M7 5V3h10v2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h2M13 13h3M8 17h2" /></>,
  insights: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-7" /><path d="M16 6h3v3" /></>,
  goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="2" /><path d="m12 12 6-6" /></>,
  checkin: <><path d="M7 4.5h10a2 2 0 0 1 2 2v13H5v-13a2 2 0 0 1 2-2Z" /><path d="M9 3v3M15 3v3M8.5 11h7M8.5 15h4" /><path d="m15 16 1.5 1.5L20 14" /></>,
  work: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  wellness: <><path d="M12 20s-8-4.5-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 10-8 10Z" /><path d="M5 12h4l2-3 2 6 2-3h4" /></>,
  training: <><path d="M4 9v6M7 6v12M17 6v12M20 9v6M7 12h10" /><path d="M3 10h1M3 14h1M20 10h1M20 14h1" /></>,
  growth: <><path d="M12 21v-8" /><path d="M12 14C5 14 4 9 4 5c5 0 9 2 9 8" /><path d="M12 17c0-5 3-9 8-10 0 5-1 10-8 10Z" /><path d="M8 20h8" /></>,
  settings: <><path d="M12 3.5 14 5l2.5-.2 1 2.3 2 1.5-.7 2.4.7 2.4-2 1.5-1 2.3L14 17l-2 1.5L10 17l-2.5.2-1-2.3-2-1.5.7-2.4-.7-2.4 2-1.5 1-2.3L10 5l2-1.5Z" /><circle cx="12" cy="11.5" r="3" /></>,
};

export function AppIcon({ name, size = 20, className, style }: {
  name: AppIconName; size?: number; className?: string; style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
