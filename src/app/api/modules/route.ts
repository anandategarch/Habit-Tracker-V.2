import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EMPTY_MODULES, normalizeModules, type WorkspaceModuleKey } from "@/lib/module-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set<WorkspaceModuleKey>([
  "goals", "checkins", "tasks", "notes", "routines", "wellness",
  "workouts", "programs", "progressPhotos", "habitGroups", "settings", "finance",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function GET() {
  try {
    const rows = await db.$queryRaw<Array<{ module_key: string; payload: string }>>`SELECT module_key, payload FROM workspace_modules ORDER BY module_key`;
    const data: Record<string, unknown> = { ...EMPTY_MODULES };
    for (const row of rows) {
      const key = String(row.module_key);
      if (!allowed.has(key as WorkspaceModuleKey)) continue;
      try { data[key] = JSON.parse(String(row.payload)); } catch { /* skip malformed module only */ }
    }
    return NextResponse.json({ modules: normalizeModules(data) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Rutina module read failed:", error);
    return NextResponse.json({ error: "Gagal membaca data modul dari database." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }
  if (!isRecord(body) || !isRecord(body.modules) || Object.keys(body.modules).length === 0) {
    return NextResponse.json({ error: "Payload modul tidak valid." }, { status: 400 });
  }

  const entries = Object.entries(body.modules);
  for (const [key, value] of entries) {
    if (!allowed.has(key as WorkspaceModuleKey) || (!Array.isArray(value) && !isRecord(value))) {
      return NextResponse.json({ error: "Jenis data modul tidak dikenal." }, { status: 400 });
    }
    const serialized = JSON.stringify(value);
    const maxSize = key === "progressPhotos" ? 1_750_000 : 900_000;
    if (serialized.length > maxSize) {
      return NextResponse.json({ error: "Data modul terlalu besar. Kurangi jumlah foto atau lampiran." }, { status: 413 });
    }
  }

  try {
    await db.$transaction(async (tx) => {
      for (const [key, value] of entries) {
        const payload = JSON.stringify(value);
        await tx.$executeRaw`
          INSERT INTO workspace_modules (module_key, payload, updated_at)
            VALUES (${key}, ${payload}, CURRENT_TIMESTAMP)
            ON CONFLICT(module_key) DO UPDATE SET
              payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`;
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Rutina module write failed:", error);
    return NextResponse.json({ error: "Gagal menyimpan data modul ke database." }, { status: 500 });
  }
}
