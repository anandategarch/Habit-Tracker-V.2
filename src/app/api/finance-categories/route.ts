import { NextResponse } from "next/server";
import { listFinanceCategories } from "@/lib/server/finance-categories-repository";
import { isTursoConfigured } from "@/lib/server/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { error: "Turso belum dikonfigurasi. Kategori transaksi pakai daftar bawaan." },
      { status: 503 },
    );
  }

  try {
    const categories = await listFinanceCategories();
    return NextResponse.json({ categories }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Rutina finance categories read failed:", error);
    return NextResponse.json(
      { error: "Gagal membaca kategori keuangan dari Turso." },
      { status: 500 },
    );
  }
}
