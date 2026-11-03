import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type InsightType = "mood" | "sleep" | "performance" | "streak" | "finance";
type Insight = { id: string; type: InsightType; title: string; text: string; habitId?: string };

function jakartaDate(): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftDate(date: string, delta: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}
function number(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}
function validInsight(value: unknown): value is Omit<Insight, "id"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return ["mood", "sleep", "performance", "streak", "finance"].includes(String(item.type)) &&
    typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 80 &&
    typeof item.text === "string" && item.text.trim().length > 0 && item.text.length <= 600 &&
    (item.habitId === undefined || typeof item.habitId === "string");
}
function parseJsonArray(raw: string): unknown[] | null {
  const text = raw.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const today = jakartaDate();
    const start30 = shiftDate(today, -29);
    const start14 = shiftDate(today, -13);
    const monthStart = `${today.slice(0, 7)}-01`;

    const [habitRows, completionRows, checkinRows, transactionRows, metadataRows] = await Promise.all([
      db.$queryRaw<Array<{ id: string; title: string; category: string }>>`SELECT id, title, category FROM habits ORDER BY sort_order ASC, created_at ASC`,
      db.$queryRaw<Array<{ habitId: string; date: string }>>`
        SELECT habit_id AS habitId, completed_on AS date
        FROM habit_checkins WHERE completed_on >= ${start30} AND completed_on <= ${today}`,
      db.$queryRaw<Array<{ payload: string }>>`SELECT payload FROM workspace_modules WHERE module_key = 'checkins' LIMIT 1`,
      db.$queryRaw<Array<{ type: string; amount: number | bigint; date: string }>>`
        SELECT type, amount, transaction_date AS date
        FROM transactions WHERE transaction_date >= ${monthStart} AND transaction_date <= ${today}`,
      db.$queryRaw<Array<{ habitId: string; payload: string }>>`SELECT habit_id AS habitId, payload FROM habit_metadata`,
    ]);

    const metadata = new Map<string, Record<string, unknown>>();
    for (const row of metadataRows) {
      try {
        const value: unknown = JSON.parse(String(row.payload));
        if (value && typeof value === "object" && !Array.isArray(value)) metadata.set(String(row.habitId), value as Record<string, unknown>);
      } catch { /* ignore one malformed metadata record */ }
    }

    let checkins: Array<{ date: string; mood: number; energy: number; sleepHours: number; notes: string }> = [];
    try {
      const parsed: unknown = JSON.parse(String(checkinRows[0]?.payload ?? "[]"));
      if (Array.isArray(parsed)) {
        checkins = parsed.filter((item): item is { date: string; mood: number; energy: number; sleepHours: number; notes: string } =>
          Boolean(item && typeof item === "object" &&
            typeof item.date === "string" && item.date >= start14 && item.date <= today &&
            typeof item.mood === "number" && typeof item.energy === "number" &&
            typeof item.sleepHours === "number" && typeof item.notes === "string"),
        );
      }
    } catch { checkins = []; }

    const doneByHabit = new Map<string, number>();
    for (const row of completionRows) {
      const key = String(row.habitId);
      doneByHabit.set(key, (doneByHabit.get(key) ?? 0) + 1);
    }
    const habits = habitRows.map((row) => {
      const id = String(row.id);
      const detail = metadata.get(id) ?? {};
      return {
        id, title: String(row.title), category: String(row.category),
        type: detail.kind === "avoid" ? "avoid" : detail.kind === "amount" ? "amount" : "normal",
        difficulty: typeof detail.difficulty === "string" ? detail.difficulty : "easy",
        completedDays30: doneByHabit.get(id) ?? 0,
      };
    });

    const moodAverage = checkins.length ? Number((checkins.reduce((sum, item) => sum + item.mood, 0) / checkins.length).toFixed(1)) : null;
    const energyAverage = checkins.length ? Number((checkins.reduce((sum, item) => sum + item.energy, 0) / checkins.length).toFixed(1)) : null;
    const sleepAverage = checkins.length ? Number((checkins.reduce((sum, item) => sum + item.sleepHours, 0) / checkins.length).toFixed(1)) : null;
    const finance = transactionRows.reduce((summary, row) => {
      const amount = number(row.amount);
      if (String(row.type) === "income") summary.income += amount;
      if (String(row.type) === "expense") summary.expense += amount;
      return summary;
    }, { income: 0, expense: 0 });
    const net = finance.income - finance.expense;

    const fallback: Array<Omit<Insight, "id">> = [];
    if (checkins.length) {
      fallback.push({
        type: "mood",
        title: "Rata-rata suasana hati",
        text: `Dalam ${checkins.length} catatan check-in selama 14 hari terakhir, rata-rata mood tercatat ${moodAverage}/5 dan energi ${energyAverage}/5. Gunakan pola ini sebagai bahan refleksi, bukan penilaian kesehatan.`,
      });
      if (sleepAverage !== null) fallback.push({
        type: "sleep",
        title: sleepAverage < 7 ? "Perhatikan pola waktu tidur" : "Pola tidur tercatat stabil",
        text: `Rata-rata durasi tidur dari catatan yang tersedia adalah ${sleepAverage} jam. ${sleepAverage < 7 ? "Pertimbangkan meninjau rutinitas malam dan beban aktivitas." : "Pertahankan kebiasaan yang membantu jadwal istirahatmu."}`,
      });
    } else {
      fallback.push({
        type: "mood",
        title: "Mulai bangun pola check-in",
        text: "Belum ada data mood, energi, atau tidur yang cukup. Catat check-in harian agar pola dua minggu mulai terbentuk.",
      });
    }
    const mostRecorded = [...habits].sort((a, b) => b.completedDays30 - a.completedDays30)[0];
    if (mostRecorded && mostRecorded.completedDays30 > 0) fallback.push({
      type: "performance",
      title: "Habit paling sering tercatat",
      text: `“${mostRecorded.title}” memiliki ${mostRecorded.completedDays30} hari penyelesaian yang tersimpan selama 30 hari terakhir. Lihat apakah waktu dan pemicunya bisa diterapkan pada kebiasaan lain.`,
      habitId: mostRecorded.id,
    });
    const leastRecorded = [...habits].filter((item) => item.completedDays30 === 0);
    if (leastRecorded.length) fallback.push({
      type: "streak",
      title: "Ada habit tanpa catatan baru",
      text: `${leastRecorded.length} habit belum memiliki penyelesaian yang tercatat dalam 30 hari terakhir. Tinjau kembali target, jadwal, atau apakah habit tersebut masih relevan.`,
    });
    if (finance.income || finance.expense) fallback.push({
      type: "finance",
      title: net >= 0 ? "Arus kas bulan ini positif" : "Pengeluaran melampaui pemasukan",
      text: `Pemasukan bulan ini ${Math.round(finance.income).toLocaleString("id-ID")} dan pengeluaran ${Math.round(finance.expense).toLocaleString("id-ID")}, sehingga arus kas bersih ${net < 0 ? "defisit " : "surplus "}${Math.abs(Math.round(net)).toLocaleString("id-ID")}.`,
    });
    else fallback.push({
      type: "finance",
      title: "Mulai catat transaksi",
      text: "Belum ada transaksi bulan ini. Catatan pemasukan dan pengeluaran diperlukan sebelum pola keuangan bisa dianalisis.",
    });

    let insights = fallback.slice(0, 6);
    let source: "ai" | "rule-based" = "rule-based";
    try {
      const zai = await ZAI.create();
      const completionPromise = zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Kamu adalah asisten analitik pribadi pada aplikasi Rutina. Balas hanya JSON array berisi 4-6 insight. Setiap item wajib memiliki type: mood|sleep|performance|streak|finance, title (maks 80 karakter), text (maks 600 karakter), dan habitId opsional. Gunakan bahasa Indonesia yang hangat, spesifik dengan angka, jangan membuat klaim kesehatan/keuangan di luar data. Untuk habit avoid, hari yang tercatat berarti hari bersih tanpa kebiasaan yang dihindari; jangan memuji perilaku yang dihindari.",
          },
          { role: "user", content: `Buat insight dari ringkasan data berikut: ${JSON.stringify({
            period: "30 hari terakhir",
            habits,
            checkins: { count: checkins.length, moodAverage, energyAverage, sleepAverage },
            finance: { ...finance, net },
          })}` },
        ],
        thinking: { type: "disabled" },
      });
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("AI insights timeout")), 10_000); });
      try {
        const completion = await Promise.race([completionPromise, timeoutPromise]);
        const raw = String((completion as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content ?? "");
        const parsed = raw ? parseJsonArray(raw) : null;
        const valid = (parsed ?? []).filter(validInsight).slice(0, 8);
        if (valid.length) {
          insights = valid.map((item, index) => ({ ...item, id: `ai-${index + 1}` }));
          source = "ai";
        }
      } finally {
        clearTimeout(timeout);
        completionPromise.catch(() => undefined);
      }
    } catch {
      // AI provider unavailable/time out: use computed rule-based insights.
    }

    return NextResponse.json({ insights, source, generatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Rutina AI insights failed:", error);
    return NextResponse.json({ error: "Gagal menghitung insight dari data workspace." }, { status: 500 });
  }
}
