"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Clock3, Heart, LoaderCircle } from "lucide-react";
import type { Habit } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { EmptyState, IconAction, PageIntro } from "@/components/ui/primitives";

type HistoryRecord = { habitId: string; title: string; date: string };
type CheckinRecord = { date: string; mood: number; energy: number; sleepHours: number; notes: string };

function toISODate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function moodLabel(mood: number): string {
  return ["", "Sangat berat", "Kurang baik", "Biasa", "Baik", "Sangat baik"][Math.max(1, Math.min(5, mood))];
}
function moodEmoji(mood: number): string {
  return ["", "😞", "🙁", "😐", "🙂", "😄"][Math.max(1, Math.min(5, mood))];
}

export function CalendarView({ habits }: { habits: Habit[] }) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = today.split("-").map(Number);
    return new Date(year, monthNumber - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHistoryError("");
    void fetch(`/api/history?month=${encodeURIComponent(monthKey)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Riwayat tidak dapat dimuat.");
        return response.json() as Promise<{ records?: HistoryRecord[]; checkins?: CheckinRecord[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setHistory(Array.isArray(data.records) ? data.records : []);
        setCheckins(Array.isArray(data.checkins) ? data.checkins : []);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setCheckins([]);
        setHistoryError("Riwayat kalender tidak dapat dimuat. Periksa koneksi atau status sinkronisasi database.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [monthKey]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array((firstDay + 6) % 7).fill(0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  const selectedIsToday = selectedDate === today;
  const selectedLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${selectedDate}T00:00:00`));

  const currentHistory = loadedMonthKey === monthKey ? history : [];
  const currentCheckins = loadedMonthKey === monthKey ? checkins : [];
  const historyByDate = useMemo(() => {
    const result = new Map<string, HistoryRecord[]>();
    for (const item of currentHistory) result.set(item.date, [...(result.get(item.date) ?? []), item]);
    return result;
  }, [currentHistory]);
  const checkinByDate = useMemo(() => new Map(currentCheckins.map((item) => [item.date, item])), [currentCheckins]);
  const selectedRecords = selectedIsToday ? habits.filter((habit) => habit.completed).map((habit) => ({ habitId: habit.id, title: habit.title, date: selectedDate })) : historyByDate.get(selectedDate) ?? [];
  const selectedCheckin = checkinByDate.get(selectedDate);
  const completedToday = habits.filter((habit) => habit.completed).length;
  const pendingToday = habits.length - completedToday;

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    const currentSelected = new Date(`${selectedDate}T00:00:00`);
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setSelectedDate(toISODate(next.getFullYear(), next.getMonth(), Math.min(currentSelected.getDate(), maxDay)));
  }
  function selectDay(day: number) {
    setSelectedDate(toISODate(month.getFullYear(), month.getMonth(), day));
  }
  function goToToday() {
    const [year, monthNumber] = today.split("-").map(Number);
    setMonth(new Date(year, monthNumber - 1, 1));
    setSelectedDate(today);
  }

  const monthHeading = useMemo(() => monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), [monthLabel]);

  return (
    <>
      <PageIntro eyebrow="RIWAYAT DAN RENCANA" title="Lihat perjalananmu." subtitle="Pilih tanggal untuk meninjau kebiasaan yang tercatat dan check-in harian." />
      <div className="calendar-layout">
        <section className="card card-pad calendar-panel">
          <div className="calendar-head">
            <div><div className="calendar-month">{monthHeading}</div><p className="section-caption">Tanggal bertanda titik memiliki riwayat habit atau check-in</p></div>
            <div className="calendar-actions">
              <button type="button" className="calendar-today-button" onClick={goToToday}>Hari ini</button>
              <IconAction label="Bulan sebelumnya" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></IconAction>
              <IconAction label="Bulan berikutnya" onClick={() => moveMonth(1)}><ChevronRight size={16} /></IconAction>
            </div>
          </div>
          <div className="calendar-grid" role="group" aria-label={`Kalender ${monthHeading}`}>
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {cells.map((day, index) => {
              if (day === 0) return <div key={`blank-${index}`} aria-hidden="true" />;
              const iso = toISODate(month.getFullYear(), month.getMonth(), day);
              const hasHistory = (historyByDate.get(iso)?.length ?? 0) > 0 || checkinByDate.has(iso);
              return <button
                key={day}
                type="button"
                className={`calendar-day ${selectedDate === iso ? "selected" : ""} ${today === iso ? "today" : ""} ${hasHistory ? "has-history" : ""}`}
                aria-pressed={selectedDate === iso}
                aria-label={`${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(month.getFullYear(), month.getMonth(), day))}${hasHistory ? ", ada riwayat" : ""}`}
                onClick={() => selectDay(day)}
              >
                {day}{hasHistory && <span className="calendar-history-dot" aria-hidden="true" />}
              </button>;
            })}
          </div>
          <div className="calendar-legend"><span className="calendar-legend-dot today-dot" /> Hari ini <span className="calendar-legend-outline" /> Tanggal dipilih <span className="calendar-history-dot" /> Ada riwayat</div>
          {loading && <div className="calendar-loading"><LoaderCircle size={14} className="spin" /> Memuat riwayat bulan ini…</div>}
        </section>

        <aside className="calendar-summary">
          <div className="calendar-summary-top"><span className="small-label">RINGKASAN TANGGAL</span><CalendarDays size={17} /></div>
          <div className="calendar-summary-date">{selectedLabel}</div>
          {historyError ? <div className="calendar-history-note"><strong>Riwayat belum tersedia</strong><p>{historyError}</p></div> : (
            <>
              {selectedIsToday && <div className="calendar-summary-stats"><div><strong>{completedToday}</strong><span>Selesai</span></div><div><strong>{pendingToday}</strong><span>Tersisa</span></div></div>}
              {!selectedIsToday && <div className="calendar-summary-stats"><div><strong>{selectedRecords.length}</strong><span>Habit selesai</span></div><div><strong>{selectedCheckin ? "Ada" : "—"}</strong><span>Check-in</span></div></div>}
              {selectedRecords.length > 0 ? <div className="calendar-day-habits">
                {selectedRecords.map((record) => {
                  const habit = habits.find((item) => item.id === record.habitId);
                  return <div className="calendar-habit-line" key={record.habitId}>
                    <span className="calendar-habit-check done"><CircleCheck size={14} /></span>
                    <span><strong>{record.title}</strong><small><Clock3 size={11} /> {habit?.time ?? "Selesai"}</small></span>
                  </div>;
                })}
              </div> : <EmptyState title={selectedIsToday ? "Belum ada habit selesai" : "Belum ada catatan habit"} description={selectedIsToday ? "Habit yang selesai hari ini akan muncul di sini." : "Tidak ada penyelesaian habit yang tercatat pada tanggal ini."} />}
              {selectedCheckin && <div className="calendar-checkin-card"><div className="calendar-checkin-title"><Heart size={14} /> Daily check-in</div><div className="calendar-checkin-mood"><strong>{moodEmoji(selectedCheckin.mood)} {moodLabel(selectedCheckin.mood)}</strong><span>Energi {selectedCheckin.energy}/5 · Tidur {selectedCheckin.sleepHours} jam</span></div>{selectedCheckin.notes && <p>{selectedCheckin.notes}</p>}</div>}
              {!selectedIsToday && !selectedRecords.length && !selectedCheckin && !loading && <div className="calendar-history-note"><span className="calendar-history-icon"><Clock3 size={18} /></span><strong>Belum ada aktivitas tercatat</strong><p>Tanggal ini belum memiliki penyelesaian habit atau daily check-in tersimpan.</p></div>}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
