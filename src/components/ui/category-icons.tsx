"use client";

/**
 * Icon kategori bergaya "flat filled" — estetika populer ala Flaticon
 * (bentuk solid, membulat, 2–3 warna per icon) namun digambar ORISINAL
 * dengan palet botanical Rutina (docs/design-system.md).
 *
 * Mengapa bukan aset dari flaticon.com: icon Flaticon berhak cipta
 * (lisensi gratis wajib atribusi + distribusi via CDN mereka), dan
 * Rutina adalah PWA — icon harus tetap tampil saat offline. SVG inline
 * orisinal memenuhi keduanya.
 */

import type { Habit } from "@/lib/types";

const C = {
  leaf: "#417a57",
  leafDark: "#2f6245",
  leafSoft: "#a9c58e",
  leafDeep: "#8fb57a",
  leafMist: "#e7f1e3",
  ivory: "#fff7ef",
  paper: "#fffdf9",
  cream: "#f3ead9",
  peach: "#e8b765",
  peachSoft: "#d9a28a",
  coral: "#d9826b",
  ink: "#302d2a",
};

function Svg({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ─────────────────────────── Habit glyphs ─────────────────────────── */

function WaterIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M16 3.6c4.9 6 8.6 10.2 8.6 14.9a8.6 8.6 0 0 1-17.2 0C7.4 13.8 11.1 9.6 16 3.6Z" fill={C.leafSoft} />
      <path d="M16 8.4c2.9 3.6 4.8 6.2 4.8 8.9a4.8 4.8 0 1 1-9.6 0c0-2.7 1.9-5.3 4.8-8.9Z" fill={C.leafMist} />
      <circle cx="20.6" cy="20.4" r="1.6" fill={C.paper} />
    </Svg>
  );
}

function BookIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="4" y="24" width="24" height="4.6" rx="2.3" fill={C.leaf} />
      <path d="M16 8.6C13.4 6.7 10 5.9 6.4 6.1c-.8 0-1.4.6-1.4 1.4v14.9h11V8.6Z" fill={C.ivory} />
      <path d="M16 8.6c2.6-1.9 6-2.7 9.6-2.5.8 0 1.4.6 1.4 1.4v14.9h-11V8.6Z" fill={C.cream} />
      <rect x="14.8" y="8" width="2.4" height="16.4" fill={C.peach} />
      <rect x="7.6" y="10.6" width="5.4" height="1.7" rx=".85" fill={C.leafSoft} />
      <rect x="7.6" y="14.4" width="5.4" height="1.7" rx=".85" fill="#d9e8cf" />
      <rect x="19" y="10.6" width="5.4" height="1.7" rx=".85" fill={C.leafSoft} />
      <rect x="19" y="14.4" width="5.4" height="1.7" rx=".85" fill="#d9e8cf" />
    </Svg>
  );
}

function MovementIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="11" y="14.6" width="10" height="2.8" rx="1.4" fill={C.leafDark} />
      <rect x="6.4" y="10.4" width="4.6" height="11.2" rx="2.2" fill={C.leaf} />
      <rect x="21" y="10.4" width="4.6" height="11.2" rx="2.2" fill={C.leaf} />
      <rect x="11.6" y="12.4" width="2.6" height="7.2" rx="1.3" fill={C.peach} />
      <rect x="17.8" y="12.4" width="2.6" height="7.2" rx="1.3" fill={C.peach} />
    </Svg>
  );
}

function WriteIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="13" y="3.2" width="6" height="4.6" rx="1.7" fill={C.peachSoft} />
      <rect x="13" y="7.8" width="6" height="2.6" rx="1.2" fill={C.leafDark} />
      <rect x="13" y="10.4" width="6" height="12" fill={C.peach} />
      <rect x="13" y="14.6" width="6" height="1.9" rx=".95" fill={C.ivory} />
      <path d="M13 22.4h6l-3 5.2-3-5.2Z" fill={C.cream} />
      <path d="M14.8 25.6h2.4L16 27.6l-1.2-2Z" fill={C.ink} />
    </Svg>
  );
}

function MindIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <ellipse cx="10" cy="15" rx="3.4" ry="7" fill={C.leafSoft} transform="rotate(26 10 15)" />
      <ellipse cx="22" cy="15" rx="3.4" ry="7" fill={C.leafSoft} transform="rotate(-26 22 15)" />
      <ellipse cx="6.8" cy="19" rx="2.5" ry="5" fill={C.leafDeep} transform="rotate(54 6.8 19)" />
      <ellipse cx="25.2" cy="19" rx="2.5" ry="5" fill={C.leafDeep} transform="rotate(-54 25.2 19)" />
      <path d="M16 6.2c2.8 2.4 4.3 5.5 4.3 9.1 0 4.3-1.8 8.2-4.3 11.5-2.5-3.3-4.3-7.2-4.3-11.5 0-3.6 1.5-6.7 4.3-9.1Z" fill={C.leaf} />
      <path d="M5.6 25.6c2.9 2.3 6.5 3.7 10.4 3.7s7.5-1.4 10.4-3.7c-3-1.4-6.6-2.1-10.4-2.1s-7.4.7-10.4 2.1Z" fill={C.leafDark} />
      <circle cx="16" cy="20.4" r="1.7" fill={C.peach} />
    </Svg>
  );
}

