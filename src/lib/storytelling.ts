/**
 * Ringkasan data (v0.26) — mengubah data mentah menjadi kalimat faktual.
 *
 * v0.26 — prinsip "data dulu": setiap fungsi mengembalikan teks ringkas berbasis
 * angka, tanpa emoji, tanpa metafora, tanpa kalimat motivasi. Penanda **bold**
 * hanya dipakai untuk angka kunci agar mudah dipindai. Semua fungsi murni
 * (tanpa React/DOM) supaya mudah diuji dan dipakai lintas view.
 *
 * Konvensi tone: "green" positif, "amber" perlu perhatian, "rose" melebihi
 * batas, "neutral" tanpa data. Tone dipetakan ke palet botanical
 * (hijau #417a57, amber #f5d9a8, koral #f2a48c) — tidak ada biru/indigo.
 */

export type StoryTone = "green" | "amber" | "rose" | "neutral";

// ---------------------------------------------------------------------------
// Utilitas angka
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

/** Tangga lencana streak berikutnya. */
const STREAK_BADGES = [3, 7, 14, 30, 60, 100];

function nextStreakBadge(streak: number): number | null {
  for (const badge of STREAK_BADGES) if (streak < badge) return badge;
  return null;
}

// ---------------------------------------------------------------------------
// Ringkasan hari ini (Beranda)
// ---------------------------------------------------------------------------

export interface TodayStory {
  headline: string;
  tone: StoryTone;
}

export function todayStory(input: {
  total: number;
  completed: number;
  vacationMode?: boolean;
}): TodayStory {
  const { total, completed } = input;
  if (input.vacationMode) {
    return { headline: "Mode libur aktif", tone: "neutral" };
  }
  if (total === 0) {
    return { headline: "Belum ada kebiasaan terjadwal", tone: "neutral" };
  }
  if (completed === total) {
    return { headline: `Semua **${total}** kebiasaan selesai`, tone: "green" };
  }
  return {
    headline: `**${completed} dari ${total}** kebiasaan selesai`,
    tone: completed > 0 ? "green" : "neutral",
  };
}

/** Kalimat progres pendek untuk kartu progres halaman Kebiasaan. */
export function progressSentence(completed: number, total: number): string {
  if (total === 0) return "Belum ada kebiasaan terjadwal hari ini.";
  if (completed === total) return `**${completed} dari ${total}** selesai`;
  if (completed === 0) return `**${total} kebiasaan** belum selesai.`;
  return `**${completed} dari ${total}** selesai · ${total - completed} lagi.`;
}

// ---------------------------------------------------------------------------
// Ringkasan penyelesaian mingguan (Beranda)
// ---------------------------------------------------------------------------

export interface WeeklyStepsStory {
  message: string;
  tone: StoryTone;
  /** Jangkar visual yang bisa dipindai: ↑2 / ↓1 / =. null = tanpa perbandingan. */
  trend: { direction: "up" | "down" | "flat"; label: string } | null;
}

/**
 * Ringkasan minggu berjalan vs pekan sebelumnya.
 * `ready` = riwayat 14 hari berhasil dimuat (perbandingan hanya tampil bila
 * kedua rentang benar-benar bisa diperiksa).
 */
export function weeklyStepsStory(input: {
  total: number;
  previousTotal: number;
  ready: boolean;
}): WeeklyStepsStory {
  const { total, previousTotal, ready } = input;
  if (total === 0) {
    return { message: "Belum ada penyelesaian minggu ini.", tone: "neutral", trend: null };
  }
  if (!ready) {
    return { message: `**${total} penyelesaian** minggu ini.`, tone: "neutral", trend: null };
  }
  const change = total - previousTotal;
  if (change > 0) {
    return {
      message: `**${total} penyelesaian** · ${change} lebih banyak dari pekan lalu`,
      tone: "green",
      trend: { direction: "up", label: `↑${change}` },
    };
  }
  if (change < 0) {
    return {
      message: `**${total} penyelesaian** · ${-change} lebih sedikit dari pekan lalu`,
      tone: "neutral",
      trend: { direction: "down", label: `↓${-change}` },
    };
  }
  return {
    message: `**${total} penyelesaian** · sama dengan pekan lalu`,
    tone: "green",
    trend: { direction: "flat", label: "=" },
  };
}

/** Kalimat untuk kartu streak: posisi terhadap lencana berikutnya. */
export function streakStory(streak: number): string {
  const badge = nextStreakBadge(streak);
  if (streak === 0) return "Belum ada hari beruntun. Lencana pertama di **3 hari**.";
  if (badge === null) return `**${streak} hari** beruntun — semua lencana tercapai.`;
  const gap = badge - streak;
  if (gap === 1) return `**1 hari lagi** menuju lencana **${badge} hari**.`;
  if (STREAK_BADGES.includes(streak)) return `Lencana **${streak} hari** tercapai.`;
  return `**${gap} hari lagi** menuju lencana **${badge} hari**.`;
}

// ---------------------------------------------------------------------------
// Ringkasan keuangan (Keuangan — banner status + anggaran)
// ---------------------------------------------------------------------------

export interface FinanceStory {
  headline: string;
  note: string;
  chips: string[];
  tone: StoryTone;
}

