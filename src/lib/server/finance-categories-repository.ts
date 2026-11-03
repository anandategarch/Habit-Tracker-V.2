import "server-only";

import { getTursoClient } from "@/lib/server/turso";
import { ensureSchema } from "@/lib/server/schema";

export interface FinanceCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  sortOrder: number;
}

/**
 * Daftar kategori keuangan custom yang disimpan di Turso (tabel finance_categories).
 * Dipakai oleh dropdown kategori transaksi supaya user bisa pakai kategori granular
 * (mis. "Kopi", "Bensin", "Tagihan Listrik") lengkap dengan emoji & warna.
 */
export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  await ensureSchema();
  const client = getTursoClient();
  const result = await client.execute(
    "SELECT id, name, emoji, color, type, sort_order FROM finance_categories ORDER BY sort_order ASC, name ASC",
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji ?? ""),
    color: String(row.color ?? "#78716c"),
    type: row.type === "income" ? "income" : "expense",
    sortOrder: Number(row.sort_order ?? 0),
  }));
}
