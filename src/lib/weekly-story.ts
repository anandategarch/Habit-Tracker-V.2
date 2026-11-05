// Cerita Minggu (Fase 3, v1.1) — rekap minggu kalender terakhir dalam format
// "story" (Instagram-style). Semua perhitungan murni dan teruji terpisah
// dari UI: rentang minggu, metrik agregat, dan penyusunan slide.
//
// v1.1 — lapisan data storytelling:
// - buildStorySlides(metrics, previous?): chip “vs pekan sebelumnya”
//   (langkah / pengeluaran / mood) — hanya bila pekan pembanding tercatat.
// - strongestDayLabel: hari terkuat pekan (bila ada pemenang jelas).
// - Slide “time”: menit yang ditanam (dari time_spent_minutes).
// - getStoryWeeks: rentang beberapa pekan untuk arsip cerita.
//
// Sumber data:
// - habit records  : /api/history (server; bisa gagal saat offline/Turso mati)
// - progress/durasi: /api/history → progress[] (time_spent_minutes)
// - transaksi      : workspace (localStorage + sync)
// - benih & bloom  : garden-rewards ledger (localStorage)
// - check-in       : modul extended (localStorage)

import type { Transaction } from "@/lib/types";
import type { DailyCheckin } from "@/lib/module-types";
import type { GardenSeed } from "@/lib/garden-rewards";
import { isoWeekKey } from "@/lib/garden-rewards";

// ---------------------------------------------------------------------------
// Rentang minggu kalender terakhir yang sudah selesai (Senin–Minggu, WIB).
// ---------------------------------------------------------------------------

export interface StoryWeekRange {
  start: string; // Senin (ISO)
  end: string;   // Minggu (ISO)
  weekKey: string; // "2026-W44"
}

function isoShift(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Minggu kalender terakhir relatif `today` (ISO). Senin 00:00 s.d. Minggu. */
export function getLastWeekRange(today: string): StoryWeekRange {
  const anchor = new Date(`${today}T12:00:00+07:00`);
  const weekday = anchor.getUTCDay() || 7; // Senin=1..Minggu=7
  const mondayKey = isoShift(today, -(weekday - 1) - 7);
  return {
    start: mondayKey,
    end: isoShift(mondayKey, 6),
    weekKey: isoWeekKey(mondayKey),
  };
}

export function formatStoryRangeLabel(range: StoryWeekRange): string {
  const start = new Date(`${range.start}T12:00:00+07:00`);
  const end = new Date(`${range.end}T12:00:00+07:00`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Asia/Jakarta",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

/**
 * Rentang beberapa pekan kalender terakhir yang sudah selesai, dari yang
 * terbaru ke yang terlama: [pekan lalu, 2 pekan lalu, …]. Dipakai arsip
 * cerita — pekan terakhir dalam daftar hanya menjadi pembanding.
 */
export function getStoryWeeks(today: string, count: number): StoryWeekRange[] {
  const last = getLastWeekRange(today);
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const start = isoShift(last.start, -7 * index);
    return { start, end: isoShift(start, 6), weekKey: isoWeekKey(start) };
  });
}

// ---------------------------------------------------------------------------
// Penanda "sudah ditonton" per minggu (localStorage).
// ---------------------------------------------------------------------------

const SEEN_PREFIX = "rutina.v2.story-seen.";

export function isStorySeen(weekKey: string): boolean {
  if (typeof window === "undefined") return true; // SSR: anggap sudah ditonton.
  try { return window.localStorage.getItem(SEEN_PREFIX + weekKey) === "1"; } catch { return true; }
}

export function markStorySeen(weekKey: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SEEN_PREFIX + weekKey, "1"); } catch { /* opsional */ }
}

// ---------------------------------------------------------------------------
// Metrik minggu.
// ---------------------------------------------------------------------------

export interface StoryHabitRecord { habitId: string; title: string; date: string }

/** Baris progress dari /api/history — dipakai untuk “menit yang ditanam”. */
export interface StoryProgressRecord { habitId: string; title: string; date: string; timeSpentMinutes: number }

