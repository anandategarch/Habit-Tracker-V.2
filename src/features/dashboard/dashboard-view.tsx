import { ArrowRight, Check, Flame, Target, WalletCards } from "lucide-react";
import type { Habit, TabId } from "@/lib/types";
import { formatCompactRupiah } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { HabitRow, PageIntro, SectionHeading, StatCard } from "@/components/ui/primitives";
import { FocusTimer } from "@/features/focus/focus-timer";

export function DashboardView({ habits, income, expense, onNavigate, onToggle, onAddHabit }: {
  habits: Habit[]; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void;
}) {
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
  const { completed, progress, totalStreak } = summarizeHabits(habits);
  const net = income - expense;

  return (
    <>
      <PageIntro eyebrow={dateLabel} title="Selamat pagi." subtitle="Pelan-pelan, tapi terus bertumbuh." />
      <div className="dashboard-grid">
        <div className="left-stack">
          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker">RUANG KECIL UNTUK BERTUMBUH</div>
              <h2 className="hero-title">Your life,<br />in rhythm.</h2>
              <p className="hero-description">Satu langkah baik hari ini adalah awal dari perubahan besar.</p>
            </div>
            <div className="hero-ring" style={{ "--progress": `${progress}%` } as CSSProperties}>
              <div className="hero-ring-inner"><span className="hero-percent">{progress}%</span><span className="hero-percent-caption">TODAY</span></div>
            </div>
          </section>

          <div className="stats-grid">
            <StatCard label="Habit selesai" value={`${completed}/${habits.length}`} foot="Hari ini" icon={Check} />
            <StatCard label="Total streak" value={`${totalStreak}`} foot="Hari terkumpul" icon={Flame} />
            <StatCard label="Konsistensi" value={`${progress}%`} foot="Progress harian" icon={Target} />
          </div>

          <section className="card card-pad">
            <SectionHeading title="Hari ini" caption="Langkah kecil yang ingin kamu selesaikan" action={<button className="text-button" onClick={() => onNavigate("habits")}>Lihat semua <ArrowRight size={13} /></button>} />
            <div className="habit-list">
              {habits.slice(0, 4).map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={onToggle} />)}
              {habits.length === 0 && <div className="empty-state">Belum ada habit. Tambahkan satu langkah kecil untuk memulai.</div>}
            </div>
            <div style={{ marginTop: 13 }}><button className="text-button" onClick={onAddHabit}><Plus size={14} /> Tambah habit baru</button></div>
          </section>
        </div>

        <div className="right-stack">
          <section className="card finance-mini">
            <div className="finance-mini-head"><span className="small-label">KEUANGAN BULAN INI</span><WalletCards size={17} color="var(--primary)" /></div>
            <div className="finance-mini-value">{formatCompactRupiah(net)}</div>
            <div className="small-label">Arus kas bersih · data lokal</div>
            <div className="finance-pair" style={{ marginTop: 16 }}>
              <div className="finance-pair-item income"><span className="small-label">Masuk</span><strong>{formatCompactRupiah(income)}</strong></div>
              <div className="finance-pair-item expense"><span className="small-label">Keluar</span><strong>{formatCompactRupiah(expense)}</strong></div>
            </div>
            <button className="text-button" style={{ marginTop: 14 }} onClick={() => onNavigate("finance")}>Buka keuangan <ArrowRight size={13} /></button>
          </section>
          <section className="card card-pad">
            <SectionHeading title="Ritme mingguan" caption="Kebiasaan baik dibangun dari pengulangan." />
            <div className="chart-bars" style={{ height: 142 }}>
              {[42, 68, 54, 82, 63, 92, progress || 8].map((height, index) => (
                <div className="chart-column" key={index}><div className={`chart-bar ${index === 6 ? "active" : ""}`} style={{ height: `${height}%` }} /><span className="chart-label">{["S","S","R","K","J","S","M"][index]}</span></div>
              ))}
            </div>
          </section>
          <FocusTimer />
          <section className="quote-card">
            <div className="quote-mark">“</div>
            <p className="quote-text">Tidak harus sempurna. Yang penting, kamu kembali melangkah.</p>
            <div className="quote-caption">A GENTLE REMINDER · RUTINA</div>
          </section>
        </div>
      </div>
    </>
  );
}
