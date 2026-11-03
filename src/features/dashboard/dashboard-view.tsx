import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Check, Flame, Grid2X2, HeartPulse, Plus, Sprout, TrendingUp, WalletCards } from "lucide-react";
import type { CSSProperties } from "react";
import type { Habit, TabId } from "@/lib/types";
import { formatCompactRupiah, todayISO } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading, StatCard } from "@/components/ui/primitives";
import { FocusTimer } from "@/features/focus/focus-timer";

const categories: Habit["category"][] = ["Health", "Learning", "Mindfulness", "Personal"];
const RING_RADIUS = 31;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type HistoryRecord = { habitId: string; title: string; date: string };

function useWeeklyActivity(habits: Habit[]) {
  const todayKey = todayISO();
  const weekDates = useMemo(() => {
    const anchor = new Date(`${todayKey}T12:00:00+07:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(anchor);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
  }, [todayKey]);
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const months = [...new Set(weekDates.map((date) => date.slice(0, 7)))];
    void Promise.all(months.map(async (month) => {
      const response = await fetch(`/api/history?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Habit history unavailable");
      const payload = await response.json() as { records?: HistoryRecord[] };
      return Array.isArray(payload.records) ? payload.records : [];
    }))
      .then((recordsByMonth) => { if (!cancelled) setRecords(recordsByMonth.flat()); })
      .catch(() => { if (!cancelled) setRecords([]); });
    return () => { cancelled = true; };
  }, [weekDates]);

  const completedByDate = useMemo(() => {
    const map = new Map<string, number>();
    records?.forEach((record) => map.set(record.date, (map.get(record.date) ?? 0) + 1));
    return map;
  }, [records]);

  const days = useMemo(() => weekDates.map((date) => ({
    date,
    completed: date === todayKey ? habits.filter((habit) => habit.completed).length : (completedByDate.get(date) ?? 0),
  })), [weekDates, todayKey, habits, completedByDate]);

  return { days, loading: records === null, total: days.reduce((sum, day) => sum + day.completed, 0) };
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${date}T12:00:00+07:00`));
}

export function DashboardView({ habits, totalHabits, income, expense, onNavigate, onToggle, onAddHabit, onAddTransaction, onOpenFeatures, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, vacationMode = false, dailyCheckin }: {
  habits: Habit[]; totalHabits: number; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void; onAddTransaction: () => void; onOpenFeatures: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; vacationMode?: boolean; dailyCheckin?: { mood: number; sleepHours: number };
}) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  }).format(now);
  const jakartaHour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta",
  }).format(now));
  const greeting = jakartaHour < 11 ? "Selamat pagi" : jakartaHour < 15 ? "Selamat siang" : jakartaHour < 18 ? "Selamat sore" : "Selamat malam";
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
  const sortedHabits = [...habits].sort((a, b) => a.time.localeCompare(b.time));
  const weekly = useWeeklyActivity(habits);
  const weeklyMax = Math.max(1, ...weekly.days.map((day) => day.completed));

  return (
    <div className="botanical-dashboard-page">
      <PageIntro
        eyebrow={dateLabel}
        title={`${greeting}, Ananda! 🌱`}
        subtitle="Langkah kecil hari ini, membawa perubahan besar esok."
        action={<PrimaryButton onClick={onAddHabit}><Plus size={15} /> Tambah kebiasaan</PrimaryButton>}
      />
      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Habit tidak bisa dicatat sampai mode libur diakhiri dari halaman Kebiasaan.</div>}

      <section className="hero-card botanical-hero" aria-label="Ringkasan perkembangan hari ini">
        <div className="hero-copy">
          <div className="hero-kicker">RUANG KECIL UNTUK BERTUMBUH</div>
          <h2 className="hero-title">Disiplin kecil<br />membentuk hidup<br />yang luar biasa.</h2>
          <p className="hero-description">— Rutina</p>
        </div>
        <div className="hero-progress-card">
          <div className="hero-ring" role="img" aria-label={`Progres habit hari ini ${progress} persen, ${completed} dari ${habits.length} kebiasaan selesai`}>
            <svg viewBox="0 0 76 76" aria-hidden="true">
              <defs>
                <linearGradient id="heroRingFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5c9a69" />
                  <stop offset="100%" stopColor="#37b76b" />
                </linearGradient>
              </defs>
              <circle className="hero-ring-track" cx="38" cy="38" r={RING_RADIUS} fill="none" strokeWidth="7" />
              <circle
                className="hero-ring-progress"
                cx="38"
                cy="38"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#heroRingFill)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress / 100)}
                transform="rotate(-90 38 38)"
              />
            </svg>
            <div className="hero-ring-label">
              <strong>{progress}%</strong>
              <small>{completed}/{habits.length}</small>
            </div>
          </div>
          <div className="hero-progress-copy">
            <div className="hero-progress-heading"><strong>Habit hari ini</strong><span>{completed} selesai</span></div>
            <div className="hero-progress-count"><b>{completed} / {habits.length}</b> kebiasaan</div>
            <div className="hero-progress-track" role="progressbar" aria-label="Progress habit hari ini" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` } as CSSProperties} />
            </div>
          </div>
        </div>
      </section>

      <section className="quick-actions" aria-label="Aksi cepat">
        <button className="quick-action habit" type="button" onClick={onAddHabit}>
          <span className="quick-action-icon"><Sprout size={16} /></span>
          <span className="quick-action-copy"><strong>Tambah kebiasaan</strong><small>Buat rutinitas baru</small></span>
        </button>
        <button className="quick-action finance" type="button" onClick={onAddTransaction}>
          <span className="quick-action-icon"><WalletCards size={16} /></span>
          <span className="quick-action-copy"><strong>Catat transaksi</strong><small>Pemasukan &amp; pengeluaran</small></span>
        </button>
        <button className="quick-action browse" type="button" onClick={onOpenFeatures}>
          <span className="quick-action-icon"><Grid2X2 size={16} /></span>
          <span className="quick-action-copy"><strong>Semua fitur</strong><small>Jelajahi ruang Rutina</small></span>
        </button>
      </section>

      <div className="stats-grid botanical-stats">
        <StatCard label="Streak terbaik" value={`${longestStreak} hari`} foot="Konsistensi tertinggi" icon={Flame} tone="amber" />
        <StatCard label="Total habit" value={String(totalHabits)} foot="Kebiasaan aktif" icon={Check} tone="green" />
        <StatCard label="Saldo" value={formatCompactRupiah(net)} foot="Arus kas bulan berjalan" icon={WalletCards} tone="orange" />
        <StatCard label="Aktivitas hari ini" value={`${habits.length} kegiatan`} foot="Kebiasaan terjadwal" icon={Activity} />
      </div>

      <div className="dashboard-grid botanical-dashboard-grid">
        <div className="left-stack">
          <section className="card card-pad home-habits-card">
            <SectionHeading
              title="Habit Utama"
              caption={`${completed} dari ${habits.length} kebiasaan selesai hari ini`}
              action={<button className="text-button" type="button" onClick={() => onNavigate("habits")}>Lihat semua <ArrowRight size={13} /></button>}
            />
            {habits.length > 0 ? (
              <>
                <div className="habit-list">
                  {sortedHabits.slice(0, 5).map((habit) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      onToggle={onToggle}
                      onAdjust={onAdjust}
                      onTimerToggle={onTimerToggle}
                      timerActive={activeTimerId === habit.id}
                      timerElapsedSeconds={activeTimerId === habit.id ? timerElapsedSeconds : 0}
                      paused={vacationMode}
                    />
                  ))}
                </div>
                {habits.length > 5 && <button className="text-button list-more" type="button" onClick={() => onNavigate("habits")}>Lihat {habits.length - 5} kebiasaan lainnya <ArrowRight size={13} /></button>}
              </>
            ) : (
              <EmptyState
                title="Mulai dari satu kebiasaan"
                description="Tambahkan hal sederhana yang ingin kamu lakukan hari ini."
                action={<PrimaryButton onClick={onAddHabit}><Plus size={14} /> Buat kebiasaan pertama</PrimaryButton>}
              />
            )}
          </section>

          <section className="card card-pad weekly-trend-card" aria-label="Progres habit 7 hari terakhir">
            <SectionHeading
              title="Progress mingguan"
              caption="Habit yang tercatat selesai 7 hari terakhir"
              action={<span className="weekly-trend-badge"><TrendingUp size={12} /> {weekly.total} selesai</span>}
            />
            {weekly.loading ? (
              <div className="insight-trend-empty"><span><Sprout size={22} /></span><strong>Menyiapkan ringkasan mingguan</strong><p>Riwayat penyelesaian habit sedang dimuat.</p></div>
            ) : weekly.total > 0 ? (
              <>
                <div className="insight-trend-chart weekly-trend-chart">
                  {weekly.days.map((day) => (
                    <div className="insight-trend-day" key={day.date} aria-label={`${day.date}: ${day.completed} habit selesai`}>
                      <strong className="insight-trend-value">{day.completed}</strong>
                      <div className="insight-trend-bars">
                        <span className="insight-trend-bar activity" style={{ height: day.completed ? `${Math.max(8, day.completed / weeklyMax * 100)}%` : "0%" }} title={`${day.completed} habit selesai`} />
                      </div>
                      <small>{weekdayLabel(day.date)}</small>
                    </div>
                  ))}
                </div>
                <div className="insight-trend-legend"><span><i className="activity" /> Habit selesai</span><small>7 hari terakhir</small></div>
              </>
            ) : (
              <div className="insight-trend-empty"><span><Sprout size={22} /></span><strong>Belum ada progres minggu ini</strong><p>Habit yang kamu selesaikan akan muncul di grafik ini setelah tersimpan.</p></div>
            )}
          </section>

          <section className="card card-pad category-card">
            <SectionHeading title="Komposisi kebiasaan" caption="Kebiasaan yang terjadwal hari ini" />
            <div className="category-breakdown botanical-category-breakdown">
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
          <section className="card finance-mini botanical-finance-card">
            <div className="finance-mini-head"><span className="small-label">KEUANGAN BULAN INI</span><WalletCards size={18} /></div>
            <div className="finance-mini-value">{formatCompactRupiah(net)}</div>
            <div className="small-label">Arus kas bersih · bulan berjalan</div>
            <div className="finance-pair">
              <div className="finance-pair-item income"><span className="small-label">Pemasukan</span><strong>{formatCompactRupiah(income)}</strong></div>
              <div className="finance-pair-item expense"><span className="small-label">Pengeluaran</span><strong>{formatCompactRupiah(expense)}</strong></div>
            </div>
            <button className="text-button finance-mini-link" type="button" onClick={() => onNavigate("finance")}>Buka keuangan <ArrowRight size={13} /></button>
          </section>

          <section className="card next-step-card botanical-next-step">
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

          {dailyCheckin && (
            <section className="daily-checkin-mini">
              <span className="daily-checkin-icon"><HeartPulse size={17} /></span>
              <div><strong>Catatan dirimu hari ini</strong><span>Mood {dailyCheckin.mood}/5 · Tidur {dailyCheckin.sleepHours} jam</span></div>
            </section>
          )}

          <FocusTimer />
          <section className="quote-card botanical-quote-card">
            <div className="quote-mark">“</div>
            <p className="quote-text">Tidak harus sempurna. Yang penting, kamu kembali melangkah.</p>
            <div className="quote-caption">PENGINGAT KECIL · RUTINA</div>
          </section>
        </div>
      </div>
    </div>
  );
}
