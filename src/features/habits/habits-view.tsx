"use client";

import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BookOpen, CalendarCheck, CalendarDays, Circle, CircleCheck, GripVertical, HeartPulse, ListChecks, ListFilter, PersonStanding, Plus, Search, Settings2, Sparkles, Umbrella, User, X } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { HabitGroup } from "@/lib/module-types";
import { summarizeHabits } from "@/lib/habits";
import { progressSentence, streakStory } from "@/lib/storytelling";
import { RichText } from "@/components/ui/rich-text";
import { isScheduledOn } from "@/lib/habit-schedule";
import { todayISO } from "@/lib/format";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";
import { ThemedSelect } from "@/components/ui/themed-select";
import { HabitWeekHistory } from "@/components/ui/weekly-history";

type CompletionFilter = "all" | "pending" | "completed";
const categoryOptions: Array<"Semua" | Habit["category"]> = ["Semua", "Health", "Learning", "Mindfulness", "Personal"];
const categoryIcons: Record<(typeof categoryOptions)[number], typeof Sparkles> = {
  Semua: Sparkles,
  Health: HeartPulse,
  Learning: BookOpen,
  Mindfulness: PersonStanding,
  Personal: User,
};

// v0.18: prop onDelete (kebiasaan) & onDeleteGroup (grup) dihapus — semua aksi
// hapus dipindahkan ke Pengaturan → Kelola & hapus data (data-manager-view),
// agar daftar tab tetap bersih dan tidak memenuhi UI.
export function HabitsView({ habits, onToggle, onAdd, onAdjust, onReorder, vacationMode = false, onToggleVacation, groups = [], onCreateGroup }: { habits: Habit[]; onToggle: (id: string) => void; onAdd: () => void; onAdjust?: (id: string, delta: number) => void; onReorder?: (items: Habit[]) => void; vacationMode?: boolean; onToggleVacation?: () => void; groups?: HabitGroup[]; onCreateGroup?: (name: string, color: string) => void }) {
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryOptions)[number]>("Semua");
  const [query, setQuery] = useState("");
  const [dragHint, setDragHint] = useState<{ id: string; from: number; to: number; height: number } | null>(null);
  // ── Reorder keyboard (WCAG 2.5.7/2.1.1, audit a11y v0.20): pegangan seret kini
  // bisa dioperasikan tanpa pointer — Enter mulai, panah geser, Enter lagi
  // letakkan, Esc batal. Pengumuman pergerakan lewat live region sopan. ──
  const [keyboardDragId, setKeyboardDragId] = useState<string | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupColor, setGroupColor] = useState("#6b9d82");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const today = todayISO();
  const todayParts = today.split("-").map(Number);
  const todayUtc = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
  const weekStartUtc = new Date(todayUtc);
  weekStartUtc.setUTCDate(todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartUtc);
    date.setUTCDate(weekStartUtc.getUTCDate() + index);
    const iso = date.toISOString().slice(0, 10);
    return {
      iso,
      day: new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso + "T12:00:00+07:00")),
      number: date.getUTCDate(),
    };
  });
  const scheduledHabits = showAllSchedules ? habits : habits.filter((habit) => isScheduledOn(habit.schedule, today));
  const { completed, total, progress, longestStreak } = summarizeHabits(scheduledHabits);

  const filteredHabits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return [...scheduledHabits]
      .filter((habit) => completionFilter === "all" || (completionFilter === "pending" ? !habit.completed : habit.completed))
      .filter((habit) => categoryFilter === "Semua" || habit.category === categoryFilter)
      .filter((habit) => groupFilter === "all" || habit.groupName === groupFilter)
      .filter((habit) => !normalizedQuery || `${habit.title} ${habit.category} ${habit.groupName ?? ""}`.toLocaleLowerCase("id-ID").includes(normalizedQuery));
  }, [scheduledHabits, completionFilter, categoryFilter, groupFilter, query]);

  // ── Ubah urutan habit: seret lewat pegangan (grip) — berbasis Pointer
  // Events agar bekerja di SENTUH (telepon) maupun mouse. HTML5 drag-and-drop
  // lama tidak pernah menyala di iOS/Android (audit v0.4.1). ──
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const dragState = useRef<{ id: string; pointerId: number; startY: number; from: number; to: number; rowHeight: number; lastY: number; raf: number } | null>(null);
  const visibleIds = useMemo(() => filteredHabits.map((habit) => habit.id), [filteredHabits]);

  function updateDragTarget(state: NonNullable<typeof dragState.current>) {
    // Indeks penyisipan (0..n-1) pada daftar-tampak TANPA baris terseret:
    // hitung baris lain yang titik tengahnya di atas jari/kursor.
    let to = 0;
    for (const [rowId, row] of rowRefs.current) {
      if (rowId === state.id) continue;
      const rect = row.getBoundingClientRect();
      if (state.lastY > rect.top + rect.height / 2) to += 1;
    }
    const clamped = Math.max(0, Math.min(visibleIds.length - 1, to));
    if (clamped !== state.to) {
      state.to = clamped;
      setDragHint({ id: state.id, from: state.from, to: clamped, height: state.rowHeight });
    }
  }

  /** Terapkan urutan baru: dipakai bersama oleh drag pointer & keyboard. */
  function commitReorder(id: string, from: number, to: number) {
    if (!onReorder || to === from) return;
    const order = [...visibleIds];
    order.splice(from, 1);
    order.splice(to, 0, id);
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const visibleSlots = visibleIds
      .map((rowId) => habits.findIndex((habit) => habit.id === rowId))
      .sort((a, b) => a - b);
    if (visibleSlots.some((slot) => slot < 0) || visibleSlots.length !== order.length) return;
    const next = [...habits];
    order.forEach((rowId, index) => { next[visibleSlots[index]] = byId.get(rowId)!; });
    onReorder(next);
  }

  /** Interaksi keyboard pada pegangan seret — alternatif non-pointer (2.5.7). */
  function handleDragHandleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, habit: Habit) {
    if (!onReorder) return;
    const from = visibleIds.indexOf(habit.id);
    if (from < 0) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const starting = keyboardDragId !== habit.id;
      setKeyboardDragId(starting ? habit.id : null);
      setMoveAnnouncement(starting ? `Mulai memindahkan ${habit.title}. Gunakan panah atas atau bawah untuk menggeser.` : `${habit.title} diletakkan.`);
      return;
    }
    if (keyboardDragId !== habit.id) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const to = event.key === "ArrowUp" ? from - 1 : from + 1;
      if (to < 0 || to >= visibleIds.length) {
        setMoveAnnouncement(event.key === "ArrowUp" ? "Sudah di posisi paling atas." : "Sudah di posisi paling bawah.");
        return;
      }
      commitReorder(habit.id, from, to);
      setMoveAnnouncement(`${habit.title} dipindah ke posisi ${to + 1} dari ${visibleIds.length}.`);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setKeyboardDragId(null);
      // Pergeseran sudah diterapkan langsung (live commit) — Esc hanya
      // menutup mode; kata "batal" akan menyesatkan pengguna SR.
      setMoveAnnouncement("Mode pemindahan ditutup.");
    }
  }

  function beginHabitDrag(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (!onReorder || event.button !== 0) return;
    const from = visibleIds.indexOf(id);
    if (from < 0) return;
    const row = rowRefs.current.get(id);
    const rowHeight = row?.getBoundingClientRect().height ?? 64;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer sudah dilepas */ }
    dragState.current = { id, pointerId: event.pointerId, startY: event.clientY, from, to: from, rowHeight, lastY: event.clientY, raf: 0 };
    setDragHint({ id, from, to: from, height: rowHeight });
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
  }

  function moveHabitDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    state.lastY = event.clientY;
    const row = rowRefs.current.get(state.id);
    if (row) row.style.transform = `translateY(${Math.round(event.clientY - state.startY)}px)`;
    // Gulir otomatis saat menyeret mendekati tepi layar (daftar panjang).
    const edge = 76;
    const nearEdge = event.clientY < edge || event.clientY > window.innerHeight - edge;
    if (nearEdge && !state.raf) {
      const step = () => {
        const active = dragState.current;
        if (!active || !active.raf) return;
        window.scrollBy(0, active.lastY < edge ? -7 : 7);
        updateDragTarget(active);
        active.raf = window.requestAnimationFrame(step);
      };
      state.raf = window.requestAnimationFrame(step);
    } else if (!nearEdge && state.raf) {
      window.cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
    updateDragTarget(state);
  }

  function endHabitDrag(event: ReactPointerEvent<HTMLButtonElement>, commit: boolean) {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.raf) window.cancelAnimationFrame(state.raf);
    // Posisi lepas jari bisa melompat dari pointermove terakhir — perbarui
    // target sebelum memutuskan commit agar urutan mengikuti titik lepas.
    state.lastY = event.clientY;
    updateDragTarget(state);
    dragState.current = null;
    const row = rowRefs.current.get(state.id);
    if (row) row.style.transform = "";
    setDragHint(null);
    if (!commit) return;
    commitReorder(state.id, state.from, state.to);
  }

  function siblingShiftStyle(id: string): CSSProperties | undefined {
    // Baris lain "membuat ruang": geser sejauh tinggi baris terseret.
    if (!dragHint || dragHint.id === id) return undefined;
    const j = visibleIds.indexOf(id);
    if (j < 0) return undefined;
    const i = j < dragHint.from ? j : j - 1;
    if (dragHint.from <= i && i < dragHint.to) return { transform: `translateY(-${dragHint.height}px)` };
    if (dragHint.to <= i && i < dragHint.from) return { transform: `translateY(${dragHint.height}px)` };
    return undefined;
  }

  return (
    <div className="habit-page">
      <PageIntro
        icon="habits"
        title="Kebiasaan"
        action={<div className="habits-intro-actions"><button type="button" className={`secondary-button vacation-toggle ${vacationMode ? "active" : ""}`} onClick={onToggleVacation}><Umbrella size={13} aria-hidden="true" /> {vacationMode ? "Akhiri mode libur" : "Mode libur"}</button><PrimaryButton onClick={onAdd}><Plus size={15} /> Habit baru</PrimaryButton></div>}
      />

      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Pencatatan habit, progres amount, dan waktu sedang dijeda. Data sebelumnya tetap tersimpan.</div>}
      <div className="habit-week-strip" aria-label="Kalender minggu ini">
        <div className="habit-week-strip-heading"><span>MINGGU INI</span><strong>{new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(today + "T12:00:00+07:00"))}</strong></div>
        <div className="habit-week-days">
          {weekDays.map((day) => <div className={"habit-week-day" + (day.iso === today ? " is-today" : "")} key={day.iso}>
            <small>{day.day}</small><strong>{day.number}</strong><span />
          </div>)}
        </div>
      </div>

      <div className="habit-overview-grid">
        <section className="card habit-progress-card">
          <div className="habit-progress-copy">
            <div className="small-label">PROGRES HARI INI</div>
            <div className="habit-progress-value">{progress}<span>%</span></div>
            <p><RichText text={progressSentence(completed, total)} /></p>
          </div>
          <div className="habit-progress-ring" style={{ "--progress": `${progress}%` } as CSSProperties}>
            <strong>{completed}<small>/{total}</small></strong>
            <span>SELESAI</span>
          </div>
        </section>
        <section className="card habit-streak-summary">
          <span className="streak-summary-icon"><Sparkles size={18} /></span>
          <div className="small-label">REKOR KONSISTENSI</div>
          <div className="streak-number">{longestStreak}<span> hari</span></div>
          <p><RichText text={streakStory(longestStreak)} /></p>
        </section>
      </div>

      <section className="card card-pad habit-groups-manager">
        <button type="button" className="group-manager-heading" aria-expanded={groupsOpen} onClick={() => setGroupsOpen((value) => !value)}><span><strong>Grup kebiasaan</strong><small>{groups.length} grup tersimpan · kelompokkan rutinitas berdasarkan konteks</small></span><span>{groupsOpen ? <><X size={13} aria-hidden="true" /> Tutup</> : <><Settings2 size={13} aria-hidden="true" /> Kelola</>}</span></button>
        {groupsOpen && <div className="group-manager-body"><form className="group-create-form" onSubmit={(event) => { event.preventDefault(); const name = groupNameInput.trim(); if (!name || !onCreateGroup || groups.some((item) => item.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) return; onCreateGroup(name, groupColor); setGroupNameInput(""); }}><input className="form-control" value={groupNameInput} onChange={(event) => setGroupNameInput(event.target.value)} placeholder="Nama grup baru, misalnya Rutinitas Pagi" maxLength={40} aria-label="Nama grup baru" /><input className="group-color-input" type="color" title="Pilih warna grup" value={groupColor} onChange={(event) => setGroupColor(event.target.value)} aria-label="Warna grup baru" /><button className="secondary-button module-small-button" type="submit" disabled={!groupNameInput.trim()}><Plus size={13} aria-hidden="true" /> Tambah grup</button></form>{groups.length > 0 && <div className="group-manager-list">{groups.map((group) => <div className="group-manager-item" key={group.id}><span className="group-color-dot" style={{ backgroundColor: group.color }} /><strong>{group.name}</strong><small>{habits.filter((habit) => habit.groupName === group.name).length} habit</small></div>)}</div>}</div>}
      </section>

      <section className="card card-pad habits-panel">
        <SectionHeading title="Semua kebiasaan" caption={`${scheduledHabits.length} kebiasaan ${showAllSchedules ? "ditampilkan" : "terjadwal hari ini"} · ${completed} selesai`} />
        <div className="habit-toolbar">
          <div className="schedule-view-toggle" role="group" aria-label="Tampilan jadwal"><button type="button" className={!showAllSchedules ? "active" : ""} aria-pressed={!showAllSchedules} onClick={() => setShowAllSchedules(false)}><CalendarCheck size={13} aria-hidden="true" /> Terjadwal hari ini</button><button type="button" className={showAllSchedules ? "active" : ""} aria-pressed={showAllSchedules} onClick={() => setShowAllSchedules(true)}><CalendarDays size={13} aria-hidden="true" /> Semua jadwal</button></div>
          <label className="habit-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" enterKeyHint="search" autoComplete="off" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kebiasaan…" aria-label="Cari kebiasaan" />
          </label>
          <ThemedSelect className="group-filter-select" ariaLabel="Filter grup habit" value={groupFilter} onChange={setGroupFilter}><option value="all">Semua grup</option>{groups.map((group) => <option value={group.name} key={group.id}>{group.name}</option>)}</ThemedSelect>
          <div className="completion-filters" role="group" aria-label="Filter status kebiasaan">
            <button type="button" className={completionFilter === "all" ? "active" : ""} onClick={() => setCompletionFilter("all")}><ListChecks size={13} aria-hidden="true" /> Semua</button>
            <button type="button" className={completionFilter === "pending" ? "active" : ""} onClick={() => setCompletionFilter("pending")}><Circle size={13} aria-hidden="true" /> Belum selesai</button>
            <button type="button" className={completionFilter === "completed" ? "active" : ""} onClick={() => setCompletionFilter("completed")}><CircleCheck size={13} aria-hidden="true" /> Selesai</button>
          </div>
        </div>
        <div className="category-filters" role="group" aria-label="Filter kategori">
          <ListFilter size={14} />
          {categoryOptions.map((category) => {
            const CategoryIcon = categoryIcons[category];
            return (
              <button
                key={category}
                type="button"
                className={categoryFilter === category ? "active" : ""}
                aria-pressed={categoryFilter === category}
                onClick={() => setCategoryFilter(category)}
              >
                <CategoryIcon size={13} aria-hidden="true" />
                {category}
              </button>
            );
          })}
        </div>
        <span id="habit-drag-guide" className="sr-only">Tekan Enter pada pegangan urutan untuk mulai memindahkan kebiasaan, panah atas atau bawah untuk menggeser, Enter lagi untuk meletakkan, Escape untuk membatalkan.</span>
        <span className="sr-only" role="status" aria-live="polite">{moveAnnouncement}</span>
        <div className="habit-list">
          {filteredHabits.map((habit) => (
            <div
              key={habit.id}
              ref={(element) => { if (element) rowRefs.current.set(habit.id, element); else rowRefs.current.delete(habit.id); }}
              className={`habit-draggable${dragHint?.id === habit.id ? " is-pointer-dragging" : ""}${keyboardDragId === habit.id ? " is-keyboard-dragging" : ""}`}
              style={siblingShiftStyle(habit.id)}
            >
              <HabitRow
                habit={habit}
                variant="card"
                onToggle={onToggle}
                onAdjust={onAdjust}
                paused={vacationMode}
                dragHandle={onReorder ? (
                  <button
                    type="button"
                    className="habit-drag-handle"
                    aria-label={`Ubah urutan ${habit.title}`}
                    aria-pressed={keyboardDragId === habit.id}
                    aria-describedby="habit-drag-guide"
                    onKeyDown={(event) => handleDragHandleKeyDown(event, habit)}
                    onPointerDown={(event) => beginHabitDrag(event, habit.id)}
                    onPointerMove={moveHabitDrag}
                    onPointerUp={(event) => endHabitDrag(event, true)}
                    onPointerCancel={(event) => endHabitDrag(event, false)}
                  >
                    <GripVertical size={16} />
                  </button>
                ) : undefined}
              />
              <HabitWeekHistory habit={habit} />
            </div>
          ))}
        </div>
        {filteredHabits.length === 0 && (
          <EmptyState
            icon={query ? Search : ListChecks}
            title={total === 0 ? "Belum ada kebiasaan" : "Tidak ada kebiasaan yang cocok"}
            description={total === 0 ? "Tambahkan kebiasaan pertama untuk mulai mencatat progres." : "Ubah kata kunci atau filter untuk melihat kebiasaan lainnya."}
            action={total === 0 ? <PrimaryButton onClick={onAdd}><Plus size={14} /> Tambah kebiasaan</PrimaryButton> : undefined}
          />
        )}
      </section>
    </div>
  );
}
