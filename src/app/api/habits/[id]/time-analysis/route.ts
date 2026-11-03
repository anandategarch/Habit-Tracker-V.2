import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: "ID habit tidak valid." }, { status: 400 });

  const params = new URL(request.url).searchParams;
  const rawDays = Number(params.get("days") || 30);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;
  const today = todayISO();
  const start = shiftDate(today, -(days - 1));

  try {
    const [habitRows, progressRows] = await Promise.all([
      db.$queryRaw<Array<{ id: string; title: string }>>`SELECT id, title FROM habits WHERE id = ${id} LIMIT 1`,
      db.$queryRaw<Array<{ activity_date: string; time_spent_minutes: number | bigint }>>`
        SELECT activity_date, time_spent_minutes
        FROM habit_daily_progress
        WHERE habit_id = ${id} AND activity_date >= ${start} AND activity_date <= ${today}
        ORDER BY activity_date ASC`,
    ]);
    if (!habitRows.length) return NextResponse.json({ error: "Habit tidak ditemukan." }, { status: 404 });

    const byDay = progressRows.map((row) => ({
      date: String(row.activity_date),
      minutes: Math.max(0, Number(row.time_spent_minutes) || 0),
    }));
    const totalMinutes = byDay.reduce((sum, item) => sum + item.minutes, 0);
    const activeDays = byDay.filter((item) => item.minutes > 0).length;
    return NextResponse.json({
      habit: { id, title: String(habitRows[0].title) },
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
