import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/schema";
import { getTursoClient, isTursoConfigured } from "@/lib/server/turso";
import { isScheduledOn, normalizeSchedule } from "@/lib/habit-schedule";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XP_BY_DIFFICULTY: Record<string, number> = {
  easy: 5, medium: 10, hard: 20,
  Easy: 5, Medium: 10, Hard: 20,
  Mudah: 5, Sedang: 10, Sulit: 20,
};
const STAGES = [
  { id: "benih", label: "Benih", threshold: 0, next: 50, artwork: "/tree/benih.svg" },
  { id: "tunas", label: "Tunas", threshold: 50, next: 150, artwork: "/tree/tunas.svg" },
  { id: "pohon-muda", label: "Pohon Muda", threshold: 150, next: 300, artwork: "/tree/pohon-muda.svg" },
  { id: "pohon-dewasa", label: "Pohon Dewasa", threshold: 300, next: null, artwork: "/tree/pohon-dewasa.svg" },
] as const;

function shiftYmd(ymd: string, days: number): string {
  const value = new Date(`${ymd}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function weekStart(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  return shiftYmd(ymd, -((date.getUTCDay() + 6) % 7));
}
function stageForWeeklyXp(xp: number) {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) if (xp >= STAGES[i].threshold) index = i;
  const nextThreshold = STAGES[index].next;
  return { ...STAGES[index], index, xpToNext: nextThreshold === null ? null : Math.max(0, nextThreshold - xp), progress: nextThreshold === null ? 100 : Math.min(100, Math.max(0, ((xp - STAGES[index].threshold) / (nextThreshold - STAGES[index].threshold)) * 100)) };
}

export async function GET() {
  if (!isTursoConfigured()) {
    return NextResponse.json({ error: "Growth summary membutuhkan koneksi Turso." }, { status: 503 });
  }
  try {
    await ensureSchema();
    const today = todayISO();
    const monday = weekStart(today);
    const start30 = shiftYmd(today, -29);
    const client = getTursoClient();
    const [habitResult, logResult, moduleResult] = await Promise.all([
      client.execute(`SELECT h.id, h.title, h.streak, m.payload
        FROM habits h LEFT JOIN habit_metadata m ON m.habit_id = h.id
        ORDER BY h.sort_order ASC, h.created_at ASC`),
      client.execute({
        sql: `SELECT habit_id,
          COUNT(*) AS total_count,
          SUM(CASE WHEN completed_on >= ? THEN 1 ELSE 0 END) AS weekly_count,
          SUM(CASE WHEN completed_on >= ? THEN 1 ELSE 0 END) AS last30_count,
          SUM(CASE WHEN completed_on = ? THEN 1 ELSE 0 END) AS today_count
        FROM habit_checkins GROUP BY habit_id`,
        args: [monday, start30, today],
      }),
      client.execute("SELECT module_key, payload FROM workspace_modules WHERE module_key IN ('goals', 'settings')"),
    ]);

    const modules = new Map<string, unknown>();
    for (const row of moduleResult.rows) {
      try { modules.set(String(row.module_key), JSON.parse(String(row.payload))); } catch { /* malformed module ignored */ }
    }
    const settings = modules.get("settings") as { vacationMode?: boolean } | undefined;
    const goals = modules.get("goals");
    const completedGoals = Array.isArray(goals) ? goals.filter((goal) => Boolean(goal && typeof goal === "object" && (goal as { completed?: unknown }).completed)).length : 0;

    const habits = habitResult.rows.map((row) => {
      let metadata: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(String(row.payload ?? "{}"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
      } catch { metadata = {}; }
      const difficulty = typeof metadata.difficulty === "string" ? metadata.difficulty : "medium";
      return {
        id: String(row.id),
        title: String(row.title),
        streak: Number(row.streak) || 0,
        xpWeight: XP_BY_DIFFICULTY[difficulty] ?? 10,
        schedule: normalizeSchedule(metadata.schedule) ?? undefined,
      };
    });

    const aggregateByHabit = new Map<string, { total: number; weekly: number; last30: number; today: boolean }>();
    let totalXp = 0;
    let weeklyXp = 0;
    let totalLogs = 0;
    const todayLogIds = new Set<string>();
    for (const row of logResult.rows) {
      const habitId = String(row.habit_id);
      const habit = habits.find((item) => item.id === habitId);
      if (!habit) continue;
      const total = Number(row.total_count) || 0;
      const weekly = Number(row.weekly_count) || 0;
      const last30 = Number(row.last30_count) || 0;
      const todayDone = Number(row.today_count) > 0;
      aggregateByHabit.set(habitId, { total, weekly, last30, today: todayDone });
      totalLogs += total;
      totalXp += total * habit.xpWeight;
      weeklyXp += weekly * habit.xpWeight;
      if (todayDone) todayLogIds.add(habitId);
    }

    const scheduledToday = habits.filter((habit) => isScheduledOn(habit.schedule, today));
    const todayScheduledDone = scheduledToday.filter((habit) => todayLogIds.has(habit.id)).length;
    const currentStreak = habits.reduce((max, habit) => Math.max(max, habit.streak), 0);
    const level = totalXp > 0 ? Math.floor(Math.sqrt(totalXp / 20)) : 0;
    const levelFloor = 20 * level * level;
    const nextLevelXp = 20 * (level + 1) * (level + 1);
    const levelProgress = nextLevelXp > levelFloor ? Math.min(100, ((totalXp - levelFloor) / (nextLevelXp - levelFloor)) * 100) : 0;
    const stage = stageForWeeklyXp(weeklyXp);

    let worstHabit: { id: string; name: string; rate: number } | null = null;
    for (const habit of habits) {
      let opportunities = 0;
      for (let offset = 29; offset >= 0; offset -= 1) {
        const date = shiftYmd(today, -offset);
        if (isScheduledOn(habit.schedule, date)) opportunities += 1;
      }
      const completed = aggregateByHabit.get(habit.id)?.last30 ?? 0;
      if (!opportunities) continue;
      const rate = completed / opportunities * 100;
      if (!worstHabit || rate < worstHabit.rate) worstHabit = { id: habit.id, name: habit.title, rate };
    }

    const artwork = settings?.vacationMode
      ? "/tree/dorman.svg"
      : worstHabit && worstHabit.rate < 50
        ? "/tree/daun-kuning.svg"
        : currentStreak >= 7
          ? "/tree/berbunga.svg"
          : stage.artwork;

    return NextResponse.json({
      today, weekStart: monday, totalXp, weeklyXp, level, levelProgress,
      currentStreak, completedGoals, habitCount: habits.length,
      scheduledToday: scheduledToday.length, completedToday: todayScheduledDone,
      vacationMode: Boolean(settings?.vacationMode), stage, artwork,
      worstHabit, totalLogs,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina growth summary failed:", error);
    return NextResponse.json({ error: "Gagal menghitung pertumbuhan pohon." }, { status: 500 });
  }
}
