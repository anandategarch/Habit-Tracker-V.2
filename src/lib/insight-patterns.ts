// Pola menarak lintas-domain (v1) — insight crossover kebiasaan × keuangan.
// "Tiap kamu skip olahraga, kopi naik. Kebetulan? Mungkin bukan."
//
// Aturan kejujuran (evidence-only):
// - Hanya hari yang punya >= 1 transaksi tercatat ("tracked") yang dihitung —
//   hari tanpa catatan tidak bisa dibedakan antara "tidak belanja" dan
//   "tidak dicatat", jadi dikeluarkan seluruhnya.
// - Minimal 3 hari per sisi dan 8 hari tercatat agar rata-rata tidak licin.
// - Selisih harus >= Rp10rb DAN rata-rata >= 1,25× — dua pintu anti-noise.
// - Kalimat selalu menyebut jumlah hari sumber + disclaimer korelasi ≠ sebab.

import { shortRupiah } from "@/lib/storytelling";

export interface CrossoverDay {
  date: string;
  steps: number;
  expense: number;
  /** true bila hari itu punya >= 1 transaksi tercatat (pemasukan/pengeluaran). */
  tracked: boolean;
}

export interface CrossoverStats {
  trackedDays: number;
  activeDays: number;
  quietDays: number;
  activeAvg: number;
  quietAvg: number;
}

export interface CrossoverStory {
  headline: string;
  note: string;
  stats: CrossoverStats;
}

const MIN_DAYS_PER_SIDE = 3;
const MIN_TRACKED_DAYS = 8;
const MIN_RATIO = 1.25;
const MIN_DIFF = 10_000;

export function crossoverStory(days: CrossoverDay[]): CrossoverStory | null {
  const tracked = days.filter((day) => day.tracked);
  if (tracked.length < MIN_TRACKED_DAYS) return null;

  const active = tracked.filter((day) => day.steps > 0);
  const quiet = tracked.filter((day) => day.steps === 0);
  if (active.length < MIN_DAYS_PER_SIDE || quiet.length < MIN_DAYS_PER_SIDE) return null;

  const activeAvg = active.reduce((sum, day) => sum + day.expense, 0) / active.length;
  const quietAvg = quiet.reduce((sum, day) => sum + day.expense, 0) / quiet.length;
  const stats: CrossoverStats = {
    trackedDays: tracked.length,
    activeDays: active.length,
    quietDays: quiet.length,
    activeAvg: Math.round(activeAvg),
    quietAvg: Math.round(quietAvg),
  };

  const source = `Dari **${tracked.length} hari tercatat**: hari aktifmu rata-rata Rp${shortRupiah(activeAvg)}, hari tenangmu Rp${shortRupiah(quietAvg)}.`;

  // Arah 1: hari tanpa habit justru lebih boros — momen "aha" motivasi.
  const quietDiff = quietAvg - activeAvg;
  if (quietDiff >= MIN_DIFF && quietAvg >= activeAvg * MIN_RATIO) {
    return {
      headline: `Di hari **tanpa habit**, pengeluaranmu rata-rata Rp${shortRupiah(quietDiff)} lebih tinggi`,
      note: `${source} Kebetulan? Mungkin bukan — coba tanam satu langkah kecil di hari kosongmu berikutnya.`,
      stats,
    };
  }

  // Arah 2: hari aktif lebih boros (biasanya karena keluar rumah) — netral, tanpa menghakimi.
  const activeDiff = activeAvg - quietAvg;
  if (activeDiff >= MIN_DIFF && activeAvg >= quietAvg * MIN_RATIO) {
    return {
      headline: `Di hari **banyak habit**, pengeluaranmu rata-rata Rp${shortRupiah(activeDiff)} lebih tinggi`,
      note: `${source} Hari aktif sering berarti hari keluar rumah — bukan masalah, hanya pola yang layak kamu tahu.`,
      stats,
    };
  }

  return null;
}
