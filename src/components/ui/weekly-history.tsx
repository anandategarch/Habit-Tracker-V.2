"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity, Camera, CheckCircle2, ClipboardList, Droplets,
  HeartPulse, Sprout, Target, Wallet, Dumbbell, RefreshCw, StickyNote,
} from "lucide-react";
import type { Habit, Transaction } from "@/lib/types";
import type { WorkspaceModules } from "@/lib/module-types";
import { formatCompactRupiah, todayISO } from "@/lib/format";
import { isScheduledOn } from "@/lib/habit-schedule";

export type HabitHistoryRecord = { habitId: string; title: string; date: string };
export type HabitDailyProgressRecord = {
  habitId: string;
  title: string;
  date: string;
  currentAmount: number;
  timeSpentMinutes: number;
};

export type WeeklyActivityKind =
  | "habit" | "finance" | "checkin" | "goal" | "task"
  | "note" | "routine" | "wellness" | "training" | "photo";

export type WeeklyActivityEvent = {
  id: string;
  date: string;
  kind: WeeklyActivityKind;
  title: string;
  detail: string;
};

export type WorkspaceHistoryValue = {
  dates: string[];
  events: WeeklyActivityEvent[];
  habitRecords: HabitHistoryRecord[];
  habitProgress: HabitDailyProgressRecord[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

type HistorySnapshot = {
  key: string;
  retryVersion: number;
  records: HabitHistoryRecord[];
  progress: HabitDailyProgressRecord[];
  loading: boolean;
  error: boolean;
};

const WorkspaceHistoryContext = createContext<WorkspaceHistoryValue | null>(null);

export function WorkspaceHistoryProvider({ value, children }: {
  value: WorkspaceHistoryValue;
  children: ReactNode;
}) {
  return <WorkspaceHistoryContext.Provider value={value}>{children}</WorkspaceHistoryContext.Provider>;
}

export function useWorkspaceHistory() {
  return useContext(WorkspaceHistoryContext);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateFromTimestamp(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return fields.year && fields.month && fields.day
    ? `${fields.year}-${fields.month}-${fields.day}`
    : null;
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    ...options,
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function makeLastSevenDates(today: string) {
  const anchor = new Date(`${today}T12:00:00+07:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function useWorkspaceActivityHistory(
  habits: Habit[],
  transactions: Transaction[],
  modules: WorkspaceModules,
): WorkspaceHistoryValue {
  const today = todayISO();
  const dates = useMemo(() => makeLastSevenDates(today), [today]);
  const monthKeys = useMemo(
    () => [...new Set(dates.map((date) => date.slice(0, 7)))],
    [dates],
  );
  const requestKey = monthKeys.join("|");
  const [retryVersion, setRetryVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<HistorySnapshot>({
    key: "",
    retryVersion: -1,
    records: [],
    progress: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    void Promise.all(monthKeys.map(async (month) => {
      const response = await fetch(`/api/history?month=${encodeURIComponent(month)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Habit history unavailable");
      const payload = await response.json() as { records?: unknown; progress?: unknown };
      const records = Array.isArray(payload.records)
        ? payload.records.filter((item): item is HabitHistoryRecord =>
            isRecord(item) &&
            typeof item.habitId === "string" &&
            typeof item.title === "string" &&
            typeof item.date === "string")
        : [];
      const progress = Array.isArray(payload.progress)
        ? payload.progress.filter((item): item is HabitDailyProgressRecord =>
            isRecord(item) &&
            typeof item.habitId === "string" &&
            typeof item.title === "string" &&
            typeof item.date === "string" &&
            typeof item.currentAmount === "number" &&
            typeof item.timeSpentMinutes === "number")
        : [];
      return { records, progress };
    }))
      .then((results) => {
        if (cancelled) return;
        setSnapshot({
          key: requestKey,
          retryVersion,
          records: results.flatMap((item) => item.records),
          progress: results.flatMap((item) => item.progress),
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSnapshot({
          key: requestKey,
          retryVersion,
          records: [],
          progress: [],
          loading: false,
          error: true,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestKey, monthKeys, retryVersion]);

  const habitRecords = snapshot.key === requestKey ? snapshot.records : [];
  const habitProgress = snapshot.key === requestKey ? snapshot.progress : [];
  const loading = snapshot.key !== requestKey || snapshot.retryVersion !== retryVersion || snapshot.loading;
  const error = snapshot.key === requestKey && snapshot.retryVersion === retryVersion && snapshot.error;

  const events = useMemo(() => {
    const dateSet = new Set(dates);
    const next: WeeklyActivityEvent[] = [];
    const completedKeys = new Set(habitRecords.map((item) => `${item.habitId}|${item.date}`));
    const progressByKey = new Map(habitProgress.map((item) => [`${item.habitId}|${item.date}`, item]));
    const habitById = new Map(habits.map((item) => [item.id, item]));

    habitRecords.forEach((record) => {
      if (!dateSet.has(record.date)) return;
      const habit = habitById.get(record.habitId);
      const progress = progressByKey.get(`${record.habitId}|${record.date}`);
      const detail = progress && habit?.kind === "amount"
        ? `Target tercatat · ${progress.currentAmount.toLocaleString("id-ID")} ${habit.unit || "unit"}`
        : habit?.kind === "avoid"
          ? "Hari bersih tercatat"
          : "Kebiasaan ditandai selesai";
      next.push({
        id: `habit-${record.habitId}-${record.date}`,
        date: record.date,
        kind: "habit",
        title: record.title,
        detail,
      });
    });

    habitProgress.forEach((progress) => {
      if (!dateSet.has(progress.date) || (progress.currentAmount <= 0 && progress.timeSpentMinutes <= 0)) return;
      const key = `${progress.habitId}|${progress.date}`;
      if (completedKeys.has(key)) return;
      const habit = habitById.get(progress.habitId);
      if (!habit) return;
      if (habit.kind === "amount" && progress.currentAmount > 0) {
        next.push({
          id: `habit-progress-${key}`,
          date: progress.date,
          kind: "habit",
          title: habit.title,
          detail: `Progres ${progress.currentAmount.toLocaleString("id-ID")} / ${(habit.targetAmount ?? 1).toLocaleString("id-ID")} ${habit.unit || "unit"}`,
        });
      } else if ((habit.kind === "normal" || habit.kind === undefined) && progress.timeSpentMinutes > 0) {
        next.push({
          id: `habit-time-${key}`,
          date: progress.date,
          kind: "habit",
          title: habit.title,
          detail: `Waktu tercatat · ${progress.timeSpentMinutes} menit`,
        });
      }
    });

    // Status hari ini dapat berubah sebelum riwayat server selesai tersinkron.
    habits.forEach((habit) => {
      const key = `${habit.id}|${today}`;
      if (habit.completed && !completedKeys.has(key)) {
        next.push({
          id: `habit-live-${habit.id}-${today}`,
          date: today,
          kind: "habit",
          title: habit.title,
          detail: habit.kind === "avoid" ? "Hari bersih hari ini" : "Selesai hari ini",
        });
      } else if (habit.kind === "amount" && (habit.currentAmount ?? 0) > 0 && !progressByKey.has(key)) {
        const target = Math.max(1, habit.targetAmount ?? 1);
        next.push({
          id: `habit-live-progress-${habit.id}-${today}`,
          date: today,
          kind: "habit",
          title: habit.title,
          detail: `Progres ${(habit.currentAmount ?? 0).toLocaleString("id-ID")} / ${target.toLocaleString("id-ID")} ${habit.unit || "unit"}`,
        });
      }
    });

    transactions.forEach((transaction) => {
      if (!dateSet.has(transaction.date)) return;
      const income = transaction.type === "income";
      next.push({
        id: `finance-${transaction.id}`,
        date: transaction.date,
        kind: "finance",
        title: transaction.title,
        detail: `${income ? "Pemasukan" : "Pengeluaran"} · ${formatCompactRupiah(transaction.amount)}`,
      });
    });

    modules.checkins.forEach((item) => {
      if (!dateSet.has(item.date)) return;
      next.push({
        id: `checkin-${item.date}`,
        date: item.date,
        kind: "checkin",
        title: "Check-in harian",
        detail: `Mood ${item.mood}/5 · Energi ${item.energy}/5 · Tidur ${item.sleepHours} jam`,
      });
    });

    modules.goals.forEach((item) => {
      const date = dateFromTimestamp(item.createdAt);
      if (!date || !dateSet.has(date)) return;
      next.push({
        id: `goal-${item.id}`,
        date,
        kind: "goal",
        title: item.title,
        detail: "Tujuan dibuat",
      });
    });

    modules.tasks.forEach((item) => {
      const date = dateFromTimestamp(item.createdAt);
      if (!date || !dateSet.has(date)) return;
      next.push({
        id: `task-${item.id}`,
        date,
        kind: "task",
        title: item.title,
        detail: "Tugas dibuat",
      });
    });

    modules.notes.forEach((item) => {
      const date = dateFromTimestamp(item.updatedAt);
      if (!date || !dateSet.has(date)) return;
      next.push({
        id: `note-${item.id}`,
        date,
        kind: "note",
        title: item.title,
        detail: "Catatan diperbarui",
      });
    });

    modules.routines.forEach((item) => {
      const date = dateFromTimestamp(item.lastDone);
      if (!date || !dateSet.has(date)) return;
      next.push({
        id: `routine-${item.id}-${date}`,
        date,
        kind: "routine",
        title: item.title,
        detail: "Rutinitas dicatat selesai",
      });
    });

    modules.wellness.forEach((item) => {
      if (!dateSet.has(item.date)) return;
      if (!(item.waterMl > 0 || item.proteinGrams > 0 || item.weightKg !== null || item.note.trim())) return;
      const details = [
        item.waterMl > 0 ? `Air ${item.waterMl.toLocaleString("id-ID")} ml` : "",
        item.proteinGrams > 0 ? `Protein ${item.proteinGrams} g` : "",
        item.weightKg !== null ? `Berat ${item.weightKg} kg` : "",
      ].filter(Boolean);
      next.push({
        id: `wellness-${item.date}`,
        date: item.date,
        kind: "wellness",
        title: "Catatan wellness",
        detail: details.join(" · ") || item.note,
      });
    });

    modules.workouts.forEach((item) => {
      if (!dateSet.has(item.date)) return;
      next.push({
        id: `training-${item.id}`,
        date: item.date,
        kind: "training",
        title: item.title,
        detail: `${item.durationMinutes + item.cardioMinutes} menit · ${item.exercises.length} gerakan`,
      });
    });

    modules.progressPhotos.forEach((item) => {
      if (!dateSet.has(item.date)) return;
      next.push({
        id: `photo-${item.id}`,
        date: item.date,
        kind: "photo",
        title: item.label || "Foto progres",
        detail: "Dokumentasi progres ditambahkan",
      });
    });

    return next.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "id"));
  }, [dates, habitRecords, habitProgress, habits, transactions, modules, today]);

  return {
    dates,
    events,
    habitRecords,
    habitProgress,
    loading,
    error,
    retry: () => setRetryVersion((value) => value + 1),
  };
}

const kindLabels: Record<WeeklyActivityKind, string> = {
  habit: "Kebiasaan",
  finance: "Keuangan",
  checkin: "Check-in",
  goal: "Tujuan",
  task: "Tugas",
  note: "Catatan",
  routine: "Rutinitas",
  wellness: "Wellness",
  training: "Latihan",
  photo: "Foto progres",
};

const kindColors: Record<WeeklyActivityKind, string> = {
  habit: "#3f7958",
  finance: "#c28a42",
  checkin: "#a46c98",
  goal: "#82975f",
  task: "#5b8990",
  note: "#bf896d",
  routine: "#8a9e6e",
  wellness: "#5c9b91",
  training: "#bc8754",
  photo: "#8d82b4",
};

function ActivityGlyph({ kind }: { kind: WeeklyActivityKind }) {
  const common = { size: 15, strokeWidth: 1.9 };
  if (kind === "habit") return <CheckCircle2 {...common} />;
  if (kind === "finance") return <Wallet {...common} />;
  if (kind === "checkin") return <HeartPulse {...common} />;
  if (kind === "goal") return <Target {...common} />;
  if (kind === "task") return <ClipboardList {...common} />;
  if (kind === "note") return <StickyNote {...common} />;
  if (kind === "routine") return <Sprout {...common} />;
  if (kind === "wellness") return <Droplets {...common} />;
  if (kind === "training") return <Dumbbell {...common} />;
  if (kind === "photo") return <Camera {...common} />;
  return <Activity {...common} />;
}

function formatWeekday(date: string, width: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: width,
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

export function WeeklyHistoryPanel({ value }: { value: WorkspaceHistoryValue }) {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const today = todayISO();
  const activeDate = value.dates.includes(selectedDate)
    ? selectedDate
    : value.dates[value.dates.length - 1] ?? today;
  const selectedEvents = value.events.filter((item) => item.date === activeDate);

  return (
    <section className="weekly-history-panel card card-pad" aria-label="Riwayat aktivitas tujuh hari">
      <div className="weekly-history-heading">
        <div>
          <span className="small-label">AKTIVITAS WORKSPACE</span>
          <h2>Jejak 7 hari terakhir</h2>
          <p>Pilih tanggal untuk melihat catatan dari seluruh ruang Rutina.</p>
        </div>
        <div className="weekly-history-total" aria-label={`${value.events.length} aktivitas tercatat`}>
          <strong>{value.events.length}</strong>
          <span>catatan</span>
        </div>
      </div>

      <div className="weekly-history-days" role="group" aria-label="Pilih tanggal riwayat">
        {value.dates.map((date) => {
          const dayEvents = value.events.filter((item) => item.date === date);
          const kinds = [...new Set(dayEvents.map((item) => item.kind))];
          return (
            <button
              type="button"
              key={date}
              className={`weekly-history-day${activeDate === date ? " is-selected" : ""}${date === today ? " is-today" : ""}`}
              aria-pressed={selectedDate === date}
              aria-label={`${formatWeekday(date, "long")}, ${dateLabel(date)}: ${dayEvents.length} catatan`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="weekly-history-weekday">{formatWeekday(date)}</span>
              <strong>{date.slice(8, 10)}</strong>
              <span className="weekly-history-markers" aria-hidden="true">
                {kinds.slice(0, 4).map((kind) => (
                  <i key={kind} style={{ backgroundColor: kindColors[kind] }} />
                ))}
                {kinds.length === 0 && <i className="is-empty" />}
                {kinds.length > 4 && <small>+{kinds.length - 4}</small>}
              </span>
              <small className="weekly-history-count">{dayEvents.length}</small>
            </button>
          );
        })}
      </div>

      <div className="weekly-history-legend" aria-label="Legenda kategori aktivitas">
        {(Object.keys(kindLabels) as WeeklyActivityKind[]).map((kind) => (
          <span key={kind}><i style={{ backgroundColor: kindColors[kind] }} />{kindLabels[kind]}</span>
        ))}
      </div>

      <div className="weekly-history-detail">
        <div className="weekly-history-detail-heading">
          <div>
            <strong>{formatWeekday(activeDate, "long")}, {dateLabel(activeDate)}</strong>
            <span>{selectedEvents.length} aktivitas tercatat</span>
          </div>
          {activeDate === today && <span className="weekly-history-today-label">Hari ini</span>}
        </div>

        {selectedEvents.length > 0 ? (
          <div className="weekly-history-event-list">
            {selectedEvents.map((item) => (
              <article className="weekly-history-event" key={item.id} style={{ "--weekly-event-color": kindColors[item.kind] } as CSSProperties}>
                <span className="weekly-history-event-icon"><ActivityGlyph kind={item.kind} /></span>
                <span className="weekly-history-event-copy">
                  <strong>{item.title}</strong>
                  <small>{kindLabels[item.kind]} · {item.detail}</small>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="weekly-history-empty">
            <Sprout size={18} />
            <span>Belum ada catatan aktivitas pada tanggal ini.</span>
          </div>
        )}
      </div>

      {value.loading && <p className="weekly-history-status" role="status">Memuat riwayat kebiasaan…</p>}
      {value.error && (
        <div className="weekly-history-error" role="status">
          <span>Riwayat habit dari server belum tersedia. Aktivitas modul lain tetap ditampilkan.</span>
          <button type="button" onClick={value.retry}><RefreshCw size={13} /> Coba lagi</button>
        </div>
      )}
    </section>
  );
}

export function WeeklyHistorySlot() {
  const value = useWorkspaceHistory();
  return value ? <WeeklyHistoryPanel value={value} /> : null;
}

function habitDayStatus(
  habit: Habit,
  date: string,
  value: WorkspaceHistoryValue,
): { status: "done" | "partial" | "empty" | "off"; text: string; amount?: number; percent?: number } {
  if (!isScheduledOn(habit.schedule, date)) {
    return { status: "off", text: "Tidak dijadwalkan" };
  }
  if (date !== todayISO() && value.error) return { status: "empty", text: "Riwayat tidak tersedia" };
  if (date !== todayISO() && value.loading) return { status: "empty", text: "Memuat riwayat" };
  if (habit.kind === "amount") {
    const historical = value.habitProgress.find((item) => item.habitId === habit.id && item.date === date);
    const amount = date === todayISO() ? (habit.currentAmount ?? historical?.currentAmount ?? 0) : (historical?.currentAmount ?? 0);
    const target = Math.max(1, habit.targetAmount ?? 1);
    const percent = Math.min(100, Math.round(amount / target * 100));
    if (date === todayISO() && habit.completed || amount >= target) {
      return { status: "done", text: `Target tercapai · ${amount.toLocaleString("id-ID")} / ${target.toLocaleString("id-ID")} ${habit.unit || "unit"}`, amount, percent: Math.max(percent, 100) };
    }
    if (amount > 0) {
      return { status: "partial", text: `Progres ${amount.toLocaleString("id-ID")} / ${target.toLocaleString("id-ID")} ${habit.unit || "unit"} · ${percent}%`, amount, percent };
    }
    return { status: "empty", text: "Belum ada progres yang tercatat" };
  }

  const recorded = value.habitRecords.some((item) => item.habitId === habit.id && item.date === date);
  const done = recorded || (date === todayISO() && habit.completed);
  if (done) return { status: "done", text: habit.kind === "avoid" ? "Hari bersih tercatat" : "Kebiasaan selesai" };
  const timed = value.habitProgress.find((item) => item.habitId === habit.id && item.date === date);
  if ((habit.kind === "normal" || habit.kind === undefined) && timed && timed.timeSpentMinutes > 0) {
    return { status: "partial", text: `Waktu tercatat · ${timed.timeSpentMinutes} menit, belum ditandai selesai` };
  }
  return { status: "empty", text: "Belum ada penyelesaian yang tercatat" };
}

export function HabitWeekHistory({ habit }: { habit: Habit }) {
  const value = useWorkspaceHistory();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!value) return null;
  const selected = selectedDate ? habitDayStatus(habit, selectedDate, value) : null;

  return (
    <div className="habit-week-history">
      <div className="habit-week-history-heading">
        <span>RIWAYAT 7 HARI</span>
        <small>{value.loading ? "Memuat…" : "Pilih hari untuk detail"}</small>
      </div>
      <div className="habit-week-history-days" role="group" aria-label={`Riwayat tujuh hari ${habit.title}`}>
        {value.dates.map((date) => {
          const day = habitDayStatus(habit, date, value);
          return (
            <button
              key={date}
              type="button"
              className={`habit-week-history-day is-${day.status}${selectedDate === date ? " is-selected" : ""}`}
              aria-pressed={selectedDate === date}
              aria-label={`${formatWeekday(date, "long")}, ${dateLabel(date)}: ${day.text}`}
              title={day.text}
              onClick={() => setSelectedDate((current) => current === date ? null : date)}
            >
              <span>{formatWeekday(date)}</span>
              <i aria-hidden="true">{day.status === "done" ? "✓" : day.status === "partial" ? "◔" : day.status === "off" ? "–" : ""}</i>
            </button>
          );
        })}
      </div>
      {selected && selectedDate && (
        <div className="habit-week-history-selected" aria-live="polite">
          <strong>{formatWeekday(selectedDate, "long")}, {dateLabel(selectedDate)}</strong>
          <span>{selected.text}</span>
        </div>
      )}
      {value.error && <small className="habit-week-history-note">Riwayat habit belum tersambung ke server.</small>}
    </div>
  );
}
