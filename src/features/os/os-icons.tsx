"use client";

import type { ReactNode, SVGProps } from "react";

/* ==========================================================================
   RUTINA OS — icon system
   Hand-drawn 24-grid line icons, 1.75 stroke, round joins.
   Decorative by default (aria-hidden); labels live next to icons in the UI.
   ========================================================================== */

interface IcoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
  children: ReactNode;
}

function Ico({ size = 18, children, strokeWidth = 1.75, ...rest }: IcoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------- brand ---------- */

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#10b981" fillOpacity="0.14" stroke="#17b877" strokeWidth="1.5" />
      <path
        d="M8 20.5 13.2 14.8 17 18.2 24 9.5"
        stroke="#37d99a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="9.5" r="2" fill="#37d99a" />
    </svg>
  );
}

/* ---------- navigation ---------- */

export function OverviewIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <path d="M15.5 17h3M17 15.5v3" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Ico>
  );
}

export function HabitsIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M10 6h10.5M10 12h10.5M10 18h10.5" />
      <path d="m3 5.8 1.7 1.7L7.4 4.6" />
      <path d="m3 11.8 1.7 1.7 2.7-2.9" />
      <circle cx="4.7" cy="18" r="1.9" />
    </Ico>
  );
}

export function WalletIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M20 8V6.8A1.8 1.8 0 0 0 18.2 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 19.5 9H4" />
      <circle cx="16.4" cy="14" r="1.15" fill="currentColor" stroke="none" />
    </Ico>
  );
}

export function CalendarIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2M11 17h2" />
    </Ico>
  );
}

export function ChartIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M4.5 4v15.5H20" />
      <path d="M8.5 19.5v-6M13 19.5V9.5M17.5 19.5v-4" />
    </Ico>
  );
}

export function SlidersIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M6 3.5v5M6 14v6.5M12 3.5v9M12 18v2.5M18 3.5v2M18 11v9.5" />
      <circle cx="6" cy="11.5" r="1.8" />
      <circle cx="12" cy="15.5" r="1.8" />
      <circle cx="18" cy="9.5" r="1.8" />
    </Ico>
  );
}

/* ---------- habit data icons (5 canonical values) ---------- */

export function BookIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M5 19.5a2 2 0 0 1 2-2H20" />
      <path d="M7 3.5h13v17H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M10.5 8h6" />
    </Ico>
  );
}

export function WaterIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M7 3.5h10l-.9 13.2a2.3 2.3 0 0 1-2.3 2.1h-3.6a2.3 2.3 0 0 1-2.3-2.1Z" />
      <path d="M8 9.5c1.2-.9 2.3-.9 3.5 0s2.3.9 3.5 0" />
    </Ico>
  );
}

export function MovementIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M3 12h3.2l2.3-6 3.7 11 2.3-7.5L15.6 12H21" />
    </Ico>
  );
}

export function MindIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="5" r="1.9" />
      <path d="M12 8.5c-2.9 0-5.2 1.7-5.2 4h10.4c0-2.3-2.3-4-5.2-4Z" />
      <path d="M4 19c1.9 1.6 4.7 2.5 8 2.5s6.1-.9 8-2.5" />
      <path d="M6.5 13.5c.6 2.3 2.5 3.9 5.5 3.9s4.9-1.6 5.5-3.9" />
    </Ico>
  );
}

export function WriteIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M16.8 3.7a2.4 2.4 0 0 1 3.4 3.4L8.2 19.2 4 20.5l1.3-4.2Z" />
      <path d="m14.5 6 3.4 3.4" />
    </Ico>
  );
}

/* ---------- habit categories ---------- */

export function LotusIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 3.5c2 2.3 2 5.3 0 7.8-2-2.5-2-5.5 0-7.8Z" />
      <path d="M5 8.5c2.6.4 4.6 2.2 5.4 4.9-2.8.4-5-1.1-5.4-4.9ZM19 8.5c-2.6.4-4.6 2.2-5.4 4.9 2.8.4 5-1.1 5.4-4.9Z" />
      <path d="M3 14.5c2.5 4 5.5 6 9 6s6.5-2 9-6c-2.2-.6-4.2-.5-6 .4" />
    </Ico>
  );
}

