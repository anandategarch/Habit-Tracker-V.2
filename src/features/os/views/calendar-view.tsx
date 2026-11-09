"use client";

import { useMemo, useState } from "react";
import type { OsActions, OsData } from "@/features/os/view-props";
import { formatDate, formatRupiah } from "@/lib/format";
import { completionForDate, isDoneOn, shiftDate, weekdayIndex } from "@/features/os/use-history";
import { Ring, SectionHead, ViewHero } from "@/features/os/widgets";
import { OsIllustration } from "@/features/os/os-illustrations";
import { CheckButton } from "@/features/os/views/overview-view";
import {
  CalendarIcon, ChevronLeftIcon, ChevronRightIcon, FinanceCategoryIco, HabitIco, InboxIcon,
} from "@/features/os/os-icons";
import type { Habit } from "@/lib/types";

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/* Monday-first order */
const DAY_HEAD = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarView({ data, actions }: { data: OsData; actions: OsActions }) {
  const { habits, transactions, journal, today } = data;
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);

  const [year, monthNum] = month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;
  const firstOfMonth = `${month}-01`;

  /* grid: Monday-first offset */
  const gridStart = useMemo(() => {
    const dow = weekdayIndex(firstOfMonth); // 0=Sun
    return shiftDate(firstOfMonth, -(dow === 0 ? 6 : dow - 1));
  }, [firstOfMonth]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 42; i++) out.push(shiftDate(gridStart, i));
    return out;
  }, [gridStart]);

  /* completion per day */
  const dayStats = useMemo(() => {
    const map = new Map<string, { done: number; total: number; ratio: number }>();
    for (const day of days) {
      const c = completionForDate(journal, habits, day, today);
      map.set(day, c);
    }
    return map;
  }, [days, journal, habits, today]);

  const selectedStats = dayStats.get(selected) ?? { done: 0, total: 0, ratio: 0 };
  const selectedHabits = useMemo(
    () =>
      habits
        .filter((h) => {
          if (!h.schedule || h.schedule.kind === "daily") return true;
          if (h.schedule.kind === "weekly") return h.schedule.days.includes(weekdayIndex(selected));
          return h.schedule.dates.includes(Number(selected.slice(8, 10)));
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    [habits, selected],
  );
  const selectedTx = useMemo(
    () => transactions.filter((t) => t.date === selected).sort((a, b) => a.type.localeCompare(b.type)),
    [transactions, selected],
  );

  const monthCheckins = useMemo(() => {
    let total = 0;
    for (const [day, stat] of dayStats) {
      if (day.startsWith(month)) total += stat?.done ?? 0;
    }
    return total;
  }, [dayStats, month]);

  const isCurrentMonth = month === today.slice(0, 7);

  function cellStyle(day: string) {
    const stat = dayStats.get(day);
    const inMonth = day.startsWith(month);
    if (!inMonth) return { opacity: 0.22, bg: "transparent", border: "1px solid transparent" };
    const isSelected = day === selected;
    const isToday = day === today;
    const ratio = stat?.ratio ?? 0;
    const bg =
      ratio >= 1
        ? "rgba(55,217,154,.22)"
        : ratio >= 0.66
          ? "rgba(55,217,154,.14)"
          : ratio >= 0.33
            ? "rgba(55,217,154,.08)"
            : ratio > 0
              ? "rgba(55,217,154,.04)"
              : "#10140f";
    return {
      opacity: 1,
      bg,
      border: isSelected ? "1px solid #37d99a" : isToday ? "1px solid #2c362e" : "1px solid #1c241e",
    };
  }

  return (
    <div className="flex flex-col gap-5">
      {/* hero: ilustrasi + fakta bulan */}
      <ViewHero
        art={<OsIllustration variant="calendar" size={76} />}
        eyebrow={`Kalender · ${monthLabel}`}
        title={`${monthCheckins} check-in bulan ini`}
        sub={`${formatDate(selected, { weekday: "long", day: "numeric", month: "short" })} — ${selectedStats.done}/${selectedStats.total} selesai`}
      />

      {/* month nav */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className="os-btn !h-9 !w-9 !px-0" aria-label="Bulan sebelumnya" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeftIcon size={15} />
          </button>
          <span className="num min-w-[130px] text-center text-[14.5px] font-semibold text-ink">{monthLabel}</span>
          <button
            type="button"
            className="os-btn !h-9 !w-9 !px-0"
            aria-label="Bulan berikutnya"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRightIcon size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="num hidden text-[12px] text-dim sm:block">{monthCheckins} check-in bulan ini</span>
          {!isCurrentMonth && (
            <button
              type="button"
              className="os-btn !h-9 !px-3 !text-[12px]"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelected(today);
              }}
            >
              Hari ini
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        {/* grid */}
        <section className="os-card p-4 sm:p-5 xl:col-span-8" aria-label={`Kalender ${monthLabel}`}>
          <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
            {DAY_HEAD.map((d) => (
              <span key={d} className="os-micro !text-[9.5px] text-center">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label="Pilih tanggal">
            {days.map((day) => {
              const style = cellStyle(day);
              const stat = dayStats.get(day);
              const isSelected = day === selected;
              const isToday = day === today;
              const inMonth = day.startsWith(month);
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${formatDate(day, { weekday: "long", year: "numeric" })}${stat && stat.total > 0 ? ` — ${stat.done}/${stat.total} selesai` : ""}`}
                  onClick={() => setSelected(day)}
                  className="relative flex aspect-square min-h-[38px] flex-col items-center justify-center rounded-[10px] transition-all hover:brightness-125 sm:min-h-[48px]"
                  style={{ background: style.bg, border: style.border, opacity: style.opacity }}
                >
                  <span className={`num text-[12.5px] sm:text-[13.5px] ${isToday ? "font-bold text-accent" : inMonth ? "font-medium text-ink" : "text-faint"}`}>
                    {Number(day.slice(8, 10))}
                  </span>
                  {stat && stat.total > 0 && (
                    <span className="num mt-0.5 text-[9px] text-faint sm:text-[10px]">
                      {stat.done}/{stat.total}
                    </span>
                  )}
                  {isToday && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {/* legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="os-micro !text-[9.5px]">Intensitas</span>
            {[0, 0.33, 0.66, 1].map((r) => (
              <span key={r} className="flex items-center gap-1.5 text-[11px] text-faint">
                <span
                  className="h-3 w-3 rounded-[4px]"
                  style={{
                    background: r === 0 ? "#10140f" : `rgba(55,217,154,${0.04 + r * 0.18})`,
                    border: "1px solid #1f2721",
                  }}
                  aria-hidden="true"
                />
                {r === 0 ? "0" : r === 1 ? "100%" : `${r * 100}%`}
              </span>
            ))}
          </div>
        </section>

        {/* day detail */}
        <section className="os-card flex flex-col xl:col-span-4" aria-label="Detail hari terpilih">
          <div className="border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{formatDate(selected, { weekday: "long", year: "numeric" })}</p>
                <p className="mt-0.5 text-[11.5px] text-dim">
                  {selected === today ? "Hari ini" : selected > today ? "Akan datang" : "Riwayat"}
                </p>
              </div>
              <Ring
                value={selectedStats.ratio}
                size={52}
                thickness={6}
                centerTop={`${Math.round(selectedStats.ratio * 100)}%`}
                label={`Progres ${selectedStats.done} dari ${selectedStats.total}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 sm:px-5">
              <SectionHead title="Kebiasaan" />
              {selectedHabits.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3.5 py-4 text-[12.5px] text-dim">
                  <InboxIcon size={15} />
                  Tidak ada jadwal hari ini.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {selectedHabits.map((habit: Habit) => {
                    const done = isDoneOn(journal, habit, selected, today);
                    const isToday = selected === today;
                    return (
                      <li key={habit.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                        {isToday ? (
                          <CheckButton done={habit.completed} onToggle={() => actions.toggleCheckin(habit)} label={habit.title} />
                        ) : (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                            style={{
                              borderColor: done ? "#17b877" : "#262f28",
                              background: done ? "rgba(55,217,154,.12)" : "transparent",
                              color: done ? "#37d99a" : "#5d6960",
                            }}
                            aria-hidden="true"
                          >
                            {done ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m5.5 12.5 4.2 4.2L18.5 7.5" />
                              </svg>
                            ) : (
                              <HabitIco name={habit.icon} size={14} />
                            )}
                          </span>
                        )}
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${done ? "text-faint line-through" : "text-ink"}`}>{habit.title}</span>
                        <span className="num shrink-0 text-[11px] text-faint">{habit.time}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-line px-4 py-4 sm:px-5">
              <SectionHead
                title="Transaksi"
                right={
                  selectedTx.length > 0 ? (
                    (() => {
                      const net = selectedTx.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
                      return (
                        <span className={`num text-[12px] font-semibold ${net >= 0 ? "text-accent" : "text-crimson"}`}>
                          {net >= 0 ? "+" : "−"}
                          {formatRupiah(Math.abs(net))}
                        </span>
                      );
                    })()
                  ) : undefined
                }
              />
              {selectedTx.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-3.5 py-4 text-[12.5px] text-dim">
                  <CalendarIcon size={15} />
                  Tidak ada transaksi.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {selectedTx.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-2.5 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#232c25] bg-[#121712] text-dim">
                        <FinanceCategoryIco category={tx.category} size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{tx.title}</span>
                      <span className={`num shrink-0 text-[12.5px] font-semibold ${tx.type === "income" ? "text-accent" : "text-crimson"}`}>
                        {tx.type === "income" ? "+" : "−"}
                        {formatRupiah(tx.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
