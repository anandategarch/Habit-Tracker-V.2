import { NextResponse } from "next/server";
import { listFinanceCategories } from "@/lib/server/finance-categories-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
