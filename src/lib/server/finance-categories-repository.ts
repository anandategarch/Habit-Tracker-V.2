import "server-only";

import { db } from "@/lib/db";

export interface FinanceCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  sortOrder: number;
}

interface CategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  type: string;
  sort_order: number | bigint | null;
}

/**
 * Daftar kategori keuangan custom dari Turso (tabel finance_categories).
 * Dipakai dropdown kategori transaksi supaya user bisa pakai kategori granular
 * (mis. "Kopi", "Bensin", "Tagihan Listrik") lengkap dengan emoji & warna.
 */
export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  const rows = await db.$queryRaw<CategoryRow[]>`SELECT id, name, emoji, color, type, sort_order
    FROM finance_categories ORDER BY sort_order ASC, name ASC`;

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji ?? ""),
    color: String(row.color ?? "#78716c"),
    type: row.type === "income" ? "income" : "expense",
    sortOrder: Number(row.sort_order ?? 0),
  }));
}