export function HeartIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 20.2S3.5 15.4 3.5 9.6a4.6 4.6 0 0 1 8.5-2.5 4.6 4.6 0 0 1 8.5 2.5c0 5.8-8.5 10.6-8.5 10.6Z" />
    </Ico>
  );
}

export function LearnIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m2.5 9 9.5-4.2L21.5 9 12 13.2Z" />
      <path d="M6.5 11.4v4.1c0 1.6 2.6 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.1" />
      <path d="M21.5 9v5.5" />
    </Ico>
  );
}

export function UserIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="7.7" r="3.4" />
      <path d="M5 20.2c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2" />
    </Ico>
  );
}

/* ---------- finance categories ---------- */

export function BanknoteIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 9.5h.01M18 14.5h.01" />
    </Ico>
  );
}

export function LaptopIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="4.5" y="4.5" width="15" height="10.5" rx="1.8" />
      <path d="M2.5 19.5h19" />
    </Ico>
  );
}

export function MealIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M4 12h16a8 8 0 0 1-16 0Z" />
      <path d="M9.5 3.5c-.6 1.2.6 1.8 0 3M14.5 3.5c-.6 1.2.6 1.8 0 3" />
      <path d="M4 12h16" />
    </Ico>
  );
}

export function CoffeeIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M5 8.5h11.5v5.5a5 5 0 0 1-5 5h-1.5a5 5 0 0 1-5-5Z" />
      <path d="M16.5 9.5h1.6a2.4 2.4 0 0 1 0 4.8h-1.6" />
      <path d="M8.5 3.5c-.6 1 .6 1.6 0 2.8M12 3.5c-.6 1 .6 1.6 0 2.8" />
    </Ico>
  );
}

export function CarIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M4.5 16.5v-3l1.5-4a2 2 0 0 1 1.9-1.3h8.2a2 2 0 0 1 1.9 1.3l1.5 4v3" />
      <path d="M4.5 16.5h15v2h-2.2M4.5 16.5v2h2.2" />
      <circle cx="7.8" cy="18.6" r="1.7" />
      <circle cx="16.2" cy="18.6" r="1.7" />
      <path d="M6.5 13h11" />
    </Ico>
  );
}

export function FuelIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M6 20.5V5.5a2 2 0 0 1 2-2h4.5a2 2 0 0 1 2 2v15" />
      <path d="M4 20.5h12" />
      <path d="M7.5 7h5v3.5h-5z" />
      <path d="M14.5 8.5h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 1-3 0V14" />
    </Ico>
  );
}

export function ZapIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12Z" />
    </Ico>
  );
}

export function CartIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M3 4h2.2l2.5 11a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 1.9-1.5L20.5 8H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </Ico>
  );
}

export function FilmIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
    </Ico>
  );
}

export function HeartPulseIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 20.5S4 16 4 10.6a4.3 4.3 0 0 1 8-2.2 4.3 4.3 0 0 1 8 2.2c0 5.4-8 9.9-8 9.9Z" />
      <path d="M7.5 11.5h2l1.2-2 1.8 3.6 1.4-2.4 1 1.3h1.6" />
    </Ico>
  );
}

export function HomeIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m4 10.5 8-7 8 7" />
      <path d="M6 9v11h12V9" />
      <path d="M10 20v-5.5h4V20" />
    </Ico>
  );
}

export function PhoneIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </Ico>
  );
}

export function GiftIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <rect x="4" y="8.5" width="16" height="4" rx="1" />
      <path d="M5.5 12.5V20a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-7.5" />
      <path d="M12 8.5v13" />
      <path d="M12 8.5c-2.8 0-4.3-1.4-3.8-3.3C8.7 3.4 11 3.5 12 8.5ZM12 8.5c2.8 0 4.3-1.4 3.8-3.3C15.3 3.4 13 3.5 12 8.5Z" />
    </Ico>
  );
}

