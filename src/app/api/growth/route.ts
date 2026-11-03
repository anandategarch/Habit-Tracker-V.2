import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
  { id: "benih", label: "Benih", threshold: 0, next: 50, artwork: "/tree/benih.svg", tagline: "Satu keputusan kecil bisa menjadi awal dari perubahan besar." },
  { id: "tunas", label: "Tunas", threshold: 50, next: 150, artwork: "/tree/tunas.svg", tagline: "Konsistensi mulai terlihat. Kebiasaan mulai punya bentuk." },
  { id: "pohon-muda", label: "Pohon Muda", threshold: 150, next: 300, artwork: "/tree/pohon-muda.svg", tagline: "Rutinitas mulai berakar dan memberi hasil yang lebih stabil." },
  { id: "pohon-dewasa", label: "Pohon Dewasa", threshold: 300, next: null, artwork: "/tree/pohon-dewasa.svg", tagline: "Konsistensi berubah menjadi sistem yang bisa diandalkan." },
] as const;
const WISDOM = [
  "Tidak semua pertumbuhan terlihat setiap hari. Akar juga tumbuh dalam diam.",
  "Konsistensi kecil lebih kuat daripada semangat besar yang hanya sesaat.",
  "Beristirahat bukan berarti berhenti bertumbuh.",
  "Rawat prosesnya; hasil akan mengikuti waktunya.",
  "Satu langkah yang diulang adalah awal dari perubahan yang bertahan.",
  "Jangan bandingkan musim tumbuhmu dengan musim panen orang lain.",
  "Hari ini tidak harus sempurna. Cukup terus hadir.",
];

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
  try {
    const today = todayISO();
    const monday = weekStart(today);
    const start30 = shiftYmd(today, -29);
    const [habitRows, logRows, moduleRows] = await Promise.all([
      db.$queryRaw<Array<{ id: string; title: string; streak: number | bigint; payload: string | null }>>`
        SELECT h.id, h.title, h.streak, m.payload
        FROM habits h LEFT JOIN habit_metadata m ON m.habit_id = h.id
        ORDER BY h.sort_order ASC, h.created_at ASC`,
      db.$queryRaw<Array<{ habit_id: string; total_count: number | bigint; weekly_count: number | bigint; last30_count: number | bigint; today_count: number | bigint }>>`
        SELECT habit_id,
          COUNT(*) AS total_count,
          SUM(CASE WHEN completed_on >= ${monday} THEN 1 ELSE 0 END) AS weekly_count,
          SUM(CASE WHEN completed_on >= ${start30} THEN 1 ELSE 0 END) AS last30_count,
          SUM(CASE WHEN completed_on = ${today} THEN 1 ELSE 0 END) AS today_count
        FROM habit_checkins GROUP BY habit_id`,
      db.$queryRaw<Array<{ module_key: string; payload: string }>>`SELECT module_key, payload FROM workspace_modules WHERE module_key IN ('goals', 'settings')`,
    ]);

    const modules = new Map<string, unknown>();
    for (const row of moduleRows) {
      try { modules.set(String(row.module_key), JSON.parse(String(row.payload))); } catch { /* malformed module ignored */ }
    }
    const settings = modules.get("settings") as { vacationMode?: boolean } | undefined;
    const goals = modules.get("goals");
    const completedGoals = Array.isArray(goals) ? goals.filter((goal) => Boolean(goal && typeof goal === "object" && (goal as { completed?: unknown }).completed)).length : 0;

    const habits = habitRows.map((row) => {
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
    for (const row of logRows) {
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
    const dayOfYear = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${today.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000);
    const wisdom = WISDOM[dayOfYear % WISDOM.length];

    return NextResponse.json({
      today, weekStart: monday, totalXp, weeklyXp, level, levelProgress,
      currentStreak, completedGoals, habitCount: habits.length,
      scheduledToday: scheduledToday.length, completedToday: todayScheduledDone,
      vacationMode: Boolean(settings?.vacationMode), stage, artwork, wisdom,
      worstHabit, totalLogs,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina growth summary failed:", error);
    return NextResponse.json({ error: "Gagal menghitung pertumbuhan pohon." }, { status: 500 });
  }
}
