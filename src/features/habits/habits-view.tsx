import { Plus } from "lucide-react";
import type { Habit } from "@/lib/types";
import { summarizeHabits } from "@/lib/habits";
import { HabitRow, PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";

export function HabitsView({ habits, onToggle, onAdd }: { habits: Habit[]; onToggle: (id: string) => void; onAdd: () => void }) {
  const { completed, total, progress } = summarizeHabits(habits);
  return (
    <>
      <PageIntro eyebrow="KEBIASAAN HARIAN" title="Bangun ritmemu." subtitle="Konsistensi kecil lebih berarti daripada target yang terlalu besar." action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Habit baru</PrimaryButton>} />
      <div className="habit-page-grid">
        <section className="card card-pad">
          <SectionHeading title="Semua habit" caption={`${total} kebiasaan tersimpan · ${completed} selesai hari ini`} />
          <div className="habit-list">
            {habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={onToggle} />)}
            {habits.length === 0 && <div className="empty-state">Belum ada habit. Mulai dari satu kebiasaan sederhana.</div>}
          </div>
        </section>
        <div className="right-stack">
          <section className="card habit-side-card">
            <span className="small-label">PROGRESS HARI INI</span>
            <div className="streak-number">{progress}%</div>
            <div className="streak-caption">{completed} dari {habits.length} habit telah selesai.</div>
            <div className="budget-track" style={{ marginTop: 15, height: 9 }}><div className="budget-fill" style={{ width: `${progress}%` }} /></div>
          </section>
          <section className="quote-card"><div className="quote-mark">“</div><p className="quote-text">Mulai dari yang bisa kamu lakukan hari ini.</p><div className="quote-caption">ONE DAY AT A TIME</div></section>
        </div>
      </div>
    </>
  );
}