export interface WeeklyStoryMetrics {
  range: StoryWeekRange;
  rangeLabel: string;
  /** Riwayat habit berhasil dimuat dari server (false = 503/offline). */
  historyAvailable: boolean;
  steps: number;
  activeDays: number;
  daily: Array<{ date: string; label: string; count: number }>;
  bloomDays: number;
  seeds: GardenSeed[];
  seedRareCount: number;
  finance: {
    income: number;
    expense: number;
    net: number;
    count: number;
    topCategory: string | null;
    topCategoryAmount: number;
  };
  checkin: { count: number; avgMood: number; avgSleep: number };
  /** Total menit tercatat (timer habit) dalam rentang — 0 bila tak ada. */
  timeMinutes: number;
  /** Jumlah hari yang punya durasi tercatat (> 0 menit). */
  timeDays: number;
  hasActivity: boolean;
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function buildWeeklyStoryMetrics(input: {
  range: StoryWeekRange;
  habitRecords: StoryHabitRecord[];
  historyAvailable: boolean;
  transactions: Transaction[];
  seeds: GardenSeed[];
  bloomDays: string[];
  checkins: DailyCheckin[];
  progress: StoryProgressRecord[];
}): WeeklyStoryMetrics {
  const { range, habitRecords, historyAvailable, transactions, seeds, bloomDays, checkins, progress } = input;
  const inRange = (date: string) => date >= range.start && date <= range.end;

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = isoShift(range.start, index);
    return { date, label: DAY_LABELS[index], count: 0 };
  });
  const byDate = new Map(daily.map((day) => [day.date, day]));
  habitRecords.forEach((record) => {
    const day = byDate.get(record.date);
    if (day) day.count += 1;
  });
  const steps = daily.reduce((sum, day) => sum + day.count, 0);
  const activeDays = daily.filter((day) => day.count > 0).length;

  const weekSeeds = seeds.filter((seed) => inRange(seed.date));
  const weekBloom = bloomDays.filter((date) => inRange(date));

  const weekTx = transactions.filter((transaction) => inRange(transaction.date));
  const income = weekTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = weekTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const categoryTotals = new Map<string, number>();
  weekTx.forEach((t) => {
    if (t.type !== "expense") return;
    categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + t.amount);
  });
  let topCategory: string | null = null;
  let topCategoryAmount = 0;
  categoryTotals.forEach((amount, category) => {
    if (amount > topCategoryAmount) { topCategory = category; topCategoryAmount = amount; }
  });

  const weekCheckins = checkins.filter((item) => inRange(item.date));
  const avgMood = weekCheckins.length
    ? weekCheckins.reduce((sum, item) => sum + item.mood, 0) / weekCheckins.length
    : 0;
  const avgSleep = weekCheckins.length
    ? weekCheckins.reduce((sum, item) => sum + item.sleepHours, 0) / weekCheckins.length
    : 0;

  // Menit yang ditanam: agregasi time_spent_minutes per hari dalam rentang.
  const minutesByDate = new Map<string, number>();
  progress.forEach((record) => {
    if (!inRange(record.date) || record.timeSpentMinutes <= 0) return;
    minutesByDate.set(record.date, (minutesByDate.get(record.date) ?? 0) + record.timeSpentMinutes);
  });
  let timeMinutes = 0;
  minutesByDate.forEach((total) => { timeMinutes += total; });
  const timeDays = [...minutesByDate.values()].filter((total) => total > 0).length;

  const hasActivity = steps > 0 || weekSeeds.length > 0 || weekBloom.length > 0
    || weekTx.length > 0 || weekCheckins.length > 0;

  return {
    range,
    rangeLabel: formatStoryRangeLabel(range),
    historyAvailable,
    steps,
    activeDays,
    daily,
    bloomDays: weekBloom.length,
    seeds: weekSeeds,
    seedRareCount: weekSeeds.filter((seed) => seed.rarity !== "umum").length,
    finance: { income, expense, net: income - expense, count: weekTx.length, topCategory, topCategoryAmount },
    checkin: { count: weekCheckins.length, avgMood, avgSleep },
    timeMinutes,
    timeDays,
    hasActivity,
  };
}

// ---------------------------------------------------------------------------
// Slide cerita — discriminated union yang dirender StoryViewer.
// ---------------------------------------------------------------------------

/** Chip perbandingan “vs pekan sebelumnya” — label ber-marka **bold**. */
export interface SlideCompare {
  label: string;
  tone: "up" | "down" | "flat";
}

export type StorySlide =
  | { kind: "cover"; rangeLabel: string; preview: string }
  | { kind: "rhythm"; steps: number; activeDays: number; daily: WeeklyStoryMetrics["daily"]; headline: string; message: string; strongestLabel: string | null; compare: SlideCompare | null }
  | { kind: "bloom"; bloomDays: number; seeds: GardenSeed[]; headline: string; message: string }
  | { kind: "finance"; income: number; expense: number; net: number; count: number; topCategory: string | null; topCategoryAmount: number; headline: string; message: string; compare: SlideCompare | null }
  | { kind: "checkin"; count: number; avgMood: number; avgSleep: number; moodWord: string; headline: string; message: string; compare: SlideCompare | null }
  | { kind: "time"; minutes: number; days: number; perDay: number; hoursLabel: string | null; headline: string; message: string }
  | { kind: "closing"; rangeLabel: string; recap: string };

