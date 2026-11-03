import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!isMonth(month)) return NextResponse.json({ error: "Parameter bulan tidak valid." }, { status: 400 });

  const start = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  try {
    const [habitRows, checkinRows] = await Promise.all([
      db.$queryRaw<Array<{ habitId: string; title: string; date: string }>>`
        SELECT c.habit_id AS habitId, h.title AS title, c.completed_on AS date
        FROM habit_checkins c
        INNER JOIN habits h ON h.id = c.habit_id
        WHERE c.completed_on >= ${start} AND c.completed_on < ${nextMonth}
        ORDER BY c.completed_on ASC, h.title ASC`,
      db.$queryRaw<Array<{ payload: string }>>`SELECT payload FROM workspace_modules WHERE module_key = 'checkins' LIMIT 1`,
    ]);

    let checkins: Array<{ date: string; mood: number; energy: number; sleepHours: number; notes: string }> = [];
    if (checkinRows[0]?.payload) {
      try {
        const value: unknown = JSON.parse(String(checkinRows[0].payload));
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
      records: habitRows.map((row) => ({
        habitId: String(row.habitId),
        title: String(row.title),
        date: String(row.date),
      })),
      checkins,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina calendar history read failed:", error);
    return NextResponse.json({ error: "Gagal membaca riwayat kalender." }, { status: 500 });
  }
}
