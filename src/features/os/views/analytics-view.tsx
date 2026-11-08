"use client";

import { useMemo } from "react";
import type { OsData } from "@/features/os/view-props";
import { formatCompactRupiah, formatDate, formatRupiah } from "@/lib/format";
import { completionForDate, computeStreak, isDoneOn, lastDays, weekdayIndex } from "@/features/os/use-history";
import { Bars, EmptyState, ProgressBar, SectionHead, Sparkline, StatTile } from "@/features/os/widgets";
import { ChartIcon, FlameIcon, HabitIco, SparkIcon, TargetIcon, TrendDownIcon, TrendUpIcon } from "@/features/os/os-icons";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function AnalyticsView({ data }: { data: OsData }) {
  const { habits, transactions, journal, today } = data;

  /* ---- 30-day consistency ---- */
  const days30 = useMemo(() => lastDays(today, 30), [today]);
  const series30 = useMemo(
    () => days30.map((date) => ({ date, ...completionForDate(journal, habits, date, today) })),
    [days30, journal, habits, today],
  );
  const activeDays = series30.filter((d) => d.total > 0);
  const avg30 = activeDays.length === 0 ? 0 : Math.round((activeDays.reduce((s, d) => s + d.ratio, 0) / activeDays.length) * 100);
  const perfectDays = series30.filter((d) => d.total > 0 && d.done === d.total).length;
  const totalCheckins = series30.reduce((s, d) => s + d.done, 0);

  /* area chart path */
  const chart = useMemo(() => {
    const width = 640;
    const height = 170;
    const values = series30.map((d) => d.ratio * 100);
    const stepX = width / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => [i * stepX, height - 8 - (v / 100) * (height - 26)] as const);
    const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L${width} ${height} L0 ${height} Z`;
    return { line, area, width, height, points };
  }, [series30]);

  /* ---- weekday performance ---- */
  const weekdayBars = useMemo(() => {
    return WEEKDAY_ORDER.map((dow) => {
      const list = series30.filter((d) => weekdayIndex(d.date) === dow && d.total > 0);
      const avg = list.length === 0 ? 0 : Math.round((list.reduce((s, d) => s + d.ratio, 0) / list.length) * 100);
      return {
        label: WEEKDAY_FULL[dow].slice(0, 3),
        value: avg,
        hint: `${WEEKDAY_FULL[dow]} — rata-rata ${avg}% (${list.length} hari berdata)`,
        highlight: false,
      };
    });
  }, [series30]);

  const bestWeekday = weekdayBars.reduce((best, d) => (d.value > best.value ? d : best), weekdayBars[0]);

  /* ---- habit consistency ranking (30d) ---- */
  const habitRank = useMemo(() => {
    return habits
      .map((habit) => {
        let scheduled = 0;
        let done = 0;
        for (const date of days30) {
          const habitDue =
            !habit.schedule || habit.schedule.kind === "daily"
              ? true
              : habit.schedule.kind === "weekly"
                ? habit.schedule.days.includes(weekdayIndex(date))
                : habit.schedule.dates.includes(Number(date.slice(8, 10)));
          if (!habitDue) continue;
          scheduled += 1;
          if (isDoneOn(journal, habit, date, today)) done += 1;
        }
        return {
          habit,
          rate: scheduled === 0 ? 0 : Math.round((done / scheduled) * 100),
          done,
          scheduled,
          streak: computeStreak(journal, habit, today),
        };
      })
      .sort((a, b) => b.rate - a.rate || b.streak - a.streak);
  }, [habits, journal, days30, today]);

  /* ---- finance 30 days ---- */
  const dailyExpense = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
    return days30.map((date) => ({
      label: date.slice(8, 10),
      value: byDate.get(date) ?? 0,
      hint: `${formatDate(date, { weekday: "long" })} — ${byDate.get(date) ? formatRupiah(byDate.get(date)!) : "Rp 0"}`,
      highlight: date === today,
    }));
  }, [transactions, days30, today]);

  const expense30 = dailyExpense.reduce((s, d) => s + d.value, 0);
  const avgExpense = Math.round(expense30 / 30);
  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !days30.includes(t.date)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    const rows = [...map.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value);
    return rows;
  }, [transactions, days30]);

  const netSpark = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (!days30.includes(t.date)) continue;
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
    }
    const out: number[] = [];
    let run = 0;
    for (const d of days30) {
      run += byDate.get(d) ?? 0;
      out.push(run);
    }
    return out;
  }, [transactions, days30]);

  const hasHabitData = totalCheckins > 0;
  const hasFinanceData = expense30 > 0 || transactions.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Rata-rata 30 hari" value={`${avg30}%`} sub={`${activeDays.length} hari berdata`} tone="accent" icon={<TargetIcon size={16} />} />
        <StatTile label="Hari sempurna" value={`${perfectDays}`} sub="100% selesai" icon={<SparkIcon size={16} />} />
        <StatTile label="Total check-in" value={`${totalCheckins}`} sub="30 hari terakhir" icon={<FlameIcon size={16} />} />
        <StatTile
          label="Pengeluaran 30 hari"
          value={formatCompactRupiah(expense30)}
          sub={`≈ ${formatCompactRupiah(avgExpense)}/hari`}
          tone={expense30 > 0 ? "crimson" : "default"}
          icon={<TrendDownIcon size={16} />}
        />
      </div>

      {/* consistency area chart */}
      <section className="os-card p-4 sm:p-5" aria-label="Konsistensi 30 hari">
        <SectionHead
          title="Konsistensi 30 hari"
          right={<span className="num text-[12px] font-semibold text-accent">{avg30}% rata-rata</span>}
        />
        {!hasHabitData ? (
          <EmptyState icon={<ChartIcon size={22} />} title="Belum ada data check-in" hint="Grafik terisi setelah kamu mencentang kebiasaan." />
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              className="h-[170px] w-full"
              role="img"
              aria-label={`Grafik persentase penyelesaian harian 30 hari terakhir, rata-rata ${avg30} persen`}
            >
              <defs>
                <linearGradient id="os-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#37d99a" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#37d99a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[25, 50, 75].map((g) => (
                <line key={g} x1="0" x2={chart.width} y1={chart.height - 8 - (g / 100) * (chart.height - 26)} y2={chart.height - 8 - (g / 100) * (chart.height - 26)} stroke="#1a211b" strokeWidth="1" strokeDasharray="3 5" />
              ))}
              <path d={chart.area} fill="url(#os-area)" />
              <path d={chart.line} fill="none" stroke="#37d99a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {chart.points.length > 0 && (
                <circle cx={chart.points[chart.points.length - 1][0]} cy={chart.points[chart.points.length - 1][1]} r="3.5" fill="#37d99a" />
              )}
            </svg>
            <div className="mt-2 flex justify-between">
              <span className="num text-[10.5px] text-faint">{formatDate(days30[0])}</span>
              <span className="num text-[10.5px] text-faint">Hari ini</span>
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        {/* weekday performance */}
        <section className="os-card p-4 sm:p-5 xl:col-span-5" aria-label="Performa per hari">
          <SectionHead title="Performa per hari" right={bestWeekday ? <span className="num text-[12px] text-dim">terbaik: {bestWeekday.label}</span> : undefined} />
          {weekdayBars.every((b) => b.value === 0) ? (
            <EmptyState icon={<ChartIcon size={22} />} title="Belum ada data" hint="Rata-rata per hari muncul setelah ada check-in." />
          ) : (
            <Bars data={weekdayBars} label="Rata-rata persentase penyelesaian per hari dalam seminggu" />
          )}
        </section>

        {/* habit ranking */}
        <section className="os-card p-4 sm:p-5 xl:col-span-7" aria-label="Peringkat konsistensi kebiasaan">
          <SectionHead title="Konsistensi kebiasaan" right={<span className="num text-[12px] text-dim">30 hari</span>} />
          {habitRank.length === 0 ? (
            <EmptyState icon={<ChartIcon size={22} />} title="Belum ada kebiasaan" hint="Tambahkan kebiasaan untuk mulai dipantau." />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {habitRank.slice(0, 6).map((row, i) => (
                <li key={row.habit.id} className="flex items-center gap-3 py-2.5">
                  <span className="num w-5 shrink-0 text-center text-[11px] font-bold text-faint">{i + 1}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#232c25] bg-[#121712] text-dim">
                    <HabitIco name={row.habit.icon} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-ink">{row.habit.title}</span>
                      <span className="num shrink-0 text-[11.5px] text-dim">
                        {row.done}/{row.scheduled} · <span className="font-semibold text-accent">{row.rate}%</span>
                      </span>
                    </div>
                    <ProgressBar value={row.rate} max={100} label={`Konsistensi ${row.habit.title} ${row.rate} persen`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* finance trends */}
      <section className="os-card p-4 sm:p-5" aria-label="Tren keuangan 30 hari">
        <SectionHead
          title="Arus kas 30 hari"
          right={
            <span className="hidden sm:block">
              <Sparkline values={netSpark} label="Tren arus kas kumulatif 30 hari" color={netSpark[netSpark.length - 1] >= 0 ? "#37d99a" : "#f37272"} />
            </span>
          }
        />
        {!hasFinanceData ? (
          <EmptyState icon={<TrendUpIcon size={22} />} title="Belum ada transaksi" hint="Catat transaksi untuk melihat tren arus kas." />
        ) : (
          <>
            <Bars data={dailyExpense} tone="crimson" height={120} label="Grafik pengeluaran harian 30 hari terakhir" />
            {topCategory.length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                <span className="os-micro">Kategori teratas</span>
                <div className="flex flex-wrap gap-2">
                  {topCategory.slice(0, 4).map((row, i) => (
                    <span key={row.category} className="os-chip !cursor-default" data-active={i === 0}>
                      {row.category}
                      <span className="num text-[10.5px] text-faint">{formatCompactRupiah(row.value)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