function moodWord(avg: number): string {
  if (avg >= 4.5) return "cerah";
  if (avg >= 3.5) return "baik";
  if (avg >= 2.5) return "biasa saja";
  if (avg >= 1.5) return "agak berat";
  return "melelahkan";
}

/** Hari terkuat pekan: hanya bila ada pemenang yang jelas (maks ≥ 2 langkah). */
function strongestDayLabel(daily: WeeklyStoryMetrics["daily"]): string | null {
  const max = Math.max(...daily.map((day) => day.count));
  if (max < 2) return null;
  const top = daily.filter((day) => day.count === max);
  if (top.length === 1) return `${top[0].label} jadi hari terkuatmu`;
  if (top.length === 2) return `${top[0].label} & ${top[1].label} jadi hari terkuatmu`;
  return null; // ≥3 hari seri — terlalu rancu untuk disebut "terkuat".
}

function rhythmCompare(current: WeeklyStoryMetrics, previous: WeeklyStoryMetrics | undefined): SlideCompare | null {
  if (!previous || !previous.historyAvailable) return null;
  const delta = current.steps - previous.steps;
  if (delta > 0) return { label: `↑${delta} langkah vs pekan sebelumnya`, tone: "up" };
  if (delta < 0) return { label: `↓${-delta} langkah vs pekan sebelumnya`, tone: "down" };
  return { label: "≈ sama dengan pekan sebelumnya", tone: "flat" };
}

function financeCompare(current: WeeklyStoryMetrics, previous: WeeklyStoryMetrics | undefined): SlideCompare | null {
  if (!previous) return null;
  const prevExpense = previous.finance.expense;
  if (prevExpense <= 0 || current.finance.expense <= 0) return null;
  const pct = Math.round((current.finance.expense / prevExpense - 1) * 100);
  if (pct <= -5) return { label: `Pengeluaran **turun ${-pct}%** vs pekan lalu`, tone: "up" };
  if (pct >= 5) return { label: `Pengeluaran **naik ${pct}%** vs pekan lalu`, tone: "down" };
  return { label: "Pengeluaran **setara** pekan lalu", tone: "flat" };
}

function checkinCompare(current: WeeklyStoryMetrics, previous: WeeklyStoryMetrics | undefined): SlideCompare | null {
  if (!previous || previous.checkin.count <= 0 || current.checkin.count <= 0) return null;
  const delta = current.checkin.avgMood - previous.checkin.avgMood;
  const label = Math.abs(delta).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (delta >= 0.5) return { label: `Mood **naik ${label}** dari pekan lalu`, tone: "up" };
  if (delta <= -0.5) return { label: `Mood **turun ${label}** dari pekan lalu`, tone: "down" };
  return { label: "Mood **sejalan** dengan pekan lalu", tone: "flat" };
}

