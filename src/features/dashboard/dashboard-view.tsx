import { ArrowRight, Check, Flame, Plus, Target, WalletCards, HeartPulse, Moon } from "lucide-react";
import type { CSSProperties } from "react";
import type { Habit, TabId } from "@/lib/types";
import { formatCompactRupiah } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading, StatCard } from "@/components/ui/primitives";
import { FocusTimer } from "@/features/focus/focus-timer";

const categories: Habit["category"][] = ["Health", "Learning", "Mindfulness", "Personal"];

export function DashboardView({ habits, income, expense, onNavigate, onToggle, onAddHabit, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, vacationMode = false, dailyCheckin }: {
  habits: Habit[]; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; vacationMode?: boolean; dailyCheckin?: { mood: number; sleepHours: number };
}) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(now);
  const jakartaHour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta",
  }).format(now));
  const greeting = jakartaHour < 11 ? "Selamat pagi." : jakartaHour < 15 ? "Selamat siang." : jakartaHour < 18 ? "Selamat sore." : "Selamat malam.";
  const { completed, progress, longestStreak } = summarizeHabits(habits);
  const pendingHabits = [...habits].filter((habit) => !habit.completed).sort((a, b) => a.time.localeCompare(b.time));
  const jakartaClock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now);
  const upcomingHabit = pendingHabits.find((habit) => habit.time >= jakartaClock) ?? pendingHabits[0];
  const net = income - expense;
  const categoryCounts = categories.map((category) => ({
    category,
    count: habits.filter((habit) => habit.category === category).length,
  }));
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count));

  return (
    <>
      <PageIntro
        eyebrow={dateLabel}
        title={greeting}
        subtitle="Satu hari, satu langkah kecil yang berarti."
        action={<PrimaryButton onClick={onAddHabit}><Plus size={15} /> Tambah kebiasaan</PrimaryButton>}
      />
      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Habit tidak bisa dicatat sampai mode libur diakhiri dari halaman Kebiasaan.</div>}
      <div className="dashboard-grid">
        <div className="left-stack">
          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker">RUANG KECIL UNTUK BERTUMBUH</div>
              <h2 className="hero-title">Bertumbuh,<br />dengan ritmemu.</h2>
              <p className="hero-description">
                {habits.length === 0
                  ? "Mulai dengan satu kebiasaan sederhana. Tidak perlu menunggu hari yang sempurna."
                  : completed === habits.length
                    ? "Semua kebiasaan hari ini sudah selesai. Beri dirimu apresiasi."
                    : `${habits.length - completed} langkah kecil masih menunggumu hari ini.`}
              </p>
            </div>
            <div className="hero-ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`Progress hari ini ${progress} persen`}>
              <div className="hero-ring-inner"><span className="hero-percent">{progress}%</span><span className="hero-percent-caption">HARI INI</span></div>
            </div>
          </section>

          <div className="stats-grid">
            <StatCard label="Selesai" value={String(completed)} foot="Habit hari ini" icon={Check} tone="green" />
            <StatCard label="Tersisa" value={String(pendingHabits.length)} foot="Langkah berikutnya" icon={Target} tone="amber" />
            <StatCard label="Streak terbaik" value={`${longestStreak} hari`} foot="Pada satu kebiasaan" icon={Flame} />
            <StatCard label="Mood hari ini" value={dailyCheckin ? `${dailyCheckin.mood}/5` : "—"} foot={dailyCheckin ? "Dari daily check-in" : "Belum check-in"} icon={HeartPulse} />
            <StatCard label="Tidur" value={dailyCheckin ? `${dailyCheckin.sleepHours} jam` : "—"} foot="Catatan tidur hari ini" icon={Moon} />
          </div>

          <section className="card card-pad">
            <SectionHeading
              title="Agenda hari ini"
              caption={`${completed} dari ${habits.length} kebiasaan selesai`}
              action={<button className="text-button" type="button" onClick={() => onNavigate("habits")}>Lihat semua <ArrowRight size={13} /></button>}
            />
            {habits.length > 0 ? (
              <>
                <div className="habit-list">
                  {[...habits].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 4).map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={onToggle} onAdjust={onAdjust} onTimerToggle={onTimerToggle} timerActive={activeTimerId === habit.id} timerElapsedSeconds={activeTimerId === habit.id ? timerElapsedSeconds : 0} paused={vacationMode} />)}
                </div>
                {habits.length > 4 && <button className="text-button list-more" type="button" onClick={() => onNavigate("habits")}>Lihat {habits.length - 4} kebiasaan lainnya <ArrowRight size={13} /></button>}
              </>
            ) : (
              <EmptyState
                title="Mulai dari satu kebiasaan"
                description="Tambahkan hal sederhana yang ingin kamu lakukan hari ini."
                action={<PrimaryButton onClick={onAddHabit}><Plus size={14} /> Buat kebiasaan pertama</PrimaryButton>}
              />
            )}
          </section>

          <section className="card card-pad category-card">
            <SectionHeading title="Komposisi kebiasaan" caption="Pembagian kebiasaan yang kamu simpan" />
            <div className="category-breakdown">
              {categoryCounts.map(({ category, count }) => (
                <div className="category-breakdown-row" key={category}>
                  <div className="category-breakdown-top"><span>{category}</span><strong>{count}</strong></div>
                  <div className="budget-track"><div className="budget-fill" style={{ width: `${count / maxCategoryCount * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="right-stack">
          <section className="card finance-mini">
            <div className="finance-mini-head"><span className="small-label">KEUANGAN BULAN INI</span><WalletCards size={17} color="var(--primary)" /></div>
            <div className="finance-mini-value">{formatCompactRupiah(net)}</div>
            <div className="small-label">Arus kas bersih · bulan berjalan</div>
            <div className="finance-pair">
              <div className="finance-pair-item income"><span className="small-label">Masuk</span><strong>{formatCompactRupiah(income)}</strong></div>
              <div className="finance-pair-item expense"><span className="small-label">Keluar</span><strong>{formatCompactRupiah(expense)}</strong></div>
            </div>
            <button className="text-button finance-mini-link" type="button" onClick={() => onNavigate("finance")}>Buka keuangan <ArrowRight size={13} /></button>
          </section>

          <section className="card next-step-card">
            <div className="next-step-label"><span className="next-step-dot" /> LANGKAH BERIKUTNYA</div>
            {upcomingHabit ? (
              <>
                <h2>{upcomingHabit.title}</h2>
                <p>{upcomingHabit.time} · {upcomingHabit.duration} menit · {upcomingHabit.category}</p>
                <button className="next-step-action" type="button" disabled={vacationMode} onClick={() => onToggle(upcomingHabit.id)}>
                  <Check size={15} /> Tandai selesai
                </button>
              </>
            ) : (
              <>
                <h2>{habits.length === 0 ? "Ruangmu masih kosong." : "Semua langkah selesai."}</h2>
                <p>{habits.length === 0 ? "Bangun rutinitas pertamamu." : "Kamu sudah menyelesaikan semua kebiasaan hari ini."}</p>
                <button className="next-step-action" type="button" onClick={habits.length === 0 ? onAddHabit : () => onNavigate("habits")}>
                  {habits.length === 0 ? <Plus size={15} /> : <ArrowRight size={15} />}
                  {habits.length === 0 ? "Tambah kebiasaan" : "Lihat kebiasaan"}
                </button>
              </>
            )}
          </section>

          <FocusTimer />
          <section className="quote-card">
            <div className="quote-mark">“</div>
            <p className="quote-text">Tidak harus sempurna. Yang penting, kamu kembali melangkah.</p>
            <div className="quote-caption">PENGINGAT KECIL · RUTINA</div>
          </section>
        </div>
      </div>
    </>
  );
}
