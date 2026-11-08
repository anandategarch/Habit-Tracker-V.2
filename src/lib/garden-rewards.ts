// Perlindungan streak (v0.26) — sisa mekanik "garden rewards" yang masih
// dipakai Beranda: kuota perisai 1×/minggu dan deteksi jeda pencatatan.
// Semua state disimpan client-side (localStorage) tanpa mengubah schema.

import { todayISO } from "@/lib/format";

const SHIELD_WEEKS_KEY = "rutina.v2.garden-shields";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function shiftISO(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Kunci minggu ISO ("2026-W45") — dipakai untuk kuota perisai 1x/minggu. */
export function isoWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  const day = date.getUTCDay() || 7; // Senin=1..Minggu=7
  const thursday = new Date(date);
  thursday.setUTCDate(thursday.getUTCDate() + (4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Perisai streak — 1x per minggu, melindungi streak dari bolos 1 hari.
// ---------------------------------------------------------------------------

function consumedWeeks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = safeParse<string[]>(window.localStorage.getItem(SHIELD_WEEKS_KEY), []);
    return Array.isArray(parsed) ? parsed.filter((week) => typeof week === "string") : [];
  } catch { return []; }
}

export function shieldAvailableThisWeek(): boolean {
  return !consumedWeeks().includes(isoWeekKey(todayISO()));
}

/** Coba pakai perisai minggu ini. return false jika kuota minggu ini sudah habis. */
export function consumeShield(): boolean {
  if (typeof window === "undefined") return false;
  const week = isoWeekKey(todayISO());
  const used = consumedWeeks();
  if (used.includes(week)) return false;
  used.push(week);
  try {
    window.localStorage.setItem(SHIELD_WEEKS_KEY, JSON.stringify(used));
    return true;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Deteksi jeda pencatatan — memilih status yang tepat untuk Beranda.
// level: "shield" (bolos 1 hari + perisai tersedia), "parched" (bolos 1 hari),
// "wilted" (bolos ≥2 hari), "lush" (hari ini sudah ada penyelesaian), null (datar).
// ---------------------------------------------------------------------------

export interface GardenRhythm {
  level: "shield" | "parched" | "wilted" | "lush" | null;
  streak: number;
  gapDays: number | null;
}

export function computeGardenRhythm(
  todayKey: string,
  byDate: Map<string, number>,
  completedToday: number,
  shieldAvailable: boolean,
): GardenRhythm {
  if (byDate.size === 0) return { level: null, streak: 0, gapDays: null };
  const yesterday = shiftISO(todayKey, -1);
  const dayBeforeYesterday = shiftISO(todayKey, -2);
  const todayCount = Math.max(completedToday, byDate.get(todayKey) ?? 0);

  // Streak helper: hari berturut-turut (berakhir di startKey) dengan ≥1 penyelesaian.
  const walkFrom = (startKey: string): number => {
    let streak = 0;
    let cursor = startKey;
    while ((byDate.get(cursor) ?? 0) > 0) { streak += 1; cursor = shiftISO(cursor, -1); }
    return streak;
  };

  if (todayCount > 0) return { level: "lush", streak: walkFrom(yesterday) + 1, gapDays: 0 };
  if ((byDate.get(yesterday) ?? 0) > 0) return { level: null, streak: walkFrom(yesterday), gapDays: 0 };

  // Hari ini belum ada penyelesaian & kemarin nol: hitung panjang jeda.
  let gap = 1;
  let cursor = dayBeforeYesterday;
  while ((byDate.get(cursor) ?? 0) === 0 && gap < 14) { gap += 1; cursor = shiftISO(cursor, -1); }
  const hadActivityBeforeGap = (byDate.get(cursor) ?? 0) > 0;

  if (gap === 1 && hadActivityBeforeGap && shieldAvailable) {
    // Perisai menjaga hari kosong kemarin: streak berlanjut melewatinya.
    return { level: "shield", streak: walkFrom(dayBeforeYesterday) + 1, gapDays: 1 };
  }
  if (gap === 1) return { level: "parched", streak: walkFrom(dayBeforeYesterday), gapDays: 1 };
  return { level: "wilted", streak: walkFrom(dayBeforeYesterday), gapDays: gap };
}
