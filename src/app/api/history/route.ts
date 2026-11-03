import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/schema";
import { getTursoClient, isTursoConfigured } from "@/lib/server/turso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export async function GET(request: Request) {
  if (!isTursoConfigured()) {
    return NextResponse.json({ error: "Riwayat hanya tersedia saat database Turso terhubung." }, { status: 503 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!isMonth(month)) return NextResponse.json({ error: "Parameter bulan tidak valid." }, { status: 400 });

  const start = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  try {
    await ensureSchema();
    const client = getTursoClient();
    const [habitRows, checkinRows, progressRows] = await Promise.all([
      client.execute({
        sql: `SELECT c.habit_id AS habitId, h.title AS title, c.completed_on AS date
          FROM habit_checkins c
          INNER JOIN habits h ON h.id = c.habit_id
          WHERE c.completed_on >= ? AND c.completed_on < ?
          ORDER BY c.completed_on ASC, h.title ASC`,
        args: [start, nextMonth],
      }),
      client.execute({
        sql: "SELECT payload FROM workspace_modules WHERE module_key = 'checkins' LIMIT 1",
      }),
      client.execute({
        sql: `SELECT p.habit_id AS habitId, h.title AS title, p.activity_date AS date,
            p.current_amount AS currentAmount, p.time_spent_minutes AS timeSpentMinutes
          FROM habit_daily_progress p
          INNER JOIN habits h ON h.id = p.habit_id
          WHERE p.activity_date >= ? AND p.activity_date < ?
          ORDER BY p.activity_date ASC, h.title ASC`,
        args: [start, nextMonth],
      }),
    ]);

    let checkins: Array<{ date: string; mood: number; energy: number; sleepHours: number; notes: string }> = [];
    if (checkinRows.rows[0]?.payload) {
      try {
        const value: unknown = JSON.parse(String(checkinRows.rows[0].payload));
        if (Array.isArray(value)) {
          checkins = value.filter((item): item is { date: string; mood: number; energy: number; sleepHours: number; notes: string } =>
            Boolean(item && typeof item === "object" &&
              typeof item.date === "string" && item.date >= start && item.date < nextMonth &&
              typeof item.mood === "number" && typeof item.energy === "number" &&
              typeof item.sleepHours === "number" && typeof item.notes === "string"),
          );
        }
      } catch {
        checkins = [];
      }
    }

    return NextResponse.json({
      month,
      records: habitRows.rows.map((row) => ({
        habitId: String(row.habitId),
        title: String(row.title),
        date: String(row.date),
      })),
      progress: progressRows.rows.map((row) => ({
        habitId: String(row.habitId),
        title: String(row.title),
        date: String(row.date),
        currentAmount: Math.max(0, Number(row.currentAmount) || 0),
        timeSpentMinutes: Math.max(0, Number(row.timeSpentMinutes) || 0),
      })),
      checkins,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina calendar history read failed:", error);
    return NextResponse.json({ error: "Gagal membaca riwayat kalender." }, { status: 500 });
  }
}
