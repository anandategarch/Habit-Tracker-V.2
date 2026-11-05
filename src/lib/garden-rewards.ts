// Garden rewards — mekanik psikologi "kebun yang hidup" (Fase 2).
// Semua state disimpan client-side (localStorage) tanpa mengubah schema.
// Prinsip: variable reward (benih), loss aversion (kebun menguning),
// perlindungan investasi (bunga pelindung), dan goal gradient (copy milestone).

import { todayISO } from "@/lib/format";

export type SeedRarity = "umum" | "langka" | "legendaris";
export interface GardenSeed { id: string; name: string; rarity: SeedRarity; date: string; }

const SEED_POOL: Record<SeedRarity, string[]> = {
  umum: ["Benih Melati", "Benih Kemuning", "Benih Adas", "Benih Serai", "Benih Kemangi"],
  langka: ["Benih Kamboja Jepang", "Benih Anggrek Bulan", "Benih Teratai Merah Muda", "Benih Sakura Kebun"],
  legendaris: ["Benih Bunga Padma", "Benih Camellia Emas", "Benih Pohon Seribu Tahun"],
};
// Distribusi variable reward: mayoritas umum, sesekali langka, sangat jarang legendaris.
const RARITY_TABLE: Array<{ rarity: SeedRarity; weight: number }> = [
  { rarity: "umum", weight: 70 },
  { rarity: "langka", weight: 24 },
  { rarity: "legendaris", weight: 6 },
];

const SEED_BANK_KEY = "rutina.v2.seed-bank";
const BLOOM_GUARD_KEY = "rutina.v2.bloom-guard";
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

/** Kunci minggu ISO ("2026-W45") — dipakai untuk kuota bunga pelindung 1x/minggu. */
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
// Benih kejutan (variable reward) — diberikan saat 100% habit selesai.
// ---------------------------------------------------------------------------

export function rollSeed(dateKey: string): GardenSeed {
  const total = RARITY_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let rarity: SeedRarity = "umum";
  for (const item of RARITY_TABLE) {
    if (roll < item.weight) { rarity = item.rarity; break; }
    roll -= item.weight;
  }
  const pool = SEED_POOL[rarity];
  const name = pool[Math.floor(Math.random() * pool.length)];
  return { id: crypto.randomUUID(), name, rarity, date: dateKey };
}

export function getSeedBank(): GardenSeed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEED_BANK_KEY);
    const parsed = safeParse<GardenSeed[]>(raw, []);
    return Array.isArray(parsed) ? parsed.filter((seed) => seed && typeof seed.name === "string") : [];
  } catch { return []; }
}

export function addSeed(seed: GardenSeed): void {
  if (typeof window === "undefined") return;
  try {
    const bank = getSeedBank();
    bank.push(seed);
    window.localStorage.setItem(SEED_BANK_KEY, JSON.stringify(bank));
    window.dispatchEvent(new CustomEvent("rutina:seed-added", { detail: { total: bank.length } }));
  } catch { /* storage tidak tersedia — benih tetap ada di sesi ini */ }
}

export function summarizeSeedBank(): { total: number; langka: number; legendaris: number } {
  const bank = getSeedBank();
  return {
    total: bank.length,
    langka: bank.filter((seed) => seed.rarity === "langka").length,
    legendaris: bank.filter((seed) => seed.rarity === "legendaris").length,
  };
}

// ---------------------------------------------------------------------------
// Full Bloom guard — overlay perayaan 100% hanya tampil sekali per hari.
// ---------------------------------------------------------------------------

export function isBloomShownToday(): boolean {
  if (typeof window === "undefined") return true; // SSR: anggap sudah, jangan trigger.
  try { return window.localStorage.getItem(BLOOM_GUARD_KEY) === todayISO(); } catch { return true; }
}

export function markBloomShown(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(BLOOM_GUARD_KEY, todayISO()); } catch { /* abaikan */ }
}