export function buildStorySlides(metrics: WeeklyStoryMetrics, previous?: WeeklyStoryMetrics): StorySlide[] {
  const slides: StorySlide[] = [];

  const previewBits = [
    metrics.steps > 0 ? `${metrics.steps} langkah` : "",
    metrics.seeds.length > 0 ? `${metrics.seeds.length} benih` : "",
    metrics.finance.count > 0 ? `${metrics.finance.count} catatan uang` : "",
    metrics.checkin.count > 0 ? `${metrics.checkin.count} check-in` : "",
  ].filter(Boolean);
  slides.push({
    kind: "cover",
    rangeLabel: metrics.rangeLabel,
    preview: previewBits.length ? previewBits.join(" · ") : "sekilas pekan yang telah berlalu",
  });

  // Ritme kebiasaan — hanya bila riwayat server tersedia (0 yang jujur)
  // atau memang ada langkah tercatat.
  if (metrics.historyAvailable || metrics.steps > 0) {
    let headline: string;
    let message: string;
    if (metrics.steps === 0) {
      headline = "Minggu yang tenang";
      message = "Tidak ada langkah kebiasaan yang tercatat pekan lalu — dan itu tidak apa-apa. Pekan ini, satu langkah kecil sudah cukup untuk memulai.";
    } else if (metrics.activeDays === 7) {
      headline = "Tujuh hari penuh langkah";
      message = "Setiap hari pekan lalu menyimpan catatan kebiasaanmu. Ritme selaras inilah yang membuat kebun tumbuh.";
    } else if (metrics.activeDays >= 5) {
      headline = "Ritmemu nyaris sempurna";
      message = `${metrics.activeDays} dari 7 hari berisi langkah nyata. Satu dua hari kosong tidak menghapus progres yang sudah kamu tanam.`;
    } else if (metrics.activeDays >= 3) {
      headline = "Kebunmu terus bergerak";
      message = `${metrics.activeDays} hari aktif dengan ${metrics.steps} langkah tercatat. Pelan-pelan, kamu tetap bertumbuh.`;
    } else {
      headline = "Awal yang baik";
      message = `${metrics.steps} langkah tercatat pekan lalu. Konsistensi kecil yang bertahan lebih berharga daripada sempurna yang berhenti.`;
    }
    slides.push({
      kind: "rhythm",
      steps: metrics.steps,
      activeDays: metrics.activeDays,
      daily: metrics.daily,
      headline,
      message,
      strongestLabel: metrics.steps > 0 ? strongestDayLabel(metrics.daily) : null,
      compare: rhythmCompare(metrics, previous),
    });
  }

  // Bloom & benih — tampil bila ada sesuatu yang bisa dirayakan, atau sebagai
  // ajakan lembut saat riwayat hidup (untuk menjaga cerita tetap utuh).
  if (metrics.bloomDays > 0 || metrics.seeds.length > 0 || metrics.historyAvailable) {
    const headline = metrics.bloomDays > 0
      ? `${metrics.bloomDays} hari berbunga penuh`
      : "Belum ada hari berbunga";
    const message = metrics.bloomDays > 0
      ? "Hari-hari ketika seluruh ritualmu tuntas — dan kebunmu membalasnya dengan benih kejutan."
      : "Benih kejutan menunggu satu hari ketika seluruh ritualmu tuntas. Pekan ini, kejar satu hari penuh 🌸";
    slides.push({
      kind: "bloom",
      bloomDays: metrics.bloomDays,
      seeds: metrics.seeds,
      headline,
      message,
    });
  }

  if (metrics.finance.count > 0) {
    const { income, expense, net, topCategory } = metrics.finance;
    const headline = net >= 0 ? "Arus kasmu tertata" : "Catatan yang jujur";
    const message = net >= 0
      ? `Pekan lalu berakhir dengan sisa positif. ${topCategory ? `Pengeluaran terbesar: ${topCategory}.` : "Belanjamu tersebar rapi tanpa satu kategori dominan."}`
      : `Pengeluaran melebihi pemasukan pekan lalu — bukan kegagalan, hanya data untuk pekan ini. ${topCategory ? `Terbesar: ${topCategory}.` : ""}`;
    slides.push({
      kind: "finance",
      income, expense, net,
      count: metrics.finance.count,
      topCategory,
      topCategoryAmount: metrics.finance.topCategoryAmount,
      headline,
      message,
      compare: financeCompare(metrics, previous),
    });
  }

  if (metrics.checkin.count > 0) {
    slides.push({
      kind: "checkin",
      count: metrics.checkin.count,
      avgMood: metrics.checkin.avgMood,
      avgSleep: metrics.checkin.avgSleep,
      moodWord: moodWord(metrics.checkin.avgMood),
      headline: "Kamu meluangkan waktu untuk dirimu",
      message: `${metrics.checkin.count} check-in tercatat. Rata-rata moodmu terasa ${moodWord(metrics.checkin.avgMood)} dengan tidur ${metrics.checkin.avgSleep.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam per hari.`,
      compare: checkinCompare(metrics, previous),
    });
  }

  // Menit yang ditanam — hanya bila durasi benar-benar tercatat (evidence gate).
  if (metrics.timeMinutes > 0) {
    const perDay = Math.max(1, Math.round(metrics.timeMinutes / Math.max(1, metrics.timeDays || metrics.activeDays || 7)));
    const hoursLabel = metrics.timeMinutes >= 60
      ? `≈ ${(metrics.timeMinutes / 60).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam total`
      : null;
    slides.push({
      kind: "time",
      minutes: metrics.timeMinutes,
      days: metrics.timeDays,
      perDay,
      hoursLabel,
      headline: "Waktu kecilmu ikut bertumbuh",
      message: `Pekan lalu kamu meluangkan **${metrics.timeMinutes} menit** — sekitar **${perDay} menit sehari** untuk dirimu. Pelan-pelan, waktu itu menyuburkan.`,
    });
  }

  const recapBits = [
    metrics.steps > 0 ? `${metrics.steps} langkah` : "",
    metrics.bloomDays > 0 ? `${metrics.bloomDays} hari berbunga` : "",
    metrics.seeds.length > 0 ? `${metrics.seeds.length} benih` : "",
    metrics.finance.count > 0 ? `${metrics.finance.count} catatan uang` : "",
    metrics.checkin.count > 0 ? `${metrics.checkin.count} check-in` : "",
  ].filter(Boolean);
  slides.push({
    kind: "closing",
    rangeLabel: metrics.rangeLabel,
    recap: recapBits.length ? recapBits.join(" · ") : "pekan yang telah berlalu",
  });

  return slides;
}
