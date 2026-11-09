"use client";

import { useMemo } from "react";
import type { OsActions, OsData } from "@/features/os/view-props";
import { formatCompactRupiah, formatDate, formatRupiah } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { completionForDate, computeStreak, lastDays, weekdayIndex } from "@/features/os/use-history";
import { Bars, EmptyState, ProgressBar, Ring, SectionHead, Sparkline, StatTile, ViewHero } from "@/features/os/widgets";
import { OsIllustration } from "@/features/os/os-illustrations";
import {
  BanknoteIcon, ChevronRightIcon, FlameIcon, FinanceCategoryIco, HabitIco,
  PlusIcon, WalletIcon, ClockIcon,
} from "@/features/os/os-icons";

const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function OverviewView({ data, actions }: { data: OsData; actions: OsActions }) {
  const { habits, transactions, budgets, journal, today } = data;

  const todayPlan = useMemo(
    () =>
      habits
        .filter((h) => {
          if (!h.schedule || h.schedule.kind === "daily") return true;
          if (h.schedule.kind === "weekly") return h.schedule.days.includes(weekdayIndex(today));
          return h.schedule.dates.includes(Number(today.slice(8, 10)));
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    [habits, today],
  );

  const doneCount = todayPlan.filter((h) => h.completed).length;
  const ratio = todayPlan.length === 0 ? 0 : doneCount / todayPlan.length;

  const streaks = useMemo(
    () => habits.map((h) => ({ habit: h, streak: computeStreak(journal, h, today) })).sort((a, b) => b.streak - a.streak),
    [habits, journal, today],
  );
  const topStreak = streaks[0];

  const monthPrefix = today.slice(0, 7);
  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(monthPrefix)), [transactions, monthPrefix]);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const todayExpense = useMemo(
    () => transactions.filter((t) => t.type === "expense" && t.date === today).reduce((s, t) => s + t.amount, 0),
    [transactions, today],
  );
  const todayTxCount = transactions.filter((t) => t.date === today).length;

  const week = useMemo(() => {
    const days = lastDays(today, 7);
    return days.map((date) => {
      const c = completionForDate(journal, habits, date, today);
      return {
        label: WEEKDAY_SHORT[weekdayIndex(date)],
        value: Math.round(c.ratio * 100),
        hint: `${formatDate(date, { weekday: "long" })} — ${c.done}/${c.total} (${Math.round(c.ratio * 100)}%)`,
        highlight: date === today,
      };
    });
  }, [journal, habits, today]);

  const weekAvg = Math.round(week.reduce((s, d) => s + d.value, 0) / week.length);

  const recentTx = useMemo(() => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6), [transactions]);

  const allDone = todayPlan.length > 0 && doneCount === todayPlan.length;
  const heroDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${today}T12:00:00+07:00`));

  const budgetRows = useMemo(() => summarizeBudgets(monthTx, budgets).sort((a, b) => b.spent - a.spent).slice(0, 3), [monthTx, budgets]);

  const monthSpark = useMemo(() => {
    // cumulative net worth curve across this month's transactions
    const days = lastDays(today, Number(today.slice(8, 10)));
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (!t.date.startsWith(monthPrefix)) continue;
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
    }
    const out: number[] = [];
    let run = 0;
    for (const d of days) {
      run += byDate.get(d) ?? 0;
      out.push(run);
    }
    return out;
  }, [transactions, monthPrefix, today]);

  return (
    <div className="flex flex-col gap-5">
      {/* hero + momen perayaan */}
      <ViewHero
        art={<OsIllustration variant={allDone ? "celebrate" : "overview"} size={76} />}
        eyebrow={`Konsol hari ini · ${heroDate}`}
        title={allDone ? `Semua ${todayPlan.length} kebiasaan selesai — hari sempurna` : `${doneCount}/${todayPlan.length} kebiasaan selesai`}
        sub={`Streak terbaik ${topStreak?.streak ?? 0} hari · ${monthTx.length} transaksi bulan ini`}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Hari ini"
          value={`${doneCount}/${todayPlan.length}`}
          sub={todayPlan.length === 0 ? "Belum ada jadwal" : doneCount === todayPlan.length ? "Semua selesai" : `${todayPlan.length - doneCount} tersisa`}
          tone="accent"
          icon={<ClockIcon size={16} />}
          right={<Ring value={ratio} size={54} thickness={6} centerTop={`${Math.round(ratio * 100)}%`} label={`Progres hari ini ${Math.round(ratio * 100)} persen`} />}
        />
        <StatTile
          label="Streak terbaik"
          value={`${topStreak?.streak ?? 0} hari`}
          sub={topStreak && topStreak.streak > 0 ? topStreak.habit.title : "Mulai centang hari ini"}
          icon={<FlameIcon size={16} />}
        />
        <StatTile
          label={`Saldo ${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(`${monthPrefix}-15T00:00:00`))}`}
          value={formatCompactRupiah(income - expense)}
          sub={`Masuk ${formatCompactRupiah(income)} · Keluar ${formatCompactRupiah(expense)}`}
          tone={income - expense >= 0 ? "accent" : "crimson"}
          icon={<WalletIcon size={16} />}
          right={
            monthSpark.length > 1 ? (
              <span className="hidden sm:block">
                <Sparkline values={monthSpark} label="Tren saldo bulan ini" color={income - expense >= 0 ? "#37d99a" : "#f37272"} />
              </span>
            ) : undefined
          }
        />
        <StatTile
          label="Keluar hari ini"
          value={formatCompactRupiah(todayExpense)}
          sub={`${todayTxCount} transaksi`}
          icon={<BanknoteIcon size={16} />}
        />
      </div>

      {/* agenda + week activity */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="os-card xl:col-span-8" aria-label="Agenda hari ini">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="text-[13.5px] font-semibold text-ink">Agenda hari ini</h2>
            <button type="button" className="os-btn !h-8 !px-3 !text-[12px]" onClick={actions.newHabit}>
              <PlusIcon size={14} />
              Kebiasaan
            </button>
          </div>
          {todayPlan.length === 0 ? (
            <EmptyState
              art={<OsIllustration variant="empty" size={104} />}
              title="Belum ada kebiasaan terjadwal"
              hint="Tambahkan kebiasaan pertama untuk mulai melacak rutinitas harian."
              action={
                <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newHabit}>
                  <PlusIcon size={15} />
                  Tambah kebiasaan
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {todayPlan.map((habit) => {
                const done = habit.completed;
                return (
                  <li key={habit.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#10150f] sm:px-5">
                    <CheckButton done={done} onToggle={() => actions.toggleCheckin(habit)} label={habit.title} />
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                      style={{
                        borderColor: done ? "rgba(55,217,154,.35)" : "#232c25",
                        background: done ? "rgba(55,217,154,.1)" : "#121712",
                        color: done ? "#37d99a" : "#a3aea5",
                      }}
                    >
                      <HabitIco name={habit.icon} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13.5px] font-medium ${done ? "text-faint line-through" : "text-ink"}`}>{habit.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-faint">
                        <span className="num">{habit.time}</span>
                        <span aria-hidden="true">·</span>
                        <span>{habit.category}</span>
                      </p>
                    </div>
                    {(() => {
                      const streak = computeStreak(journal, habit, today);
                      return streak > 0 ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#3a2f1e] bg-[#f2b64c12] px-2.5 py-1 text-[11.5px] font-semibold text-amber" title={`Streak ${streak} hari`}>
                          <FlameIcon size={12} />
                          <span className="num">{streak}</span>
                        </span>
                      ) : null;
                    })()}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-3 xl:col-span-4">
          <section className="os-card p-4 sm:p-5" aria-label="Aktivitas 7 hari">
            <SectionHead
              title="Aktivitas 7 hari"
              right={<span className="num text-[12px] font-semibold text-accent">≈ {weekAvg}%</span>}
            />
            <Bars data={week} label={`Grafik persentase penyelesaian 7 hari terakhir, rata-rata ${weekAvg} persen`} />
          </section>

          <section className="os-card p-4 sm:p-5" aria-label="Ringkasan anggaran">
            <SectionHead
              title="Anggaran"
              right={
                <button type="button" className="text-[12px] font-semibold text-accent hover:underline" onClick={() => actions.goTo("finance")}>
                  Kelola
                </button>
              }
            />
            {budgetRows.length === 0 ? (
              <div className="flex flex-col items-start gap-2.5 rounded-xl border border-dashed border-line px-4 py-4">
                <p className="text-[12.5px] leading-relaxed text-dim">Belum ada anggaran. Atur batas belanja per kategori.</p>
                <button type="button" className="os-btn !h-8 !px-3 !text-[12px]" onClick={actions.newBudget}>
                  <PlusIcon size={13} />
                  Atur anggaran
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {budgetRows.map((row) => (
                  <li key={row.category}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <FinanceCategoryIco category={row.category} size={14} />
                        <span className="truncate text-[12.5px] font-medium text-ink">{row.category}</span>
                      </span>
                      <span className="num shrink-0 text-[11.5px] text-dim">
                        {formatCompactRupiah(row.spent)} / {formatCompactRupiah(row.limit)}
                      </span>
                    </div>
                    <ProgressBar value={row.spent} max={row.limit} label={`Anggaran ${row.category}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* recent transactions */}
      <section className="os-card" aria-label="Transaksi terakhir">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-[13.5px] font-semibold text-ink">Transaksi terakhir</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="os-btn !h-8 !px-3 !text-[12px]" onClick={actions.newTransaction}>
              <PlusIcon size={14} />
              Catat
            </button>
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-dim transition-colors hover:text-ink"
              onClick={() => actions.goTo("finance")}
            >
              Semua
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
        {recentTx.length === 0 ? (
          <EmptyState
            art={<OsIllustration variant="receipt" size={104} />}
            title="Belum ada transaksi"
            hint="Catat pemasukan dan pengeluaran untuk melihat arus kas."
            action={
              <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newTransaction}>
                <PlusIcon size={15} />
                Catat transaksi
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {recentTx.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#10150f] sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#232c25] bg-[#121712] text-dim">
                  <FinanceCategoryIco category={tx.category} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{tx.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-faint">
                    {tx.category} · {formatDate(tx.date, { weekday: "short" })}
                  </p>
                </div>
                <span className={`num shrink-0 text-[13.5px] font-semibold ${tx.type === "income" ? "text-accent" : "text-crimson"}`}>
                  {tx.type === "income" ? "+" : "−"}
                  {formatRupiah(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- reusable check control ---------- */

export function CheckButton({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${done ? "Batalkan" : "Selesai"}: ${label}`}
      onClick={onToggle}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${done ? "os-check-pop" : ""}`}
      style={{
        borderColor: done ? "#17b877" : "#2c362e",
        background: done ? "#17b877" : "transparent",
        color: done ? "#04160d" : "#5d6960",
      }}
    >
      {done ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5.5 12.5 4.2 4.2L18.5 7.5" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
      )}
    </button>
  );
}