const HABIT_ICONS: Record<Habit["icon"], (props: { size?: number }) => React.ReactElement> = {
  water: WaterIcon,
  book: BookIcon,
  movement: MovementIcon,
  write: WriteIcon,
  mind: MindIcon,
};

/** Icon habit gaya flat-filled — pengganti inernal lama berbasis Lucide garis. */
export function HabitArtIcon({ icon, size = 20 }: { icon: Habit["icon"]; size?: number }) {
  const Icon = HABIT_ICONS[icon] ?? MindIcon;
  return <Icon size={size} />;
}

/* ─────────────────────── Finance category icons ─────────────────────── */

function GajiIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="4.8" y="10" width="22.4" height="14.6" rx="3.2" fill={C.leaf} />
      <rect x="4.8" y="10" width="22.4" height="4.4" rx="2.2" fill={C.leafDark} />
      <rect x="4.8" y="21.6" width="22.4" height="1.7" rx=".85" fill={C.leafSoft} />
      <circle cx="22.2" cy="17.4" r="3.6" fill={C.peach} />
      <circle cx="22.2" cy="17.4" r="2.2" fill={C.paper} />
      <rect x="20.9" y="16.8" width="2.6" height="1.2" rx=".6" fill={C.leaf} />
    </Svg>
  );
}

function FreelanceIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="7" y="7" width="18" height="12.4" rx="2.2" fill={C.leaf} />
      <rect x="9.2" y="9.2" width="13.6" height="8" rx="1.4" fill={C.ivory} />
      <ellipse cx="13.2" cy="13.2" rx="2.1" ry="1.3" fill={C.leafSoft} transform="rotate(-34 13.2 13.2)" />
      <ellipse cx="18.8" cy="13.2" rx="2.1" ry="1.3" fill={C.leafDeep} transform="rotate(34 18.8 13.2)" />
      <rect x="15.4" y="12.4" width="1.2" height="3.6" rx=".6" fill={C.leafDeep} />
      <rect x="4.4" y="19.6" width="23.2" height="3.4" rx="1.7" fill={C.leafDark} />
      <rect x="13.4" y="19.6" width="5.2" height="1.4" rx=".7" fill={C.ivory} />
    </Svg>
  );
}

function MakananIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="12" y="5.6" width="2.2" height="5.4" rx="1.1" fill={C.leafSoft} transform="rotate(-12 13.1 8.3)" />
      <rect x="17.8" y="5.6" width="2.2" height="5.4" rx="1.1" fill={C.leafSoft} transform="rotate(12 18.9 8.3)" />
      <path d="M5.2 15.2h21.6c-.2 6-3.7 11.2-9 13.4-.6.2-1.2.2-1.8 0-5.3-2.2-8.8-7.4-9-13.4Z" fill={C.peachSoft} />
      <rect x="4.4" y="13" width="23.2" height="3.2" rx="1.6" fill={C.peach} />
      <path d="M9 18.6c1.3 3.3 4 6 7.6 7.2" stroke={C.ivory} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
    </Svg>
  );
}

function TransportasiIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M10.6 9.4c.8-.9 1.9-1.4 3.1-1.4h4.6c1 0 2 .4 2.7 1.2l3.9 4.4H7.4l3.2-4.2Z" fill={C.leafDeep} />
      <rect x="10" y="12.2" width="11.6" height="3.2" rx="1.2" fill={C.ivory} />
      <rect x="4.6" y="14.4" width="22.8" height="8.8" rx="3" fill={C.leaf} />
      <rect x="4.6" y="20.4" width="22.8" height="2.8" rx="1.4" fill={C.leafDark} />
      <rect x="25.2" y="16.4" width="2.4" height="1.7" rx=".85" fill={C.peach} />
      <rect x="4.4" y="16.4" width="2.2" height="1.7" rx=".85" fill={C.peach} />
      <circle cx="10.2" cy="23.4" r="3.3" fill={C.ink} />
      <circle cx="10.2" cy="23.4" r="1.35" fill={C.cream} />
      <circle cx="22" cy="23.4" r="3.3" fill={C.ink} />
      <circle cx="22" cy="23.4" r="1.35" fill={C.cream} />
    </Svg>
  );
}

function TagihanIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M7.6 5.2h16.8v19l-2.8 2-2.8-2-2.8 2-2.8-2-2.8 2-2.8-2-2.8 2V5.2Z" fill={C.ivory} />
      <rect x="7.6" y="5.2" width="16.8" height="5" fill={C.leaf} />
      <rect x="10.4" y="13" width="11.2" height="1.8" rx=".9" fill={C.leafSoft} />
      <rect x="10.4" y="16.8" width="8.2" height="1.8" rx=".9" fill="#d9e8cf" />
      <circle cx="21.4" cy="21.8" r="2.6" fill={C.peach} />
      <rect x="20.2" y="21.2" width="2.4" height="1.2" rx=".6" fill={C.paper} />
    </Svg>
  );
}

function LifestyleIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="11.2" y="4.8" width="2.6" height="6.8" rx="1.3" fill={C.leafDark} />
      <rect x="18.2" y="4.8" width="2.6" height="6.8" rx="1.3" fill={C.leafDark} />
      <path d="M7.8 10.8h16.4l-1.5 15.4c-.1 1-1 1.8-2 1.8H11.3c-1 0-1.9-.8-2-1.8L7.8 10.8Z" fill={C.peachSoft} />
      <rect x="7.8" y="10.8" width="16.4" height="2.3" rx="1.15" fill={C.peach} />
      <path d="M16 22.8c-2.6-2-4-3.6-4-5.3 0-1.5 1.2-2.7 2.7-2.7.6 0 1.1.2 1.3.5.2-.3.7-.5 1.3-.5 1.5 0 2.7 1.2 2.7 2.7 0 1.7-1.4 3.3-4 5.3Z" fill={C.ivory} />
    </Svg>
  );
}

function KesehatanIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M16 27.8c-.7 0-1.3-.2-1.8-.7C9 22.8 5.4 19.2 5.4 14.4 5.4 10.8 8.2 8 11.6 8c1.8 0 3.4.8 4.4 2.1C17 8.8 18.6 8 20.4 8c3.4 0 6.2 2.8 6.2 6.4 0 4.8-3.6 8.4-8.8 12.7-.5.4-1.1.7-1.8.7Z" fill={C.coral} />
      <path d="M9.6 16.6h3.1l1.9-3.8 3.1 6.8 1.9-3h3.7" stroke={C.ivory} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function LainnyaIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="5" y="5" width="22" height="22" rx="7" fill={C.leafMist} />
      <circle cx="11" cy="16" r="2.2" fill={C.leafDark} />
      <circle cx="16" cy="16" r="2.2" fill={C.leafDark} />
      <circle cx="21" cy="16" r="2.2" fill={C.leafDark} />
    </Svg>
  );
}

type FinanceIconKey = "gaji" | "freelance" | "makanan" | "transportasi" | "tagihan" | "lifestyle" | "kesehatan" | "lainnya";

const FINANCE_ICONS: Record<FinanceIconKey, (props: { size?: number }) => React.ReactElement> = {
  gaji: GajiIcon,
  freelance: FreelanceIcon,
  makanan: MakananIcon,
  transportasi: TransportasiIcon,
  tagihan: TagihanIcon,
  lifestyle: LifestyleIcon,
  kesehatan: KesehatanIcon,
  lainnya: LainnyaIcon,
};

const FINANCE_EXACT: Array<[string, FinanceIconKey]> = [
  ["Gaji", "gaji"], ["Freelance", "freelance"], ["Makanan", "makanan"],
  ["Transportasi", "transportasi"], ["Tagihan", "tagihan"], ["Lifestyle", "lifestyle"],
  ["Kesehatan", "kesehatan"], ["Lainnya", "lainnya"],
];

/** Pemetaan pola → icon untuk kategori custom Turso (Kopi, Bensin, dst.). */
const FINANCE_PATTERNS: Array<[RegExp, FinanceIconKey]> = [
  [/freelance|gig|project|proyek|klien|client|jasa/i, "freelance"],
  [/gaji|salary|bonus|komisi|payroll|dividen/i, "gaji"],
  [/makan|minum|kopi|jajan|resto|restaur|food|snack|sarapan|cafe|kedai/i, "makanan"],
  [/transport|bensin|gojek|grab|ojek|parkir|kereta|mobil|taksi|travel|gojek|flight|tiket/i, "transportasi"],
  [/tagihan|listrik|internet|wifi|pulsa|langganan|subscription|billing|pdam|gas|pajak/i, "tagihan"],
  [/lifestyle|hiburan|belanja|shopping|game|film|bioskop|konser|libur|vacation/i, "lifestyle"],
  [/kesehatan|obat|dokter|clinic|apotek|medis|health|gym|fitness|olahraga/i, "kesehatan"],
];

function financeIconKey(category: string): FinanceIconKey {
  const name = category.trim();
  for (const [exact, key] of FINANCE_EXACT) {
    if (name.toLocaleLowerCase("id-ID") === exact.toLocaleLowerCase("id-ID")) return key;
  }
  for (const [pattern, key] of FINANCE_PATTERNS) {
    if (pattern.test(name)) return key;
  }
  return "lainnya";
}

/**
 * Icon kategori keuangan gaya flat-filled. Menerima nama kategori apa pun
 * (bawaan maupun custom Turso) dan memetakan ke icon terdekat — pola
 * regex mengikuti gaya categoryEmoji() di lib/storytelling.ts.
 */
export function FinanceCategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = FINANCE_ICONS[financeIconKey(category)];
  return <Icon size={size} />;
}
