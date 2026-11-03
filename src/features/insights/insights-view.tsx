"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, BrainCircuit, Flame, HeartPulse, Moon, PiggyBank, RefreshCw, Sprout, Target, WalletCards } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { DailyCheckin } from "@/lib/module-types";
import { formatCompactRupiah, todayISO } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { PageIntro, SectionHeading, StatCard } from "@/components/ui/primitives";

const habitCategories: Habit["category"][] = ["Health", "Learning", "Mindfulness", "Personal"];
type InsightType = "mood" | "sleep" | "performance" | "streak" | "finance";
type Insight = { id: string; type: InsightType; title: string; text: string; habitId?: string };
type InsightPeriod = "week" | "month" | "year";
type HabitHistoryRecord = { habitId: string; title: string; date: string };

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
  const [weeklyHistorySnapshot, setWeeklyHistorySnapshot] = useState<{
    key: string;
    records: HabitHistoryRecord[];
    error: boolean;
  } | null>(null);
  const [historyRetryVersion, setHistoryRetryVersion] = useState(0);
  const [aiRetryVersion, setAiRetryVersion] = useState(0);
  const [period, setPeriod] = useState<InsightPeriod>("week");
  // Keep the freshest local data available for the offline fallback without
  // re-running the (expensive, LLM-backed) request on every workspace change.
  const fallbackDataRef = useRef({ checkins, habits, income, expense });
  useEffect(() => {
    fallbackDataRef.current = { checkins, habits, income, expense };
  }, [checkins, habits, income, expense]);

  const todayKey = todayISO();
  const periodDateKeys = useMemo(() => {
    if (period === "year") return [];
    const count = period === "week" ? 7 : 30;
    const anchor = new Date(todayKey + "T12:00:00+07:00");
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(anchor);
      date.setUTCDate(date.getUTCDate() - (count - 1 - index));
      return date.toISOString().slice(0, 10);
    });
  }, [todayKey, period]);
  const periodMonthKeys = useMemo(() => {
    if (period === "year") {
      const [year, month] = todayKey.slice(0, 7).split("-").map(Number);
      return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(Date.UTC(year, month - 1 - (11 - index), 1));
        return date.toISOString().slice(0, 7);
      });
    }
    return [...new Set(periodDateKeys.map((date) => date.slice(0, 7)))];
  }, [todayKey, period, periodDateKeys]);
  const periodMonthKey = periodMonthKeys.join(",");
  const historyRequestKey = periodMonthKey + ":" + historyRetryVersion;
  const weeklyHistoryLoading = weeklyHistorySnapshot?.key !== historyRequestKey;
  const weeklyHistoryError = !weeklyHistoryLoading && Boolean(weeklyHistorySnapshot?.error);
  const weeklyHistory = useMemo(
    () => weeklyHistoryLoading ? [] : (weeklyHistorySnapshot?.records ?? []),
    [weeklyHistoryLoading, weeklyHistorySnapshot?.records],
  );
  const recentCheckins = useMemo(() => checkins.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14), [checkins]);
  const trendCheckins = recentCheckins.slice(0, 7).reverse();

  const completedByDate = useMemo(() => {
    const map = new Map<string, number>();
    weeklyHistory.forEach((record) => map.set(record.date, (map.get(record.date) ?? 0) + 1));
    map.set(todayKey, habits.filter((habit) => habit.completed).length);
    return map;
  }, [weeklyHistory, todayKey, habits]);
  const trendData = useMemo(() => {
    if (period === "year") {
      return periodMonthKeys.map((month) => ({
        key: month,
        label: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(new Date(month + "-01T00:00:00Z")),
        completed: [...completedByDate.entries()].filter(([date]) => date.slice(0, 7) === month).reduce((sum, [, count]) => sum + count, 0),
      }));
    }
    if (period === "month") {
      return Array.from({ length: 5 }, (_, index) => {
        const dates = periodDateKeys.slice(index * 7, (index + 1) * 7);
        return { key: "week-" + index, label: "Minggu " + (index + 1), completed: dates.reduce((sum, date) => sum + (completedByDate.get(date) ?? 0), 0) };
      }).filter((item) => item.key === "week-0" || item.completed > 0 || periodDateKeys.length > 28);
    }
    return periodDateKeys.map((date) => ({
      key: date,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(date + "T12:00:00+07:00")),
      completed: completedByDate.get(date) ?? 0,
    }));
  }, [period, periodDateKeys, periodMonthKeys, completedByDate]);
  const trendMax = Math.max(1, ...trendData.map((item) => item.completed));
  const trendTotal = trendData.reduce((sum, item) => sum + item.completed, 0);
  const periodTitle = period === "week" ? "Progress Mingguan" : period === "month" ? "Progress Bulanan" : "Progress Tahunan";
  const periodCaption = period === "week" ? "7 hari terakhir" : period === "month" ? "30 hari terakhir" : "12 bulan terakhir";
  const moodAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.mood, 0) / recentCheckins.length : null;
  const energyAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.energy, 0) / recentCheckins.length : null;
  const sleepAverage = recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item.sleepHours, 0) / recentCheckins.length : null;
  const growthHeadline = period === "week"
    ? "Tujuh hari, banyak langkah kecil."
    : period === "month"
      ? "Satu bulan yang terus membentuk ceritamu."
      : "Lihat perjalanan yang kamu bangun sepanjang tahun.";
  const growthSummary = weeklyHistoryLoading
    ? "Rutina sedang menyusun catatan perkembanganmu."
    : weeklyHistoryError
      ? "Riwayat belum dapat dimuat. Catatan yang sudah tersimpan tetap aman."
      : trendTotal > 0
        ? `Ada ${trendTotal} penyelesaian habit yang tercatat dalam ${periodCaption}. Setiap langkah kecil layak dihargai.`
        : `Belum ada penyelesaian habit yang tercatat dalam ${periodCaption}. Kamu bisa mulai lagi kapan pun siap.`;

  useEffect(() => {
    let cancelled = false;
    void Promise.all(periodMonthKeys.map(async (month) => {
      const response = await fetch("/api/history?month=" + encodeURIComponent(month), { cache: "no-store" });
      if (!response.ok) throw new Error("Habit history unavailable");
      const payload = await response.json() as { records?: HabitHistoryRecord[] };
      return Array.isArray(payload.records) ? payload.records : [];
    }))
      .then((recordsByMonth) => {
        if (!cancelled) setWeeklyHistorySnapshot({ key: historyRequestKey, records: recordsByMonth.flat(), error: false });
      })
      .catch(() => {
        if (!cancelled) setWeeklyHistorySnapshot({ key: historyRequestKey, records: [], error: true });
      });
    return () => { cancelled = true; };
  }, [historyRequestKey, periodMonthKeys]);

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
        const fallback = fallbackDataRef.current;
        setInsights(localInsights(fallback.checkins, fallback.habits, fallback.income, fallback.expense));
        setSource("local");
        setSourceNote("Insight lokal ditampilkan karena layanan server belum tersedia atau koneksi database sedang tidak aktif.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [aiRetryVersion]);

  return (
    <>
      <PageIntro eyebrow="REFLEKSI PERKEMBANGAN" title="Lihat yang sudah tumbuh." subtitle="Ringkasan dari aktivitas, check-in, dan transaksi yang benar-benar tercatat." />
      <div className="insight-period-tabs" role="group" aria-label="Rentang insight">
        <button type="button" className={period === "week" ? "active" : ""} aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Minggu</button>
        <button type="button" className={period === "month" ? "active" : ""} aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Bulan</button>
        <button type="button" className={period === "year" ? "active" : ""} aria-pressed={period === "year"} onClick={() => setPeriod("year")}>Tahun</button>
      </div>

      <section className="growth-wrapped-panel" aria-label="Ringkasan perjalananmu">
        <div className="growth-wrapped-copy">
          <span className="growth-wrapped-kicker">YOUR GROWTH STORY</span>
          <h2>{growthHeadline}</h2>
          <p>{growthSummary}</p>
        </div>
        <div className="growth-wrapped-metrics">
          <div className="growth-wrapped-metric">
            <span className="growth-wrapped-icon"><Sprout size={17} /></span>
            <div><strong>{weeklyHistoryLoading || weeklyHistoryError ? "—" : trendTotal.toLocaleString("id-ID")}</strong><small>Habit selesai · {periodCaption}</small></div>
          </div>
          <div className="growth-wrapped-metric">
            <span className="growth-wrapped-icon mood"><HeartPulse size={17} /></span>
            <div><strong>{moodAverage === null ? "—" : moodAverage.toFixed(1) + "/5"}</strong><small>Rata-rata mood · {recentCheckins.length} check-in terakhir</small></div>
          </div>
        </div>
      </section>
      <div className="insights-stat-grid botanical-insight-stats">
        <StatCard label="Progres hari ini" value={`${progress}%`} foot={`${completed} dari ${total} habit selesai hari ini`} icon={Target} tone="green" />
        <StatCard label="Rekor konsistensi" value={`${longestStreak} hari`} foot="Satu capaian yang pernah kamu bangun" icon={Flame} tone="amber" />
        <StatCard label="Arus kas bersih" value={formatCompactRupiah(totalNet)} foot="Bulan berjalan" icon={PiggyBank} />
      </div>

      <section className="card card-pad insight-trend-panel" aria-label="Ringkasan progres habit dan check-in selama tujuh hari terakhir">
        <SectionHeading title={periodTitle} caption={"Jumlah habit yang tercatat selesai · " + periodCaption} />
        {weeklyHistoryLoading ? (
          <div className="insight-history-skeleton" role="status" aria-live="polite">
            <span className="sr-only">Memuat data progres {periodCaption}.</span>
            <div className="insight-skeleton-bars">
              {Array.from({ length: period === "year" ? 12 : period === "month" ? 5 : 7 }, (_, index) => <span className="insight-skeleton-day" key={index}><i className="skeleton-shimmer" /></span>)}
            </div>
            <div className="insight-skeleton-legend"><span className="skeleton-shimmer" /><span className="skeleton-shimmer" /></div>
          </div>
        ) : !weeklyHistoryError ? (
          trendTotal > 0 ? (
            <>
              <div className="insight-trend-chart" style={{ gridTemplateColumns: "repeat(" + trendData.length + ", minmax(0, 1fr))" }}>
                {trendData.map((item) => (
                  <div className="insight-trend-day" key={item.key} aria-label={item.label + ": " + item.completed + " habit selesai"}>
                    <strong className="insight-trend-value">{item.completed}</strong>
                    <div className="insight-trend-bars">
                      <span className="insight-trend-bar activity" style={{ height: item.completed ? `${Math.max(8, item.completed / trendMax * 100)}%` : "0%" }} title={`${item.completed} habit selesai`} />
                    </div>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
              <div className="insight-trend-legend"><span><i className="activity" /> Habit selesai</span><small>{trendTotal} penyelesaian · {periodCaption}</small></div>
            </>
          ) : (
            <div className="insight-trend-empty"><span><Sprout size={22} /></span><strong>Belum ada progres minggu ini</strong><p>Habit yang kamu selesaikan akan muncul di grafik ini setelah tersimpan.</p></div>
          )
        ) : period === "week" && trendCheckins.length > 0 ? (
          <>
            <div className="insight-trend-chart">
              {trendCheckins.map((item) => (
                <div className="insight-trend-day" key={item.date} aria-label={`${item.date}: mood ${item.mood} dari 5, energi ${item.energy} dari 5`}>
                  <div className="insight-trend-bars">
                    <span className="insight-trend-bar mood" style={{ height: `${item.mood / 5 * 100}%` }} title={`Mood ${item.mood}/5`} />
                    <span className="insight-trend-bar energy" style={{ height: `${item.energy / 5 * 100}%` }} title={`Energi ${item.energy}/5`} />
                  </div>
                  <small>{new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${item.date}T12:00:00+07:00`))}</small>
                </div>
              ))}
            </div>
            <div className="insight-trend-legend"><span><i className="mood" /> Mood</span><span><i className="energy" /> Energi</span><small>Fallback dari check-in</small></div>
          </>
        ) : (
          <div className="insight-trend-empty" role="status"><span><Sprout size={22} /></span><strong>Riwayat belum dapat dimuat</strong><p>Periksa koneksi lalu coba ambil data kembali. Catatan lokal tetap aman.</p><button className="weekly-retry-action" type="button" onClick={() => setHistoryRetryVersion((current) => current + 1)}><RefreshCw size={13} /> Coba lagi</button></div>
        )}
      </section>

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
            <p className="section-caption">{total === 0 ? "Belum ada kebiasaan tersimpan." : total === completed ? "Semua kebiasaan hari ini sudah kamu rawat. Luangkan waktu untuk menikmati progresmu." : "Masih ada ruang untuk melanjutkan, satu langkah kecil kapan pun kamu siap."}</p>
          </section>
        </div>
      </div>

      <section className="card card-pad insight-ai-panel">
        <div className="insight-ai-heading"><div><SectionHeading title="AI Insights" caption="Pola yang dibaca dari habit, check-in, dan transaksi." />{sourceNote && <p className="insight-source-note">{sourceNote}</p>}</div><div className="insight-ai-actions"><span className={`insight-source-badge ${source}`}>{loading ? "Memuat…" : source === "ai" ? "AI aktif" : source === "rule-based" ? "Analisis data" : "Mode lokal"}</span>{!loading && source === "local" && <button className="insight-retry-button" type="button" onClick={() => { setLoading(true); setAiRetryVersion((current) => current + 1); }}><RefreshCw size={12} /> Coba lagi</button>}</div></div>
        <div className="insight-ai-list">
          {loading ? (
            <div className="insight-ai-skeleton" role="status" aria-live="polite">
              <span className="sr-only">Rutina sedang menganalisis data.</span>
              {Array.from({ length: 3 }, (_, index) => <div className="insight-ai-skeleton-row" key={index}><span className="skeleton-shimmer" /><div><i className="skeleton-shimmer" /><i className="skeleton-shimmer" /></div></div>)}
            </div>
          ) : insights.map((item) => {
            const Icon = insightIcon[item.type] ?? BrainCircuit;
            return <article className="insight-ai-item" key={item.id}><span><Icon size={16} /></span><div><strong>{item.title}</strong><p>{item.text}</p></div></article>;
          })}
        </div>
      </section>
    </>
  );
}
