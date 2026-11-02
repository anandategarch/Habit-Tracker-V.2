"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, BrainCircuit, Flame, HeartPulse, Moon, PiggyBank, Sprout, Target, WalletCards } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { DailyCheckin } from "@/lib/module-types";
import { formatCompactRupiah } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { PageIntro, SectionHeading, StatCard } from "@/components/ui/primitives";

const habitCategories: Habit["category"][] = ["Health", "Learning", "Mindfulness", "Personal"];
type InsightType = "mood" | "sleep" | "performance" | "streak" | "finance";
type Insight = { id: string; type: InsightType; title: string; text: string; habitId?: string };

function localInsights(checkins: DailyCheckin[], habits: Habit[], income: number, expense: number): Insight[] {
  const average = (field: "mood" | "energy" | "sleepHours") => checkins.length
    ? checkins.reduce((sum, item) => sum + item[field], 0) / checkins.length
    : null;
  const mood = average("mood");
  const sleep = average("sleepHours");
  const result: Insight[] = [];
  result.push(mood === null
    ? { id: "local-mood", type: "mood", title: "Mulai bangun pola check-in", text: "Catat mood dan energi setiap hari agar pola refleksi mulai terlihat." }
    : { id: "local-mood", type: "mood", title: "Rata-rata suasana hati", text: `Dari ${checkins.length} catatan check-in yang tersedia, rata-rata mood ${mood.toFixed(1)}/5.` });
  result.push(sleep === null
    ? { id: "local-sleep", type: "sleep", title: "Belum ada pola tidur", text: "Masukkan durasi tidur di daily check-in untuk mulai membaca pola istirahat." }
    : { id: "local-sleep", type: "sleep", title: "Rata-rata durasi tidur", text: `Dari ${checkins.length} catatan check-in, rata-rata tidur ${sleep.toFixed(1)} jam.` });
  const done = habits.filter((habit) => habit.completed).length;
  result.push({ id: "local-habit", type: "performance", title: "Progress habit hari ini", text: `${done} dari ${habits.length} habit aktif telah ditandai selesai hari ini.` });
  const net = income - expense;
  result.push({ id: "local-finance", type: "finance", title: net >= 0 ? "Arus kas bulan ini positif" : "Perhatikan arus kas bulan ini", text: `Pemasukan ${formatCompactRupiah(income)} dan pengeluaran ${formatCompactRupiah(expense)} menghasilkan arus kas bersih ${formatCompactRupiah(net)}.` });
  return result;
}

const insightIcon: Record<InsightType, typeof BrainCircuit> = {
  mood: HeartPulse, sleep: Moon, performance: Target, streak: Flame, finance: WalletCards,
};

