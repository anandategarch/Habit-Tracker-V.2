import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/schema";
import { getTursoClient, isTursoConfigured } from "@/lib/server/turso";
import { EMPTY_MODULES, normalizeModules, type WorkspaceModuleKey } from "@/lib/module-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set<WorkspaceModuleKey>([
  "goals", "checkins", "tasks", "notes", "routines", "wellness",
  "workouts", "programs", "progressPhotos", "finance",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function databaseUnavailable() {
  return NextResponse.json(
    { error: "Turso belum dikonfigurasi. Data modul disimpan lokal pada perangkat ini." },
    { status: 503 },
  );
}

export async function GET() {
  if (!isTursoConfigured()) return databaseUnavailable();
  try {
    await ensureSchema();
    const result = await getTursoClient().execute(
      "SELECT module_key, payload FROM workspace_modules ORDER BY module_key",
    );
    const data: Record<string, unknown> = { ...EMPTY_MODULES };
    for (const row of result.rows) {
      const key = String(row.module_key);
      if (!allowed.has(key as WorkspaceModuleKey)) continue;
      try { data[key] = JSON.parse(String(row.payload)); } catch { /* skip malformed module only */ }
    }
    return NextResponse.json({ modules: normalizeModules(data) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Rutina module read failed:", error);
    return NextResponse.json({ error: "Gagal membaca data modul dari Turso." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isTursoConfigured()) return databaseUnavailable();
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
    await ensureSchema();
    const client = getTursoClient();
    const transaction = await client.transaction("write");
    try {
      for (const [key, value] of entries) {
        await transaction.execute({
          sql: `INSERT INTO workspace_modules (module_key, payload, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(module_key) DO UPDATE SET
              payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`,
          args: [key, JSON.stringify(value)],
        });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Rutina module write failed:", error);
    return NextResponse.json({ error: "Gagal menyimpan data modul ke Turso." }, { status: 500 });
  }
}