// Ledger hari berbunga (100% habit selesai) — dipakai untuk
// "X hari berbunga berturut-turut" pada overlay Full Bloom.
const BLOOM_DAYS_KEY = "rutina.v2.bloom-days";

function bloomDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = safeParse<string[]>(window.localStorage.getItem(BLOOM_DAYS_KEY), []);
    return Array.isArray(parsed) ? parsed.filter((day) => typeof day === "string") : [];
  } catch { return []; }
}

export function recordBloomDay(dateKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const days = bloomDays();
    if (!days.includes(dateKey)) {
      days.push(dateKey);
      window.localStorage.setItem(BLOOM_DAYS_KEY, JSON.stringify(days.slice(-400)));
    }
  } catch { /* abaikan */ }
}

/** Hari berturut-turut (berakhir hari ini) dengan 100% habit selesai. */
export function getBloomStreakToday(): number {
  const days = bloomDays();
  if (days.length === 0) return 0;
  const set = new Set(days);
  const today = todayISO();
  if (!set.has(today)) return 0;
  let streak = 0;
  let cursor = today;
  const shift = (key: string) => shiftISO(key, -1);
  while (set.has(cursor)) { streak += 1; cursor = shift(cursor); }
  return streak;
}

// ---------------------------------------------------------------------------
// Bunga pelindung — 1x per minggu, melindungi bloom streak dari bolos 1 hari.
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
// Ritme kebun — loss aversion: mendeteksi bolos dan memilih kartu yang tepat.
// level: "shield" (bolos 1 hari + perisai tersedia), "parched" (bolos 1 hari),
// "wilted" (bolos ≥2 hari), "lush" (hari ini sudah ada langkah), null (datar).
// ---------------------------------------------------------------------------

export interface GardenRhythm {
  level: "shield" | "parched" | "wilted" | "lush" | null;
  bloomStreak: number;
  gapDays: number | null;
}

export function computeGardenRhythm(
  todayKey: string,
  byDate: Map<string, number>,
  completedToday: number,
  shieldAvailable: boolean,
): GardenRhythm {
  if (byDate.size === 0) return { level: null, bloomStreak: 0, gapDays: null };
  const yesterday = shiftISO(todayKey, -1);
  const dayBeforeYesterday = shiftISO(todayKey, -2);
  const todayCount = Math.max(completedToday, byDate.get(todayKey) ?? 0);

  // Bloom streak helper: hari berturut-turut (berakhir di startKey) dengan ≥1 langkah.
  const walkFrom = (startKey: string): number => {
    let streak = 0;
    let cursor = startKey;
    while ((byDate.get(cursor) ?? 0) > 0) { streak += 1; cursor = shiftISO(cursor, -1); }
    return streak;
  };

  if (todayCount > 0) return { level: "lush", bloomStreak: walkFrom(yesterday) + 1, gapDays: 0 };
  if ((byDate.get(yesterday) ?? 0) > 0) return { level: null, bloomStreak: walkFrom(yesterday), gapDays: 0 };

  // Hari ini belum ada langkah & kemarin nol: hitung panjang bolos.
  let gap = 1;
  let cursor = dayBeforeYesterday;
  while ((byDate.get(cursor) ?? 0) === 0 && gap < 14) { gap += 1; cursor = shiftISO(cursor, -1); }
  const hadActivityBeforeGap = (byDate.get(cursor) ?? 0) > 0;

  if (gap === 1 && hadActivityBeforeGap && shieldAvailable) {
    // Perisai menjaga hari kosong kemarin: streak berlanjut melewatinya.
    return { level: "shield", bloomStreak: walkFrom(dayBeforeYesterday) + 1, gapDays: 1 };
  }
  if (gap === 1) return { level: "parched", bloomStreak: walkFrom(dayBeforeYesterday), gapDays: 1 };
  return { level: "wilted", bloomStreak: walkFrom(dayBeforeYesterday), gapDays: gap };
}
