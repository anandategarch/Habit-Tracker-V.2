"use client";

import { useMemo, useState } from "react";
import type { Habit, HabitCategory } from "@/lib/types";
import type { OsActions, OsData } from "@/features/os/view-props";
import { scheduleLabel } from "@/lib/habit-schedule";
import { computeStreak, isDoneOn, lastDays, weekdayIndex } from "@/features/os/use-history";
import { ConfirmDialog, EmptyState, HeatStrip, ViewHero } from "@/features/os/widgets";
import { OsIllustration } from "@/features/os/os-illustrations";
import { CheckButton } from "@/features/os/views/overview-view";
import { FlameIcon, HabitCategoryIco, HabitIco, PencilIcon, PlusIcon, TrashIcon, ClockIcon } from "@/features/os/os-icons";

const CATEGORY_FILTERS: Array<{ id: "all" | HabitCategory; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "Mindfulness", label: "Mindfulness" },
  { id: "Health", label: "Health" },
  { id: "Learning", label: "Learning" },
  { id: "Personal", label: "Personal" },
];

const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function HabitsView({ data, actions }: { data: OsData; actions: OsActions }) {
  const { habits, journal, today } = data;
  const [filter, setFilter] = useState<"all" | HabitCategory>("all");
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? habits : habits.filter((h) => h.category === filter)),
    [habits, filter],
  );

  const heatDays = useMemo(() => lastDays(today, 14), [today]);

  const doneToday = habits.filter((h) => h.completed).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(journal, h, today)), 0);

  function handleDelete() {
    if (!pendingDelete) return;
    actions.updateHabits((current) => current.filter((h) => h.id !== pendingDelete.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* hero: ringkasan + ilustrasi */}
      <ViewHero
        art={<OsIllustration variant="habits" size={76} />}
        eyebrow="Kebiasaan"
        title={`${habits.length} kebiasaan · ${doneToday} selesai hari ini`}
        sub={`Streak terbaik ${bestStreak} hari · ${visible.length} tampil`}
      />

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter kategori">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="os-chip"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
            >
              {c.id !== "all" && <HabitCategoryIco category={c.id} size={13} />}
              {c.label}
              <span className="num text-[10.5px] text-faint">
                {c.id === "all" ? habits.length : habits.filter((h) => h.category === c.id).length}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newHabit}>
          <PlusIcon size={15} />
          Kebiasaan baru
        </button>
      </div>

      {/* list */}
      {visible.length === 0 ? (
        <div className="os-card">
          <EmptyState
            art={<OsIllustration variant={habits.length === 0 ? "empty" : "search"} size={104} />}
            title={habits.length === 0 ? "Belum ada kebiasaan" : "Tidak ada di kategori ini"}
            hint={habits.length === 0 ? "Buat kebiasaan pertama dan mulai bangun rutinitas." : "Pilih filter lain atau tambah kebiasaan baru."}
            action={
              <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newHabit}>
                <PlusIcon size={15} />
                Tambah kebiasaan
              </button>
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((habit) => (
            <HabitRow key={habit.id} habit={habit} heatDays={heatDays} data={data} actions={actions} onDelete={setPendingDelete} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Hapus kebiasaan?"
        description={`"${pendingDelete?.title ?? ""}" akan dihapus permanen beserta riwayat streak-nya.`}
        confirmLabel="Ya, hapus"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function HabitRow({
  habit,
  heatDays,
  data,
  actions,
  onDelete,
}: {
  habit: Habit;
  heatDays: string[];
  data: OsData;
  actions: OsActions;
  onDelete: (habit: Habit) => void;
}) {
  const { journal, today } = data;
  const streak = computeStreak(journal, habit, today);
  const scheduledToday =
    !habit.schedule || habit.schedule.kind === "daily"
      ? true
      : habit.schedule.kind === "weekly"
        ? habit.schedule.days.includes(weekdayIndex(today))
        : habit.schedule.dates.includes(Number(today.slice(8, 10)));

  const cells = heatDays.map((date) => {
    const done = isDoneOn(journal, habit, date, today);
    const isScheduled =
      !habit.schedule || habit.schedule.kind === "daily"
        ? true
        : habit.schedule.kind === "weekly"
          ? habit.schedule.days.includes(weekdayIndex(date))
          : habit.schedule.dates.includes(Number(date.slice(8, 10)));
    const state = done ? "done" : isScheduled ? "miss" : "off";
    return {
      date,
      state: state as "done" | "miss" | "off",
      title: `${WEEKDAY_SHORT[weekdayIndex(date)]}, ${date.slice(8, 10)} — ${done ? "selesai" : isScheduled ? "terlewat" : "tidak terjadwal"}`,
    };
  });

  return (
    <li className="os-card os-card-hover p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex flex-col items-center gap-2 pt-0.5">
          {scheduledToday ? (
            <CheckButton done={habit.completed} onToggle={() => actions.toggleCheckin(habit)} label={habit.title} />
          ) : (
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-line text-faint"
              title="Tidak terjadwal hari ini"
            >
              <ClockIcon size={16} />
            </span>
          )}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber" title={`Streak ${streak} hari`}>
              <FlameIcon size={11} />
              <span className="num">{streak}</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-[#232c25] bg-[#121712] text-dim">
                <HabitIco name={habit.icon} size={19} />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-[14.5px] font-semibold ${habit.completed ? "text-faint line-through" : "text-ink"}`}>{habit.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                  <span className="flex items-center gap-1">
                    <HabitCategoryIco category={habit.category} size={12} />
                    {habit.category}
                  </span>
                  <span className="num">{habit.time}</span>
                  <span className="num">{habit.duration}m</span>
                  <span>{scheduleLabel(habit.schedule)}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-faint transition-colors hover:border-line hover:text-ink"
                aria-label={`Ubah ${habit.title}`}
                title="Ubah"
                onClick={() => actions.editHabit(habit)}
              >
                <PencilIcon size={15} />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-faint transition-colors hover:border-[#4a2a2a] hover:text-crimson"
                aria-label={`Hapus ${habit.title}`}
                title="Hapus"
                onClick={() => onDelete(habit)}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-3">
            <HeatStrip cells={cells} label={`Riwayat 14 hari ${habit.title}`} />
            <span className="num ml-auto shrink-0 text-[11px] text-faint">
              {cells.filter((c) => c.state === "done").length}/14
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
