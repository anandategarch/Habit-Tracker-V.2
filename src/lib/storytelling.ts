/**
 * Storytelling engine (v0.12) — mengubah data mentah menjadi kalimat insight.
 *
 * Prinsip "Sahabat taman, bukan spreadsheet": setiap fungsi mengembalikan
 * teks narasi bergaya obrolan (conversational), dengan penanda **bold** pada
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
      headline: "Hari ini, izinkan dirimu **beristirahat** 🌿",
      note: "Tamanmu tetap ada saat kamu siap kembali.",
      tone: "neutral",
    };
  }
  if (total === 0) {
    return {
      headline: "Setiap taman dimulai dari **satu benih** 🌱",
      note: "Pilih satu hal sederhana yang ingin kamu rawat hari ini.",
      tone: "neutral",
    };
  }
  if (completed === 0) {
    return {
      headline: "Langkah pertama menunggumu 🌱",
      note: "Tidak perlu sempurna — satu habit saja sudah cukup untuk mulai.",
      tone: "neutral",
    };
  }
  const remaining = total - completed;
  if (remaining === 0) {
    return {
      headline: "Tamanmu **mekar penuh** hari ini 🌸",
      note: "Semua ritual selesai. Sisakan ruang untuk menikmati harimu.",
      tone: "green",
    };
  }
  if (remaining === 1) {
    return {
      headline: "Hampir mekar! **Satu langkah lagi** 🌸",
      note: "Tinggal satu ritual — kamu hampir sampai.",
      tone: "green",
    };
  }
  if (remaining <= 4) {
    return {
      headline: `Hampir mekar! **${remaining} langkah lagi** ✨`,
      note: "Kamu sedang dalam ritme yang bagus hari ini.",
      tone: "green",
    };
  }
  return {
    headline: `**${remaining} langkah lagi** menuju bloom 🌿`,
    note: "Pelan-pelan, sesuai ritmemu.",
    tone: "green",
  };
}

/** Kalimat progres pendek untuk kartu progres (mengganti "N dari M telah selesai"). */
export function progressSentence(completed: number, total: number): string {
  if (total === 0) return "Belum ada ritual terjadwal hari ini.";
  if (completed === total) return `**${completed} dari ${total}** ritual selesai — tamanmu mekar 🌸`;
  if (completed === 0) return `**${total} ritual** menunggu langkah pertamamu.`;
  return `**${completed} dari ${total}** ritual selesai · ${total - completed} lagi menuju bloom.`;
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
}): FinanceStory {
  const { income, expense, prevExpense, budgets, topCategory, hasTransactions } = input;

  if (!hasTransactions) {
    return {
      headline: "Cerita uangmu dimulai dari **satu catatan** 🌱",
      note: "Catat satu transaksi hari ini agar Rutina bisa mulai membaca polanya.",
      chips: [],
      tone: "neutral",
      emoji: "🌱",
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

  if (over) {
    return {
      headline: `Awas — anggaran **${over.category}** lewat batas ${shortRupiah(over.spent - over.limit)} 🔴`,
      note: "Bukan berarti gagal — cukup perlambat pos ini sisa bulan.",
      chips,
      tone: "rose",
      emoji: "🚨",
    };
  }
  if (warning) {
    const remaining = warning.limit - warning.spent;
    return {
      headline: `Anggaran **${warning.category}** terpakai ${Math.round(warning.spent / warning.limit * 100)}% — hati-hati ya ⚠️`,
      note: `Tersisa **${shortRupiah(remaining)}** untuk sisa bulan ini.`,
      chips,
      tone: "amber",
      emoji: "⚠️",
    };
  }
  if (prevExpense > 0 && expense < prevExpense) {
    const drop = Math.round((1 - expense / prevExpense) * 100);
    return {
      headline: `Pengeluaranmu **turun ${drop}%** dibanding bulan lalu 🎉`,
      note: "Kebiasaan hematmu mulai berakar. Terus rawat.",
      chips,
      tone: "green",
      emoji: "🌿",
    };
  }
  if (prevExpense > 0 && expense > prevExpense) {
    const rise = Math.round((expense / prevExpense - 1) * 100);
    return {
      headline: `Pengeluaranmu **naik ${rise}%** dari bulan lalu 👀`,
      note: "Coba cek pos terbesar di bawah — mungkin ada yang bisa dirapikan.",
      chips,
      tone: "amber",
      emoji: "🍂",
    };
  }
  if (net >= 0) {
    return {
      headline: `Kamu menahan arus keluar dengan baik **bulan ini** 💚`,
      note: `Pemasukan masih lebih besar dari pengeluaran — sisa ${shortRupiah(net)} milikmu.`,
      chips,
      tone: "green",
      emoji: "🌿",
    };
  }
  return {
    headline: "Pengeluaran **lebih besar** dari pemasukan bulan ini",
    note: "Tidak apa-apa — satu pos kecil dirapikan saja ceritanya berubah.",
    chips,
    tone: "rose",
    emoji: "🍂",
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
      headline: "Ceritamu dimulai dari **satu langkah** 🌱",
      summary: `Belum ada penyelesaian tercatat ${periodLabel.toLowerCase()}. Kamu bisa mulai lagi kapan pun siap.`,
    };
  }
  if (activeDays >= spanDays * 0.7) {
    return {
      headline: `**${total} langkah** dalam ${activeDays} hari aktif 🔥`,
      summary: `Konsistensinya terjaga hampir setiap hari ${periodLabel.toLowerCase()} — akarmu makin kuat.`,
    };
  }
  return {
    headline: `Ada **${total} langkah** yang tercatat ${periodLabel.toLowerCase()} ✨`,
    summary: `Tersebar di ${activeDays} hari — setiap langkah kecil layak dihargai.`,
  };
}
