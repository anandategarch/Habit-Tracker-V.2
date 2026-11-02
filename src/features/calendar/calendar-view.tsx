"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Clock3 } from "lucide-react";
import type { Habit } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { EmptyState, IconAction, PageIntro, SectionHeading } from "@/components/ui/primitives";

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarView({ habits }: { habits: Habit[] }) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array((firstDay + 6) % 7).fill(0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  const selectedIsToday = selectedDate === today;
  const selectedLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${selectedDate}T00:00:00`));
  const selectedHabits = selectedIsToday ? habits : [];
  const completed = selectedHabits.filter((habit) => habit.completed).length;
  const pending = selectedHabits.length - completed;

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    const currentSelected = new Date(`${selectedDate}T00:00:00`);
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    const day = Math.min(currentSelected.getDate(), maxDay);
    setSelectedDate(toISODate(next.getFullYear(), next.getMonth(), day));
  }

  function selectDay(day: number) {
    setSelectedDate(toISODate(month.getFullYear(), month.getMonth(), day));
  }

  function goToToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  }

  const monthHeading = useMemo(() => monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), [monthLabel]);

  return (
    <>
      <PageIntro eyebrow="RIWAYAT DAN RENCANA" title="Lihat perjalananmu." subtitle="Pilih tanggal untuk melihat informasi yang tersedia." />
      <div className="calendar-layout">
        <section className="card card-pad calendar-panel">
          <div className="calendar-head">
            <div><div className="calendar-month">{monthHeading}</div><p className="section-caption">Pilih tanggal untuk melihat ringkasannya</p></div>
            <div className="calendar-actions">
              <button type="button" className="calendar-today-button" onClick={goToToday}>Hari ini</button>
              <IconAction label="Bulan sebelumnya" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></IconAction>
              <IconAction label="Bulan berikutnya" onClick={() => moveMonth(1)}><ChevronRight size={16} /></IconAction>
            </div>
          </div>
          <div className="calendar-grid" role="group" aria-label={`Kalender ${monthHeading}`}>
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {cells.map((day, index) => day === 0
              ? <div key={`blank-${index}`} aria-hidden="true" />
              : <button
                  key={day}
                  type="button"
                  className={`calendar-day ${selectedDate === toISODate(month.getFullYear(), month.getMonth(), day) ? "selected" : ""} ${today === toISODate(month.getFullYear(), month.getMonth(), day) ? "today" : ""}`}
                  aria-pressed={selectedDate === toISODate(month.getFullYear(), month.getMonth(), day)}
                  aria-label={new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(month.getFullYear(), month.getMonth(), day))}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>)}
          </div>
          <div className="calendar-legend"><span className="calendar-legend-dot today-dot" /> Hari ini <span className="calendar-legend-outline" /> Tanggal dipilih</div>
        </section>

        <aside className="calendar-summary">
          <div className="calendar-summary-top"><span className="small-label">RINGKASAN TANGGAL</span><CalendarDays size={17} /></div>
          <div className="calendar-summary-date">{selectedLabel}</div>
          {selectedIsToday ? (
            <>
              <div className="calendar-summary-stats">
                <div><strong>{completed}</strong><span>Selesai</span></div>
                <div><strong>{pending}</strong><span>Tersisa</span></div>
              </div>
              {habits.length > 0 ? (
                <div className="calendar-day-habits">
                  {habits.slice().sort((a, b) => a.time.localeCompare(b.time)).map((habit) => (
                    <div className="calendar-habit-line" key={habit.id}>
                      <span className={`calendar-habit-check ${habit.completed ? "done" : ""}`}>{habit.completed && <CircleCheck size={14} />}</span>
                      <span><strong>{habit.title}</strong><small><Clock3 size={11} /> {habit.time}</small></span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Belum ada jadwal" description="Tambahkan kebiasaan untuk mulai mengisi harimu." />}
            </>
          ) : (
            <div className="calendar-history-note">
              <span className="calendar-history-icon"><Clock3 size={18} /></span>
              <strong>Riwayat tanggal belum tersedia</strong>
              <p>Ringkasan saat ini hanya memiliki status kebiasaan untuk hari ini. Data tanggal lain belum ditampilkan agar tidak memberikan informasi yang keliru.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
