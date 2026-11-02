import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/schema";
import { getTursoClient, isTursoConfigured } from "@/lib/server/turso";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTursoConfigured()) {
    return NextResponse.json({ error: "Analisis waktu membutuhkan koneksi Turso." }, { status: 503 });
  }
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "ID habit tidak valid." }, { status: 400 });

  const params = new URL(request.url).searchParams;
  const rawDays = Number(params.get("days") || 30);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;
  const today = todayISO();
  const start = shiftDate(today, -(days - 1));

  try {
    await ensureSchema();
    const client = getTursoClient();
    const [habitResult, progressResult] = await Promise.all([
      client.execute({ sql: "SELECT id, title FROM habits WHERE id = ? LIMIT 1", args: [id] }),
      client.execute({
        sql: `SELECT activity_date, time_spent_minutes
          FROM habit_daily_progress
          WHERE habit_id = ? AND activity_date >= ? AND activity_date <= ?
          ORDER BY activity_date ASC`,
        args: [id, start, today],
      }),
    ]);
    if (!habitResult.rows.length) return NextResponse.json({ error: "Habit tidak ditemukan." }, { status: 404 });

    const byDay = progressResult.rows.map((row) => ({
      date: String(row.activity_date),
      minutes: Math.max(0, Number(row.time_spent_minutes) || 0),
    }));
    const totalMinutes = byDay.reduce((sum, item) => sum + item.minutes, 0);
    const activeDays = byDay.filter((item) => item.minutes > 0).length;
    return NextResponse.json({
      habit: { id, title: String(habitResult.rows[0].title) },
      periodDays: days,
      summary: {
        totalMinutes,
        activeDays,
        averageMinutes: activeDays ? Math.round(totalMinutes / activeDays) : 0,
      },
      byDay,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina habit time analysis failed:", error);
    return NextResponse.json({ error: "Gagal membaca analisis waktu habit." }, { status: 500 });
  }
}
