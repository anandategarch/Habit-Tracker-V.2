import { NextResponse } from "next/server";
import { isLegacyBackup, applyLegacyMigration } from "@/lib/migrate-legacy";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "File backup bukan JSON yang valid." }, { status: 400 });
  }
  if (!isLegacyBackup(body)) {
    return NextResponse.json({
      error: "File bukan backup legacy V1 Rutina. Endpoint ini khusus migrasi dari aplikasi Rutina lama (format tanpa envelope `format: rutina-v2-backup`).",
    }, { status: 400 });
  }

  try {
    const result = await applyLegacyMigration(body, todayISO());
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina legacy migration failed:", error);
    const message = error instanceof Error ? error.message : "Gagal memigrasi backup legacy. Data yang sudah ada tidak dihapus.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/migrate-legacy",
    description: "Migrasi backup Rutina V1 (format lama tanpa envelope rutina-v2-backup) ke skema V2. Kirim POST dengan body JSON backup lama.",
    expectedFormat: "Objek dengan `data.*` berisi habits, habitLogs, dailyLogs, transactions, fundSources, weeklyBudgets, habitGroups, workRoutines, workTasks, workNotes, appSettings, dll.",
  });
}
