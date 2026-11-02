"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ListChecks, ListFilter, Plus, Search, Sparkles } from "lucide-react";
import type { Habit } from "@/lib/types";
import { summarizeHabits } from "@/lib/habits";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";

type CompletionFilter = "all" | "pending" | "completed";
const categoryOptions: Array<"Semua" | Habit["category"]> = ["Semua", "Health", "Learning", "Mindfulness", "Personal"];

export function HabitsView({ habits, onToggle, onAdd, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, onReorder, vacationMode = false, onToggleVacation }: { habits: Habit[]; onToggle: (id: string) => void; onAdd: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; onReorder?: (items: Habit[]) => void; vacationMode?: boolean; onToggleVacation?: () => void }) {
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categoryOptions)[number]>("Semua");
  const [query, setQuery] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { completed, total, progress, longestStreak } = summarizeHabits(habits);

  const filteredHabits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return [...habits]
      .filter((habit) => completionFilter === "all" || (completionFilter === "pending" ? !habit.completed : habit.completed))
      .filter((habit) => categoryFilter === "Semua" || habit.category === categoryFilter)
      .filter((habit) => !normalizedQuery || `${habit.title} ${habit.category} ${habit.groupName ?? ""}`.toLocaleLowerCase("id-ID").includes(normalizedQuery));
  }, [habits, completionFilter, categoryFilter, query]);

  return (
    <>
      <PageIntro
        eyebrow="KEBIASAAN HARIAN"
        title="Bangun ritmemu."
        subtitle="Konsistensi kecil lebih berarti daripada target yang terlalu besar."
        action={<div className="habits-intro-actions"><button type="button" className={`secondary-button vacation-toggle ${vacationMode ? "active" : ""}`} onClick={onToggleVacation}>{vacationMode ? "Akhiri mode libur" : "Mode libur"}</button><PrimaryButton onClick={onAdd}><Plus size={15} /> Habit baru</PrimaryButton></div>}
      />

      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Pencatatan habit, progres amount, dan waktu sedang dijeda. Data sebelumnya tetap tersimpan.</div>}
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
          <div className="small-label">STREAK TERPANJANG</div>
          <div className="streak-number">{longestStreak}<span> hari</span></div>
          <p>Pertahankan ritme yang sudah kamu bangun.</p>
        </section>
      </div>

      <section className="card card-pad habits-panel">
        <SectionHeading title="Semua kebiasaan" caption={`${total} kebiasaan tersimpan · ${completed} selesai hari ini`} />
        <div className="habit-toolbar">
          <label className="habit-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kebiasaan…" aria-label="Cari kebiasaan" />
          </label>
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
        <div className="habit-list">
          {filteredHabits.map((habit) => <div key={habit.id} className="habit-draggable" draggable onDragStart={() => setDraggedId(habit.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedId || draggedId === habit.id || !onReorder) return; const next = [...habits]; const from = next.findIndex((item) => item.id === draggedId); const to = next.findIndex((item) => item.id === habit.id); if (from < 0 || to < 0) return; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); onReorder(next); setDraggedId(null); }}><HabitRow habit={habit} onToggle={onToggle} onAdjust={onAdjust} onTimerToggle={onTimerToggle} timerActive={activeTimerId === habit.id} timerElapsedSeconds={activeTimerId === habit.id ? timerElapsedSeconds : 0} paused={vacationMode} /></div>)}
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
    </>
  );
}
