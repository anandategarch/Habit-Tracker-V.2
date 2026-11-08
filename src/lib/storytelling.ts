/**
 * Storytelling engine (v0.13) — mengubah data mentah menjadi kalimat insight.
 *
 * v0.13 — lapisan “data storytelling” (insight > angka):
 * - weeklyStepsStory: chip tren + kalimat insight untuk kartu mingguan.
 * - financeAnomaly: pendeteksi kategori yang melonjak (naik ≥1,5×).
 * - noSpendDaysStory: hari tanpa catatan pengeluaran.
 *
 * Prinsip "pendamping yang ringkas, bukan spreadsheet": setiap fungsi mengembalikan
 * teks narasi pendek bergaya obrolan (conversational), dengan penanda **bold** pada
 * kata kunci yang akan dirender komponen <RichText/>. Semua fungsi murni
 * (tanpa React/DOM) supaya mudah diuji dan dipakai lintas view.
 *
 * Konvensi tone: "green" aman/membangun, "amber" waspada, "rose" butuh
 * perhatian, "neutral" tanpa data. Tone dipetakan ke palet botanical
 * (hijau #417a57, amber #f5d9a8, koral #f2a48c) — tidak ada biru/indigo.
 */

export type StoryTone = "green" | "amber" | "rose" | "neutral";

// ---------------------------------------------------------------------------
// Utilitas angka & frasa
// ---------------------------------------------------------------------------