export function TagIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M3.5 12V4.5A1 1 0 0 1 4.5 3.5H12l8.5 8.5-8 8Z" />
      <circle cx="7.8" cy="8.2" r="1.3" />
    </Ico>
  );
}

/* ---------- actions ---------- */

export function PlusIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Ico>
  );
}

export function XIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Ico>
  );
}

export function CheckIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p} strokeWidth={2.4}>
      <path d="m5.5 12.5 4.2 4.2L18.5 7.5" />
    </Ico>
  );
}

export function PencilIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M16.8 3.7a2.4 2.4 0 0 1 3.4 3.4L8.2 19.2 4 20.5l1.3-4.2Z" />
      <path d="m14.5 6 3.4 3.4" />
    </Ico>
  );
}

export function TrashIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3V7" />
      <path d="m6.5 7 .8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
      <path d="M10 11v6M14 11v6" />
    </Ico>
  );
}

export function ChevronLeftIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m14.5 6-6 6 6 6" />
    </Ico>
  );
}

export function ChevronRightIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m9.5 6 6 6-6 6" />
    </Ico>
  );
}

export function SearchIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m20 20-3.6-3.6" />
    </Ico>
  );
}

export function DownloadIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 3.5V15" />
      <path d="m7.5 10.8 4.5 4.5 4.5-4.5" />
      <path d="M4.5 17v1.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2.5V17" />
    </Ico>
  );
}

export function UploadIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 15V3.5" />
      <path d="m7.5 8 4.5-4.5L16.5 8" />
      <path d="M4.5 17v1.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2V17" />
    </Ico>
  );
}

export function RefreshIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20.5 3.5V9H15" />
    </Ico>
  );
}

export function AlertIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 3.5 2.8 19.5h18.4Z" />
      <path d="M12 9.8v4.4M12 17.4h.01" />
    </Ico>
  );
}

export function InfoIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </Ico>
  );
}

/* ---------- status / meta ---------- */

export function FlameIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 3s5.5 4.2 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.2 1.1-3.9 2.2-5 .1 1.6 1 2.7 2.1 2.7C10 7.9 10.7 5 12 3Z" />
    </Ico>
  );
}

export function ClockIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </Ico>
  );
}

export function CloudIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M7.2 18.5h9.6a4.1 4.1 0 0 0 .6-8.2 5.6 5.6 0 0 0-10.9 1.2 3.7 3.7 0 0 0 .7 7Z" />
      <path d="m9.7 14.3 1.9 1.9 3.2-3.4" />
    </Ico>
  );
}

export function CloudOffIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M7.2 18.5h9.6a4.1 4.1 0 0 0 .6-8.2 5.6 5.6 0 0 0-10.9 1.2 3.7 3.7 0 0 0 .7 7Z" />
      <path d="m4 4 16 16" />
    </Ico>
  );
}

export function TargetIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Ico>
  );
}

export function TrendUpIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m3.5 16.5 6-6 3.8 3.8 7.2-7.3" />
      <path d="M15 7h5.5v5.5" />
    </Ico>
  );
}

export function TrendDownIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="m3.5 7.5 6 6 3.8-3.8 7.2 7.3" />
      <path d="M15 17h5.5v-5.5" />
    </Ico>
  );
}

export function InboxIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M4 13.2 6.4 5.4A2 2 0 0 1 8.3 4h7.4a2 2 0 0 1 1.9 1.4L20 13.2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M4 13.2h4.2l1.5 2.4h4.6l1.5-2.4H20" />
    </Ico>
  );
}

export function SparkIcon(p: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Ico {...p}>
      <path d="M12 3.5 13.8 9.2 19.5 11 13.8 12.8 12 18.5 10.2 12.8 4.5 11 10.2 9.2Z" />
      <path d="M18.5 17.5v3M17 19h3" />
    </Ico>
  );
}

/* ==========================================================================
   Mappings — data values → icons
   ========================================================================== */