export function InsightsView({ habits, income, expense, checkins = [] }: {
  habits: Habit[]; income: number; expense: number; checkins?: DailyCheckin[];
}) {
  const { completed, total, progress, longestStreak } = summarizeHabits(habits);
  const categorySummary = habitCategories.map((category) => ({
    category,
    total: habits.filter((habit) => habit.category === category).length,
    completed: habits.filter((habit) => habit.category === category && habit.completed).length,
  })).filter((item) => item.total > 0);
  const totalNet = income - expense;
  const [insights, setInsights] = useState<Insight[]>(() => localInsights(checkins, habits, income, expense));
  const [source, setSource] = useState<"ai" | "rule-based" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [sourceNote, setSourceNote] = useState("");

  const recentCheckins = useMemo(() => checkins.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14), [checkins]);
  const moodAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.mood, 0) / recentCheckins.length : null;
  const energyAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.energy, 0) / recentCheckins.length : null;
  const sleepAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.sleepHours, 0) / recentCheckins.length : null;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ai-insights", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("AI endpoint unavailable");
        return response.json() as Promise<{ insights?: Insight[]; source?: "ai" | "rule-based" }>;
      })
      .then((payload) => {
        if (cancelled || !Array.isArray(payload.insights)) return;
        setInsights(payload.insights);
        setSource(payload.source === "ai" ? "ai" : "rule-based");
        setSourceNote(payload.source === "ai" ? "Dihasilkan dengan model AI berdasarkan ringkasan data workspace." : "Provider AI tidak merespons; insight dihitung dari data yang tersedia.");
      })
      .catch(() => {
        if (cancelled) return;
        setInsights(localInsights(checkins, habits, income, expense));
        setSource("local");
        setSourceNote("Insight lokal ditampilkan karena layanan server belum tersedia atau koneksi database sedang tidak aktif.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [checkins, habits, income, expense]);

  return (
    <>
      <PageIntro eyebrow="REFLEKSI PERKEMBANGAN" title="Lihat yang sudah tumbuh." subtitle="Ringkasan dari aktivitas, check-in, dan transaksi yang benar-benar tercatat." />
      <div className="insights-stat-grid">
        <StatCard label="Progress hari ini" value={`${progress}%`} foot={`${completed} dari ${total} habit selesai`} icon={Target} tone="green" />
        <StatCard label="Streak terpanjang" value={`${longestStreak} hari`} foot="Pada satu kebiasaan" icon={Flame} />
        <StatCard label="Arus kas bersih" value={formatCompactRupiah(totalNet)} foot="Bulan berjalan" icon={PiggyBank} />
      </div>

      <div className="insight-grid">
        <section className="card card-pad">
          <SectionHeading title="Pola kebiasaan" caption="Distribusi status kebiasaan yang tersimpan saat ini" />
          {categorySummary.length > 0 ? (
            <div className="insight-category-list">
              {categorySummary.map(({ category, total: categoryTotal, completed: categoryCompleted }) => (
                <div className="insight-category-row" key={category}>
                  <div className="insight-category-top"><span>{category}</span><strong>{categoryCompleted}/{categoryTotal} selesai</strong></div>
                  <div className="budget-track" role="progressbar" aria-label={`Progress kategori ${category}`} aria-valuenow={categoryTotal ? Math.round(categoryCompleted / categoryTotal * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className="budget-fill" style={{ width: `${categoryTotal ? categoryCompleted / categoryTotal * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="insight-empty"><Sprout size={22} /><strong>Belum ada pola untuk dibaca</strong><p>Tambahkan kebiasaan untuk mulai membangun ringkasan perkembangan.</p></div>}
          <div className="insight-checkin-summary">
            <SectionHeading title="Mood, energi & tidur" caption="Rata-rata dari maksimal 14 check-in terbaru" />
            <div className="insight-checkin-grid">
              <div><HeartPulse size={15} /><small>Mood</small><strong>{moodAverage === null ? "—" : `${moodAverage.toFixed(1)}/5`}</strong></div>
              <div><Activity size={15} /><small>Energi</small><strong>{energyAverage === null ? "—" : `${energyAverage.toFixed(1)}/5`}</strong></div>
              <div><Moon size={15} /><small>Tidur</small><strong>{sleepAverage === null ? "—" : `${sleepAverage.toFixed(1)} jam`}</strong></div>
            </div>
          </div>
        </section>

        <div className="right-stack">
          <section className="card card-pad">
            <SectionHeading title="Arus kas bulan ini" caption="Akumulasi pemasukan dan pengeluaran tercatat" />
            <div className="insight-cashflow-list">
              <div className="insight-cashflow-row"><span className="insight-cashflow-icon income"><ArrowDownLeft size={15} /></span><span><small>Pemasukan</small><strong>{formatCompactRupiah(income)}</strong></span></div>
              <div className="insight-cashflow-row"><span className="insight-cashflow-icon expense"><ArrowUpRight size={15} /></span><span><small>Pengeluaran</small><strong>{formatCompactRupiah(expense)}</strong></span></div>
            </div>
            <div className="insight-net-row"><span>Bersih</span><strong>{formatCompactRupiah(totalNet)}</strong></div>
          </section>
          <section className="insight-highlight">
            <div className="small-label">CATATAN HARI INI</div>
            <div className="insight-number">{completed}<span>/{total}</span></div>
            <p className="section-caption">{total === 0 ? "Belum ada kebiasaan tersimpan." : total === completed ? "Semua kebiasaan hari ini sudah selesai." : `${total - completed} kebiasaan masih bisa kamu selesaikan hari ini.`}</p>
          </section>
        </div>
      </div>

      <section className="card card-pad insight-ai-panel">
        <div className="insight-ai-heading"><div><SectionHeading title="AI Insights" caption="Pola yang dibaca dari habit, check-in, dan transaksi." />{sourceNote && <p className="insight-source-note">{sourceNote}</p>}</div><span className={`insight-source-badge ${source}`}>{loading ? "Memuat…" : source === "ai" ? "AI aktif" : source === "rule-based" ? "Analisis data" : "Mode lokal"}</span></div>
        <div className="insight-ai-list">{insights.map((item) => {
          const Icon = insightIcon[item.type] ?? BrainCircuit;
          return <article className="insight-ai-item" key={item.id}><span><Icon size={16} /></span><div><strong>{item.title}</strong><p>{item.text}</p></div></article>;
        })}{loading && <p className="module-muted">Menganalisis data yang tersedia…</p>}</div>
      </section>
    </>
  );
}