/** "1,85 jt" ringkas untuk chip; jatuh ke "Rp85rb" bila < 1 jt. */
export function shortRupiah(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${trim(amount / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${trim(amount / 1_000_000)} jt`;
  if (abs >= 1_000) return `${trim(amount / 1_000)}rb`;
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

function trim(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Lencana streak berikutnya — tangga motivasi ala goal-gradient. */
const STREAK_BADGES = [3, 7, 14, 30, 60, 100];

function nextStreakBadge(streak: number): number | null {
  for (const badge of STREAK_BADGES) if (streak < badge) return badge;
  return null;
}

// ---------------------------------------------------------------------------
// Cerita hari ini (Beranda + Kebiasaan)
// ---------------------------------------------------------------------------

export interface TodayStory {
  headline: string;
  note: string;
  tone: StoryTone;
}

export function todayStory(input: {
  total: number;
  completed: number;
  vacationMode?: boolean;
}): TodayStory {
  const { total, completed } = input;
  if (input.vacationMode) {
    return {
      headline: "Hari ini, izinkan dirimu **beristirahat**",
      note: "Rutinitasmu tetap ada saat kamu siap kembali.",
      tone: "neutral",
    };
  }
  if (total === 0) {
    return {
      headline: "Mulai dari **satu kebiasaan**",
      note: "Pilih satu hal sederhana untuk dimulai hari ini.",
      tone: "neutral",
    };
  }
  if (completed === 0) {
    return {
      headline: "Langkah pertama menunggumu",
      note: "Tidak perlu sempurna — satu habit saja sudah cukup untuk mulai.",
      tone: "neutral",
    };
  }
  const remaining = total - completed;
  if (remaining === 0) {
    return {
      headline: "Semua ritual **selesai** hari ini",
      note: "Sisakan ruang untuk menikmati harimu.",
      tone: "green",
    };
  }
  if (remaining === 1) {
    return {
      headline: "**Satu langkah lagi** — hampir selesai",
      note: "Tinggal satu ritual — kamu hampir sampai.",
      tone: "green",
    };
  }
  if (remaining <= 4) {
    return {
      headline: `**${remaining} langkah lagi** menuju selesai`,
      note: "Kamu sedang dalam ritme yang bagus hari ini.",
      tone: "green",
    };
  }
  return {
    headline: `**${remaining} langkah lagi** menuju selesai`,
    note: "Pelan-pelan, sesuai ritmemu.",
    tone: "green",
  };
}

/** Kalimat progres pendek untuk kartu progres (mengganti "N dari M telah selesai"). */
export function progressSentence(completed: number, total: number): string {
  if (total === 0) return "Belum ada ritual terjadwal hari ini.";
  if (completed === total) return `**${completed} dari ${total}** ritual selesai`;
  if (completed === 0) return `**${total} ritual** menunggu langkah pertamamu.`;
  return `**${completed} dari ${total}** ritual selesai · ${total - completed} lagi.`;
}

// ---------------------------------------------------------------------------
// Cerita langkah mingguan (Beranda — kartu "Cerita minggu ini" v2)
// ---------------------------------------------------------------------------

export interface WeeklyStepsStory {
  message: string;
  tone: StoryTone;
  /** Jangkar visual yang bisa dipindai: ↑2 / ↓1 / =. null = tanpa perbandingan. */
  trend: { direction: "up" | "down" | "flat"; label: string } | null;
}

/**
 * Kalimat insight minggu berjalan vs pekan sebelumnya.
 * `ready` = riwayat 14 hari berhasil dimuat (perbandingan hanya tampil bila
 * kedua rentang benar-benar bisa diperiksa — lihat docs/design-system.md).
 */
export function weeklyStepsStory(input: {
  total: number;
  previousTotal: number;
  ready: boolean;
}): WeeklyStepsStory {
  const { total, previousTotal, ready } = input;
  if (total === 0) {
    return {
      message: "Minggu ini masih terbuka. Pilih **satu langkah kecil** untuk memulainya",
      tone: "neutral",
      trend: null,
    };
  }
  if (!ready) {
    return {
      message: `**${total} langkah** tercatat minggu ini — perbandingan pekan lalu menyusul begitu riwayat termuat`,
      tone: "neutral",
      trend: null,
    };
  }
  const change = total - previousTotal;
  if (change > 0) {
    return {
      message: previousTotal === 0
        ? `Pekan lalu kosong — pekan ini sudah **${total} langkah**. Awal yang bagus.`
        : `**${change} langkah lebih banyak** dari pekan sebelumnya — progresmu terlihat`,
      tone: "green",
      trend: { direction: "up", label: `↑${change}` },
    };
  }
  if (change < 0) {
    return {
      message: "Pekan ini berjalan **lebih ringan** — kamu tetap boleh bangga sudah meluangkan waktu untuk dirimu",
      tone: "neutral",
      trend: { direction: "down", label: `↓${-change}` },
    };
  }
  return {
    message: "Kamu sedang **menjaga ritme** yang sudah dibangun. Lanjutkan dengan cara yang terasa nyaman",
    tone: "green",
    trend: { direction: "flat", label: "=" },
  };
}

/** Goal-gradient untuk kartu streak: "1 hari lagi menuju rekor 7 hari 🔥". */
export function streakStory(streak: number): string {
  const badge = nextStreakBadge(streak);
  if (streak === 0) return "Tandai satu habit hari ini untuk menyalakan apinya 🔥";
  if (badge === null) return `Rekor legendaris — **${streak} hari** berjalan 🏆`;
  const gap = badge - streak;
  if (gap === 1) return `**Satu hari lagi** menuju rekor **${badge} hari** 🔥`;
  if (STREAK_BADGES.includes(streak)) return `Rekor baru! **${streak} hari** berjalan 🎉 Lanjutkan!`;
  return `**${gap} hari lagi** menuju rekor **${badge} hari** 🔥`;
}

// ---------------------------------------------------------------------------
// Cerita keuangan (Keuangan — banner insight + anggaran + kategori)
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Array<[RegExp, string]> = [
  [/kopi|coffee/i, "☕"],
  [/makan|minum|resto|jajan|snack/i, "🍜"],
  [/bensin|transport|gojek|grab|parkir/i, "🚌"],
  [/listrik|air|tagihan|internet|wifi|pulsa/i, "🧾"],
  [/belanja|shopping|lifestyle/i, "🛍️"],
  [/kesehatan|obat|dokter|clinic/i, "💊"],
  [/hiburan|netflix|film|game/i, "🎬"],
  [/pendidikan|buku|kursus|learning/i, "📚"],
  [/tabungan|saving|investasi/i, "🏦"],
  [/gaji|salary|freelance|komisi/i, "💼"],
];

export function categoryEmoji(category: string): string {
  for (const [pattern, emoji] of CATEGORY_EMOJI) if (pattern.test(category)) return emoji;
  return "💸";
}

export interface FinanceStory {
  headline: string;
  note: string;
  chips: string[];
  tone: StoryTone;
  emoji: string;
}

export function financeStory(input: {
  income: number;
  expense: number;
  prevExpense: number;
  budgets: Array<{ category: string; spent: number; limit: number }>;
  topCategory: { category: string; share: number } | null;
  hasTransactions: boolean;
  /** Hasil financeAnomaly() — opsional; kartu “alarm” kategori melonjak. */
  anomaly?: FinanceAnomaly | null;
}): FinanceStory {
  const { income, expense, prevExpense, budgets, topCategory, hasTransactions, anomaly } = input;

  if (!hasTransactions) {
    return {
      headline: "Mulai dari **satu catatan** transaksi",
      note: "Catat satu transaksi hari ini agar Rutina bisa mulai membaca polanya.",
      chips: [],
      tone: "neutral",
      emoji: "🧾",
    };
  }

  // Prioritas pesan: anggaran jebol > anggaran waspada > tren pengeluaran > arus kas.
  const over = budgets.filter((item) => item.limit > 0 && item.spent > item.limit)
    .sort((a, b) => b.spent - b.limit - (a.spent - a.limit))[0];
  const warning = budgets
    .filter((item) => item.limit > 0 && item.spent <= item.limit && item.spent / item.limit >= 0.8)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];

  const chips: string[] = [];
  if (topCategory) {
    chips.push(`${categoryEmoji(topCategory.category)} **${topCategory.category}** menyerap ${Math.round(topCategory.share)}% pengeluaranmu`);
  }
  const net = income - expense;
  if (net > 0) chips.push(`💚 Sisa arus kas **${shortRupiah(net)}** bulan ini`);
  // Chip alarm anomali — dipasang setelah headline anomali sendiri (agar tidak
  // menduplikasi kalimat yang sama dua kali di satu banner).
  const anomalyChip = anomaly
    ? `⚠️ **${anomaly.category}** naik ${anomaly.multiple}× dari bulan lalu`
    : null;

  if (over) {
    return {
      headline: `Awas — anggaran **${over.category}** lewat batas ${shortRupiah(over.spent - over.limit)} 🔴`,
      note: "Bukan berarti gagal — cukup perlambat pos ini sisa bulan.",
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "rose",
      emoji: "🚨",
    };
  }
  if (warning) {
    const remaining = warning.limit - warning.spent;
    return {
      headline: `Anggaran **${warning.category}** terpakai ${Math.round(warning.spent / warning.limit * 100)}% — hati-hati ya ⚠️`,
      note: `Tersisa **${shortRupiah(remaining)}** untuk sisa bulan ini.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "amber",
      emoji: "⚠️",
    };
  }
  if (anomaly && anomaly.rise >= 50) {
    return {
      headline: `Awas — **${anomaly.category}** naik **${anomaly.multiple}×** dari bulan lalu 👀`,
      note: `Bukan untuk ditakuti — cukup cek apakah pos ini pola baru atau sekali saja.`,
      chips,
      tone: "amber",
      emoji: "🔎",
    };
  }
  if (prevExpense > 0 && expense < prevExpense) {
    const drop = Math.round((1 - expense / prevExpense) * 100);
    return {
      headline: `Pengeluaranmu **turun ${drop}%** dibanding bulan lalu 🎉`,
      note: "Kebiasaan hematmu mulai terbentuk. Terus jaga.",
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "green",
      emoji: "📉",
    };
  }
  if (prevExpense > 0 && expense > prevExpense) {
    const rise = Math.round((expense / prevExpense - 1) * 100);
    return {
      headline: `Pengeluaranmu **naik ${rise}%** dari bulan lalu 👀`,
      note: "Coba cek pos terbesar di bawah — mungkin ada yang bisa dirapikan.",
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "amber",
      emoji: "📈",
    };
  }
  if (net >= 0) {
    return {
      headline: `Kamu menahan arus keluar dengan baik **bulan ini** 💚`,
      note: `Pemasukan masih lebih besar dari pengeluaran — sisa ${shortRupiah(net)} milikmu.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "green",
      emoji: "💰",
    };
  }
  return {
    headline: "Pengeluaran **lebih besar** dari pemasukan bulan ini",
    note: "Tidak apa-apa — satu pos kecil dirapikan saja ceritanya berubah.",
    chips: anomalyChip ? [...chips, anomalyChip] : chips,
    tone: "rose",
    emoji: "⚠️",
  };
}

/**
 * Detektor anomali kategori: kategori yang melonjak vs periode sebelumnya.
 * Syarat jujur (evidence-only): kategori tersebut juga tercatat belanja di
 * periode sebelumnya (prev > 0), naik ≥ 1,5×, dan minimal Rp50rb — tiga pintu
 * ini mencegah "naik 2×" dari Rp8rb → Rp16rb yang cuma noise.
 */
export interface CategorySpend { category: string; spent: number }
export interface FinanceAnomaly {
  category: string;
  /** "2,1" — sudah diformat id-ID, siap dipakai sebagai "2,1×". */
  multiple: string;
  rise: number;
  current: number;
  previous: number;
}

const ANOMALY_MIN_RISE = 1.5;
const ANOMALY_MIN_SPEND = 50_000;

export function financeAnomaly(input: {
  current: CategorySpend[];
  previous: CategorySpend[];
}): FinanceAnomaly | null {
  const previousByCategory = new Map(input.previous.map((item) => [item.category, item.spent]));
  let best: FinanceAnomaly | null = null;
  for (const item of input.current) {
    if (item.spent < ANOMALY_MIN_SPEND) continue;
    const previous = previousByCategory.get(item.category) ?? 0;
    if (previous <= 0 || item.spent / previous < ANOMALY_MIN_RISE) continue;
    const candidate: FinanceAnomaly = {
      category: item.category,
      multiple: (item.spent / previous).toLocaleString("id-ID", { maximumFractionDigits: 1 }),
      rise: Math.round((item.spent / previous - 1) * 100),
      current: item.spent,
      previous,
    };
    if (!best || candidate.rise > best.rise) best = candidate;
  }
  return best;
}

/**
 * Hari tanpa catatan pengeluaran dalam jendela 7 hari.
 * Hanya tampil bila jendela itu punya belanja tercatat (totalExpense > 0) dan
 * jumlah harinya masuk akal (1–5) — 6–7 hari hening berarti data kurang,
 * bukan dompet berhemat.
 */
export function noSpendDaysStory(input: {
  days: Array<{ expense: number }>;
  totalExpense: number;
}): { message: string } | null {
  const quietDays = input.days.filter((day) => day.expense === 0).length;
  if (input.totalExpense <= 0 || quietDays < 1 || quietDays > 5) return null;
  return {
    message: quietDays === 1
      ? "Ada **1 hari** tanpa catatan pengeluaran — dompetmu berterima kasih"
      : `Ada **${quietDays} hari** tanpa catatan pengeluaran — dompetmu berterima kasih`,
  };
}

/** Narasi per-item anggaran: pengganti "Melebihi batas Rp X" yang datar. */
export function budgetNarrative(spent: number, limit: number): string {
  const hasLimit = limit > 0;
  if (!hasLimit) return "Batas anggaran belum ditentukan";
  if (spent > limit) return `Awas — lewat **${shortRupiah(spent - limit)}** dari batasmu 🔴`;
  if (spent === limit) return "Batas anggaran tepat tercapai habis";
  const ratio = spent / limit;
  const remaining = limit - spent;
  if (ratio >= 0.8) return `Sisa **${shortRupiah(remaining)}** — hati-hati ya ⚠️`;
  if (spent === 0) return `Jalan masih lapang: **${shortRupiah(limit)}** tersedia`;
  return `Masih ada **${shortRupiah(remaining)}** ruang bernapas`;
}

// ---------------------------------------------------------------------------
// Cerita pertumbuhan (Insight)
// ---------------------------------------------------------------------------

export function growthStory(input: {
  loading: boolean;
  error: boolean;
  total: number;
  activeDays: number;
  spanDays: number;
  periodLabel: string;
}): { headline: string; summary: string } {
  const { loading, error, total, activeDays, spanDays, periodLabel } = input;
  if (loading) {
    return { headline: "Menyusun catatan perkembanganmu…", summary: `Rutina sedang merapikan jejakmu ${periodLabel.toLowerCase()}.` };
  }
  if (error) {
    return { headline: "Riwayat belum terpanggil", summary: "Catatan yang sudah tersimpan tetap aman — coba muat ulang sebentar lagi." };
  }
  if (total === 0) {
    return {
      headline: "Mulai dari **satu langkah**",
      summary: `Belum ada penyelesaian tercatat ${periodLabel.toLowerCase()}. Kamu bisa mulai lagi kapan pun siap.`,
    };
  }
  if (activeDays >= spanDays * 0.7) {
    return {
      headline: `**${total} langkah** dalam ${activeDays} hari aktif 🔥`,
      summary: `Ritme terjaga hampir setiap hari ${periodLabel.toLowerCase()} — konsistensimu makin kuat.`,
    };
  }
  return {
    headline: `Ada **${total} langkah** yang tercatat ${periodLabel.toLowerCase()} ✨`,
    summary: `Tersebar di ${activeDays} hari — setiap langkah kecil layak dihargai.`,
  };
}