import type { Habit, TransactionCategory } from "@/lib/types";

export const HABIT_ICONS = {
  book: BookIcon,
  water: WaterIcon,
  movement: MovementIcon,
  mind: MindIcon,
  write: WriteIcon,
} as const;

export type HabitIconName = keyof typeof HABIT_ICONS;

export const HABIT_ICON_OPTIONS: HabitIconName[] = ["write", "book", "water", "movement", "mind"];

export function HabitIco({ name, size = 18 }: { name: Habit["icon"]; size?: number }) {
  const Cmp = HABIT_ICONS[name] ?? WriteIcon;
  return <Cmp size={size} />;
}

export const HABIT_CATEGORY_ICONS = {
  Mindfulness: LotusIcon,
  Health: HeartIcon,
  Learning: LearnIcon,
  Personal: UserIcon,
} as const;

export function HabitCategoryIco({ category, size = 15 }: { category: Habit["category"]; size?: number }) {
  const Cmp = HABIT_CATEGORY_ICONS[category] ?? UserIcon;
  return <Cmp size={size} />;
}

interface FinanceCategoryDef {
  label: string;
  Icon: (p: SVGProps<SVGSVGElement> & { size?: number }) => ReactNode;
  keywords: string[];
}

const FINANCE_DEFS: FinanceCategoryDef[] = [
  { label: "Gaji", Icon: BanknoteIcon, keywords: ["gaji", "salary", "payroll", "upah"] },
  { label: "Freelance", Icon: LaptopIcon, keywords: ["freelance", "proyek", "project", "klien"] },
  { label: "Makanan", Icon: MealIcon, keywords: ["makan", "food", "resto", "warung", "sarapan", "makanan", "delivery"] },
  { label: "Kopi", Icon: CoffeeIcon, keywords: ["kopi", "coffee", "cafe", "kafe", "ngopi"] },
  { label: "Transportasi", Icon: CarIcon, keywords: ["transport", "transportasi", "ojol", "gojek", "grab", "taksi", "kereta", "bus"] },
  { label: "Bensin", Icon: FuelIcon, keywords: ["bensin", "fuel", "pertalite", "pertamax", "solar", "isi ulang"] },
  { label: "Tagihan", Icon: ZapIcon, keywords: ["tagihan", "listrik", "air", "pdam", "internet", "wifi", "pulsa", "bill"] },
  { label: "Belanja", Icon: CartIcon, keywords: ["belanja", "shopping", "market", "supermarket", "grocery", "sembako"] },
  { label: "Hiburan", Icon: FilmIcon, keywords: ["hiburan", "entertainment", "film", "bioskop", "game", "musik", "netflix", "spotify"] },
  { label: "Kesehatan", Icon: HeartPulseIcon, keywords: ["kesehatan", "medis", "dokter", "obat", "apotek", "rumah sakit", "vitamin"] },
  { label: "Pendidikan", Icon: LearnIcon, keywords: ["pendidikan", "edukasi", "sekolah", "kuliah", "kursus", "buku", "education"] },
  { label: "Rumah", Icon: HomeIcon, keywords: ["rumah", "kost", "kos", "sewa", "apartemen", "home"] },
  { label: "Gaya Hidup", Icon: GiftIcon, keywords: ["lifestyle", "gaya hidup", "hadiah", "gift", "self", "salon", "barbershop"] },
  { label: "Lainnya", Icon: TagIcon, keywords: ["lain", "lainnya", "other", "misc"] },
];

export const FINANCE_CATEGORIES = FINANCE_DEFS.map(({ label }) => label);

export function FinanceCategoryIco({ category, size = 18 }: { category: TransactionCategory; size?: number }) {
  const needle = category.toLowerCase();
  const def =
    FINANCE_DEFS.find((d) => d.label.toLowerCase() === needle) ??
    FINANCE_DEFS.find((d) => d.keywords.some((k) => needle.includes(k)));
  const Cmp = def?.Icon ?? TagIcon;
  return <Cmp size={size} />;
}
