"use client";

import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, ListChecks, ListFilter, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import type { Habit } from "@/lib/types";
import type { HabitGroup } from "@/lib/module-types";
import { summarizeHabits } from "@/lib/habits";
import { isScheduledOn } from "@/lib/habit-schedule";
import { todayISO } from "@/lib/format";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";

type CompletionFilter = "all" | "pending" | "completed";
const categoryOptions: Array<"Semua" | Habit["category"]> = ["Semua", "Health", "Learning", "Mindfulness", "Personal"];

export function HabitsView({ habits, onToggle, onAdd, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, onReorder, vacationMode = false, onToggleVacation, groups = [], onCreateGroup, onDeleteGroup }: { habits: Habit[]; onToggle: (id: string) => void; onAdd: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; onReorder?: (items: Habit[]) => void; vacationMode?: boolean; onToggleVacation?: () => void; groups?: HabitGroup[]; onCreateGroup?: (name: string, color: string) => void; onDeleteGroup?: (id: string) => void }) {
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryOptions)[number]>("Semua");
  const [query, setQuery] = useState("");
  const [dragHint, setDragHint] = useState<{ id: string; from: number; to: number; height: number } | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupColor, setGroupColor] = useState("#6b9d82");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [timeAnalysis, setTimeAnalysis] = useState<{ habit: { id: string; title: string }; periodDays: number; summary: { totalMinutes: number; activeDays: number; averageMinutes: number }; byDay: Array<{ date: string; minutes: number }> } | null>(null);
  const [timeAnalysisLoading, setTimeAnalysisLoading] = useState(false);
  const [timeAnalysisError, setTimeAnalysisError] = useState("");
  const [timeAnalysisRequest, setTimeAnalysisRequest] = useState<{ habitId: string; days: number } | null>(null);
  const timeAnalysisRequestId = useRef(0);
  const [timeAnalysisDays, setTimeAnalysisDays] = useState(30);
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
  async function loadTimeAnalysis(habitId: string, days = timeAnalysisDays) {
    const requestId = ++timeAnalysisRequestId.current;
    setTimeAnalysisRequest({ habitId, days });
    setTimeAnalysisLoading(true);
    setTimeAnalysisError("");
    setTimeAnalysis(null);
    // Timeout 10 detik + abort (pola use-modules/use-workspace): permintaan
    // yang menggantung di jaringan lambat tidak boleh menyandera skeleton
    // selamanya tanpa tombol batal yang bisa dicapai (audit v0.4.1).
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`/api/habits/${encodeURIComponent(habitId)}/time-analysis?days=${days}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat analisis waktu.");
      if (requestId === timeAnalysisRequestId.current) setTimeAnalysis(payload);
    } catch (error) {
      if (requestId === timeAnalysisRequestId.current) {
        const aborted = error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
        setTimeAnalysisError(aborted
          ? "Permintaan terlalu lama — periksa koneksi lalu coba lagi."
          : error instanceof Error ? error.message : "Gagal memuat analisis waktu.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === timeAnalysisRequestId.current) setTimeAnalysisLoading(false);
    }
  }

  function cancelTimeAnalysis() {
    // Batalkan permintaan berjalan: invalidasi id-nya agar respons terlambat diabaikan.
    timeAnalysisRequestId.current += 1;
    setTimeAnalysisLoading(false);
    setTimeAnalysisError("");
    setTimeAnalysisRequest(null);
  }
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
    if (!commit || !onReorder || state.to === state.from) return;
    // Susun ulang daftar-tampak, lalu petakan kembali ke array habit penuh:
    // urutan baru menempati "slot" posisi item-tampak (ascending) — habit
    // yang tersembunyi oleh filter tetap menempel di posisinya.
    const order = [...visibleIds];
    order.splice(state.from, 1);
    order.splice(state.to, 0, state.id);
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const visibleSlots = visibleIds
      .map((rowId) => habits.findIndex((habit) => habit.id === rowId))
      .sort((a, b) => a - b);
    if (visibleSlots.some((slot) => slot < 0) || visibleSlots.length !== order.length) return;
    const next = [...habits];
    order.forEach((rowId, index) => { next[visibleSlots[index]] = byId.get(rowId)!; });
    onReorder(next);
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
        eyebrow="KEBIASAAN HARIAN"
        title="Bangun ritmemu."
        subtitle="Konsistensi kecil lebih berarti daripada target yang terlalu besar."
        action={<div className="habits-intro-actions"><button type="button" className={`secondary-button vacation-toggle ${vacationMode ? "active" : ""}`} onClick={onToggleVacation}>{vacationMode ? "Akhiri mode libur" : "Mode libur"}</button><PrimaryButton onClick={onAdd}><Plus size={15} /> Habit baru</PrimaryButton></div>}
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
            <div className="small-label">PROGRESS HARI INI</div>
            <div className="habit-progress-value">{progress}<span>%</span></div>
            <p>{completed} dari {total} kebiasaan telah selesai.</p>
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
          <p>Pertahankan ritme yang sudah kamu bangun.</p>
        </section>
      </div>

      <section className="card card-pad habit-groups-manager">
        <button type="button" className="group-manager-heading" aria-expanded={groupsOpen} onClick={() => setGroupsOpen((value) => !value)}><span><strong>Grup kebiasaan</strong><small>{groups.length} grup tersimpan · kelompokkan rutinitas berdasarkan konteks</small></span><span>{groupsOpen ? "Tutup" : "Kelola"}</span></button>
        {groupsOpen && <div className="group-manager-body"><form className="group-create-form" onSubmit={(event) => { event.preventDefault(); const name = groupNameInput.trim(); if (!name || !onCreateGroup || groups.some((item) => item.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) return; onCreateGroup(name, groupColor); setGroupNameInput(""); }}><input className="form-control" value={groupNameInput} onChange={(event) => setGroupNameInput(event.target.value)} placeholder="Nama grup baru, misalnya Rutinitas Pagi" maxLength={40} aria-label="Nama grup baru" /><input className="group-color-input" type="color" value={groupColor} onChange={(event) => setGroupColor(event.target.value)} aria-label="Warna grup baru" /><button className="secondary-button module-small-button" type="submit" disabled={!groupNameInput.trim()}>Tambah grup</button></form>{groups.length > 0 && <div className="group-manager-list">{groups.map((group) => <div className="group-manager-item" key={group.id}><span className="group-color-dot" style={{ backgroundColor: group.color }} /><strong>{group.name}</strong><small>{habits.filter((habit) => habit.groupName === group.name).length} habit</small><button type="button" onClick={() => { if (window.confirm(`Hapus grup "${group.name}"? Kebiasaan di dalamnya tetap ada tanpa grup.`)) onDeleteGroup?.(group.id); }} aria-label={`Hapus grup ${group.name}`}>Hapus</button></div>)}</div>}</div>}
      </section>

      <section className="card card-pad habits-panel">
        <SectionHeading title="Semua kebiasaan" caption={`${scheduledHabits.length} kebiasaan ${showAllSchedules ? "ditampilkan" : "terjadwal hari ini"} · ${completed} selesai`} />
        <div className="habit-toolbar">
          <div className="schedule-view-toggle" role="group" aria-label="Tampilan jadwal"><button type="button" className={!showAllSchedules ? "active" : ""} aria-pressed={!showAllSchedules} onClick={() => setShowAllSchedules(false)}>Terjadwal hari ini</button><button type="button" className={showAllSchedules ? "active" : ""} aria-pressed={showAllSchedules} onClick={() => setShowAllSchedules(true)}>Semua jadwal</button></div>
          <label className="habit-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kebiasaan…" aria-label="Cari kebiasaan" />
          </label>
          <select className="group-filter-select" aria-label="Filter grup habit" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">Semua grup</option>{groups.map((group) => <option value={group.name} key={group.id}>{group.name}</option>)}</select>
          <div className="completion-filters" role="group" aria-label="Filter status kebiasaan">
            <button type="button" className={completionFilter === "all" ? "active" : ""} onClick={() => setCompletionFilter("all")}>Semua</button>
            <button type="button" className={completionFilter === "pending" ? "active" : ""} onClick={() => setCompletionFilter("pending")}>Belum selesai</button>
            <button type="button" className={completionFilter === "completed" ? "active" : ""} onClick={() => setCompletionFilter("completed")}>Selesai</button>
          </div>
        </div>
        <div className="category-filters" role="group" aria-label="Filter kategori">
          <ListFilter size={14} />
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              className={categoryFilter === category ? "active" : ""}
              aria-pressed={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {timeAnalysis && <section className="time-analysis-card"><div className="time-analysis-head"><div><strong>Analisis waktu · {timeAnalysis.habit.title}</strong><small>{timeAnalysis.summary.totalMinutes} menit · {timeAnalysis.summary.activeDays} hari aktif · rata-rata {timeAnalysis.summary.averageMinutes} menit/hari aktif</small></div><button type="button" onClick={() => setTimeAnalysis(null)} aria-label="Tutup analisis waktu">×</button></div><select className="group-filter-select" value={timeAnalysisDays} onChange={(event) => { const days = Number(event.target.value); setTimeAnalysisDays(days); void loadTimeAnalysis(timeAnalysis.habit.id, days); }} aria-label="Rentang analisis waktu"><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option></select><div className="time-analysis-chart">{timeAnalysis.byDay.map((day) => { const max = Math.max(1, ...timeAnalysis.byDay.map((item) => item.minutes)); return <div className="time-analysis-column" key={day.date} title={`${day.date}: ${day.minutes} menit`}><strong>{day.minutes ? `${day.minutes}m` : "—"}</strong><div><span style={{ height: `${day.minutes ? Math.max(4, day.minutes / max * 100) : 0}%` }} /></div><small>{day.date.slice(8, 10)}</small></div>; })}</div></section>}
        {timeAnalysisLoading && <div className="time-analysis-loading" role="status" aria-live="polite" aria-busy="true"><span className="skeleton-shimmer time-analysis-skeleton-heading" /><div className="time-analysis-skeleton-bars" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span className="skeleton-shimmer" key={index} />)}</div><span className="time-analysis-loading-label">Memuat analisis waktu…</span><button type="button" className="secondary-button time-analysis-cancel" onClick={cancelTimeAnalysis}>Batal</button></div>}
        {timeAnalysisError && <div className="time-analysis-error backup-message is-error" role="alert"><span>{timeAnalysisError}</span><button type="button" className="insight-retry-button" disabled={timeAnalysisLoading || !timeAnalysisRequest} onClick={() => { if (timeAnalysisRequest) void loadTimeAnalysis(timeAnalysisRequest.habitId, timeAnalysisRequest.days); }}><RefreshCw size={13} /> Coba lagi</button></div>}
        <div className="habit-list">
          {filteredHabits.map((habit) => (
            <div
              key={habit.id}
              ref={(element) => { if (element) rowRefs.current.set(habit.id, element); else rowRefs.current.delete(habit.id); }}
              className={`habit-draggable${dragHint?.id === habit.id ? " is-pointer-dragging" : ""}`}
              style={siblingShiftStyle(habit.id)}
            >
              <HabitRow
                habit={habit}
                onToggle={onToggle}
                onAdjust={onAdjust}
                onTimerToggle={onTimerToggle}
                onViewTimeAnalysis={loadTimeAnalysis}
                timerActive={activeTimerId === habit.id}
                timerElapsedSeconds={activeTimerId === habit.id ? timerElapsedSeconds : 0}
                paused={vacationMode}
                dragHandle={onReorder ? (
                  <button
                    type="button"
                    className="habit-drag-handle"
                    aria-label={`Ubah urutan ${habit.title}`}
                    onPointerDown={(event) => beginHabitDrag(event, habit.id)}
                    onPointerMove={moveHabitDrag}
                    onPointerUp={(event) => endHabitDrag(event, true)}
                    onPointerCancel={(event) => endHabitDrag(event, false)}
                  >
                    <GripVertical size={16} />
                  </button>
                ) : undefined}
              />
            </div>
          ))}
        </div>
        {filteredHabits.length === 0 && (
          <EmptyState
            icon={query ? Search : ListChecks}
            title={total === 0 ? "Belum ada kebiasaan" : "Tidak ada kebiasaan yang cocok"}
            description={total === 0 ? "Mulai dari hal sederhana yang bisa kamu ulangi setiap hari." : "Ubah kata kunci atau filter untuk melihat kebiasaan lainnya."}
            action={total === 0 ? <PrimaryButton onClick={onAdd}><Plus size={14} /> Tambah kebiasaan</PrimaryButton> : undefined}
          />
        )}
      </section>
    </div>
  );
}