export function financeStory(input: {
  income: number;
  expense: number;
  prevExpense: number;
  budgets: Array<{ category: string; spent: number; limit: number }>;
  topCategory: { category: string; share: number } | null;
  hasTransactions: boolean;
  /** Hasil financeAnomaly() — opsional; status kategori yang melonjak. */
  anomaly?: FinanceAnomaly | null;
}): FinanceStory {
  const { income, expense, prevExpense, budgets, topCategory, hasTransactions, anomaly } = input;

  if (!hasTransactions) {
    return {
      headline: "Belum ada transaksi bulan ini",
      note: "Catat transaksi pertama untuk melihat ringkasan.",
      chips: [],
      tone: "neutral",
    };
  }

  // Prioritas pesan: anggaran jebol > anggaran waspada > anomali > tren > arus kas.
  const over = budgets.filter((item) => item.limit > 0 && item.spent > item.limit)
    .sort((a, b) => b.spent - b.limit - (a.spent - a.limit))[0];
  const warning = budgets
    .filter((item) => item.limit > 0 && item.spent <= item.limit && item.spent / item.limit >= 0.8)
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit)[0];

  const chips: string[] = [];
  if (topCategory) {
    chips.push(`**${topCategory.category}** ${Math.round(topCategory.share)}% dari pengeluaran`);
  }
  const net = income - expense;
  if (net > 0) chips.push(`Sisa arus kas **${shortRupiah(net)}**`);
  const anomalyChip = anomaly
    ? `**${anomaly.category}** naik ${anomaly.multiple}× dari bulan lalu`
    : null;

  if (over) {
    return {
      headline: `Anggaran **${over.category}** terlampaui ${shortRupiah(over.spent - over.limit)}`,
      note: `Terpakai ${shortRupiah(over.spent)} dari batas ${shortRupiah(over.limit)}.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "rose",
    };
  }
  if (warning) {
    const remaining = warning.limit - warning.spent;
    return {
      headline: `Anggaran **${warning.category}** terpakai ${Math.round(warning.spent / warning.limit * 100)}%`,
      note: `Tersisa ${shortRupiah(remaining)} dari batas ${shortRupiah(warning.limit)}.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "amber",
    };
  }
  if (anomaly && anomaly.rise >= 50) {
    return {
      headline: `**${anomaly.category}** naik ${anomaly.multiple}× dari bulan lalu`,
      note: `Bulan lalu ${shortRupiah(anomaly.previous)} · bulan ini ${shortRupiah(anomaly.current)}.`,
      chips,
      tone: "amber",
    };
  }
  if (prevExpense > 0 && expense < prevExpense) {
    const drop = Math.round((1 - expense / prevExpense) * 100);
    return {
      headline: `Pengeluaran turun **${drop}%** dari bulan lalu`,
      note: `Bulan lalu ${shortRupiah(prevExpense)} · bulan ini ${shortRupiah(expense)}.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "green",
    };
  }
  if (prevExpense > 0 && expense > prevExpense) {
    const rise = Math.round((expense / prevExpense - 1) * 100);
    return {
      headline: `Pengeluaran naik **${rise}%** dari bulan lalu`,
      note: `Bulan lalu ${shortRupiah(prevExpense)} · bulan ini ${shortRupiah(expense)}.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "amber",
    };
  }
  if (net >= 0) {
    return {
      headline: `Arus kas positif **${shortRupiah(net)}** bulan ini`,
      note: `Pemasukan ${shortRupiah(income)} · pengeluaran ${shortRupiah(expense)}.`,
      chips: anomalyChip ? [...chips, anomalyChip] : chips,
      tone: "green",
    };
  }
  return {
    headline: "Pengeluaran melebihi pemasukan",
    note: `Selisih ${shortRupiah(-net)} bulan ini.`,
    chips: anomalyChip ? [...chips, anomalyChip] : chips,
    tone: "rose",
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

/** Status per-item anggaran: ringkas berbasis angka. */
export function budgetNarrative(spent: number, limit: number): string {
  const hasLimit = limit > 0;
  if (!hasLimit) return "Batas anggaran belum ditentukan.";
  if (spent > limit) return `Melebihi batas **${shortRupiah(spent - limit)}**.`;
  if (spent === limit) return "Batas habis terpakai.";
  if (spent === 0) return "Belum terpakai.";
  return `Tersisa **${shortRupiah(limit - spent)}** dari batas.`;
}

// ---------------------------------------------------------------------------
// Ringkasan pertumbuhan (Insight)
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
    return { headline: "Memuat data…", summary: `Mengambil riwayat ${periodLabel.toLowerCase()}.` };
  }
  if (error) {
    return { headline: "Riwayat belum termuat", summary: "Coba muat ulang setelah koneksi tersedia." };
  }
  if (total === 0) {
    return {
      headline: "**0 penyelesaian**",
      summary: `Belum ada penyelesaian tercatat ${periodLabel.toLowerCase()}.`,
    };
  }
  return {
    headline: `**${total} penyelesaian**`,
    summary: `Aktif ${activeDays} dari ${spanDays} hari ${periodLabel.toLowerCase()}.`,
  };
}
