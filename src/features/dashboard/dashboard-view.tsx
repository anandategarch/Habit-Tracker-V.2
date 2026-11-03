import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Flame, HeartPulse, Pause, Play, Plus, RefreshCw, Sprout, TrendingUp, WalletCards } from "lucide-react";
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
  const historyDates = useMemo(() => {
    const anchor = new Date(todayKey + "T12:00:00+07:00");
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(anchor);
      date.setUTCDate(date.getUTCDate() - (13 - index));
      return date.toISOString().slice(0, 10);
    });
  }, [todayKey]);
  const weekDates = historyDates.slice(7);
  const previousDates = historyDates.slice(0, 7);
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const months = [...new Set(historyDates.map((date) => date.slice(0, 7)))];
    void Promise.all(months.map(async (month) => {
      const response = await fetch("/api/history?month=" + encodeURIComponent(month), { cache: "no-store" });
      if (!response.ok) throw new Error("Habit history unavailable");
      const payload = await response.json() as { records?: HistoryRecord[] };
      return Array.isArray(payload.records) ? payload.records : [];
    }))
      .then((recordsByMonth) => {
        if (cancelled) return;
        setRecords(recordsByMonth.flat());
        setHistoryError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRecords([]);
        setHistoryError(true);
      });
    return () => { cancelled = true; };
  }, [historyDates, retryVersion]);

  const completedByDate = useMemo(() => {
    const map = new Map<string, number>();
    records?.forEach((record) => map.set(record.date, (map.get(record.date) ?? 0) + 1));
    return map;
  }, [records]);

  const days = useMemo(() => weekDates.map((date) => ({
    date,
    completed: date === todayKey ? habits.filter((habit) => habit.completed).length : (completedByDate.get(date) ?? 0),
  })), [weekDates, todayKey, habits, completedByDate]);

  const previousTotal = previousDates.reduce((sum, date) => sum + (completedByDate.get(date) ?? 0), 0);
  const total = days.reduce((sum, day) => sum + day.completed, 0);
  return {
    days,
    loading: records === null,
    error: historyError,
    total,
    previousTotal,
    change: total - previousTotal,
    retry: () => setRetryVersion((current) => current + 1),
  };
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${date}T12:00:00+07:00`));
}

export function DashboardView({ habits, totalHabits, income, expense, onNavigate, onToggle, onAddHabit, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, vacationMode = false, dailyCheckin }: {
  habits: Habit[]; totalHabits: number; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; vacationMode?: boolean; dailyCheckin?: { mood: number; sleepHours: number };
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
  const dailyEncouragement = vacationMode
    ? "Hari ini kamu boleh mengambil jeda. Rutinitasmu tetap ada saat kamu siap kembali."
    : totalHabits === 0
      ? "Mulai dari satu hal sederhana yang ingin kamu rawat hari ini."
      : habits.length === 0
        ? "Tidak ada kebiasaan terjadwal hari ini. Gunakan ruang ini untuk hal lain yang penting bagimu."
        : completed === habits.length
          ? "Semua langkah terjadwal sudah kamu rawat. Sisakan ruang untuk menikmati harimu."
          : completed > 0
            ? `${completed} langkah sudah kamu lakukan. Pilih satu hal kecil berikutnya, sesuai ritmemu.`
            : "Tidak perlu menunggu sempurna. Satu langkah kecil sudah cukup untuk memulai.";

  return (
    <div className="botanical-dashboard-page">
      <PageIntro
        eyebrow={dateLabel}
        title={`${greeting}, Ananda! 🌱`}
        subtitle={dailyEncouragement}
      />
      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Habit tidak bisa dicatat sampai mode libur diakhiri dari halaman Kebiasaan.</div>}

      <section className="hero-card botanical-hero" aria-label="Ringkasan perkembangan hari ini">
        <div className="hero-copy">
          <div className="hero-kicker">{vacationMode ? "A MOMENT TO REST" : "YOUR LITTLE GARDEN"}</div>
          <h2 className="hero-title">Tumbuh pelan,<br />tetap bertumbuh.</h2>
          <p className="hero-description">Setiap langkah kecil ikut membentuk hidup yang kamu pilih.</p>
          <button className="garden-journey-link" type="button" onClick={() => onNavigate("tree")}>Lihat perjalanan pohonmu <ArrowRight size={13} /></button>
        </div>
        <div className="hero-quote-bubble" aria-label="Pengingat Rutina">
          <p>“Tidak ada taman yang tumbuh dalam satu malam. Kamu juga tidak harus.”</p>
          <span>— Catatan kecil Rutina</span>
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

            <div className="stats-grid botanical-stats botanical-stats-three">
        <StatCard label="Rekor konsistensi" value={`${longestStreak} hari`} foot="Satu capaian yang pernah kamu bangun" icon={Flame} tone="amber" />
        <StatCard label="Kebiasaan aktif" value={String(totalHabits)} foot="Hal yang sedang kamu rawat" icon={Sprout} tone="green" />
        <StatCard label="Arus kas bersih" value={formatCompactRupiah(net)} foot="Bulan berjalan" icon={WalletCards} tone="orange" />
      </div>

      <div className="dashboard-feature-grid">
        <section className="card card-pad home-habits-card">
          <SectionHeading
            title="Ritual hari ini"
            caption="Pilih langkah yang ingin kamu rawat hari ini"
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

        <section className="card card-pad weekly-trend-card" aria-label="Progres habit tujuh hari terakhir">
          <SectionHeading
            title="Cerita minggu ini"
            caption="Setiap penyelesaian adalah bagian dari perjalananmu"
            action={<span className="weekly-trend-badge"><TrendingUp size={12} /> {weekly.total} langkah</span>}
          />
          {weekly.loading ? (
            <div className="weekly-loading-skeleton" role="status" aria-live="polite">
              <span className="sr-only">Memuat ringkasan progres mingguan.</span>
              <div className="weekly-skeleton-layout">
                <span className="skeleton-shimmer weekly-skeleton-ring" />
                <div className="weekly-skeleton-bars">
                  {Array.from({ length: 7 }, (_, index) => <span className="weekly-skeleton-day" key={index}><i className="skeleton-shimmer" /></span>)}
                </div>
              </div>
              <span className="skeleton-shimmer weekly-skeleton-line" />
            </div>
          ) : weekly.error ? (
            <div className="insight-trend-empty" role="status"><span><Sprout size={22} /></span><strong>Riwayat mingguan belum tersedia</strong><p>Progres hari ini tetap tersedia. Coba muat ulang ringkasan saat koneksi sudah siap.</p><button className="weekly-retry-action" type="button" onClick={weekly.retry}><RefreshCw size={13} /> Coba lagi</button></div>
          ) : weekly.total > 0 ? (
            <>
              <div className="weekly-trend-layout">
                <div className="weekly-progress-ring" role="img" aria-label={"Progres habit hari ini " + progress + " persen"} style={{ "--progress": progress + "%" } as CSSProperties}>
                  <div><strong>{progress}%</strong><small>HARI INI</small></div>
                </div>
                <div className="insight-trend-chart weekly-trend-chart">
                  {weekly.days.map((day) => (
                    <div className="insight-trend-day" key={day.date} aria-label={day.date + ": " + day.completed + " habit selesai"}>
                      <strong className="insight-trend-value">{day.completed}</strong>
                      <div className="insight-trend-bars">
                        <span className="insight-trend-bar activity" style={{ height: day.completed ? String(Math.max(8, day.completed / weeklyMax * 100)) + "%" : "0%" }} title={day.completed + " habit selesai"} />
                      </div>
                      <small>{weekdayLabel(day.date)}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="weekly-trend-footer">
                <span className={"weekly-comparison " + (weekly.change > 0 ? "positive" : weekly.change < 0 ? "negative" : "")}>
                  {weekly.change > 0 ? `Kamu mencatat ${weekly.change} langkah lebih banyak dari pekan sebelumnya.` : weekly.change < 0 ? "Pekan ini berjalan lebih ringan. Setiap ritme tetap punya tempat." : "Kamu menjaga ritme yang sama dengan pekan sebelumnya."}
                </span>
                <button className="weekly-add-action" type="button" onClick={onAddHabit}><Plus size={14} /> Tambah Kebiasaan</button>
              </div>
            </>
          ) : (
            <div className="insight-trend-empty"><span><Sprout size={22} /></span><strong>Belum ada progres minggu ini</strong><p>Habit yang kamu selesaikan akan muncul di grafik ini setelah tersimpan.</p><button className="weekly-add-action" type="button" onClick={onAddHabit}><Plus size={14} /> Tambah Kebiasaan</button></div>
          )}
        </section>
      </div>

      <div className="dashboard-support-grid">
        <section className="card card-pad category-card">
          <SectionHeading title="Area yang kamu rawat" caption="Pembagian kebiasaan terjadwal hari ini" />
          <div className="category-breakdown botanical-category-breakdown">
            {categoryCounts.map(({ category, count }) => (
              <div className="category-breakdown-row" key={category}>
                <div className="category-breakdown-top"><span>{category}</span><strong>{count}</strong></div>
                <div className="budget-track"><div className="budget-fill" style={{ width: String(count / maxCategoryCount * 100) + "%" }} /></div>
              </div>
            ))}
          </div>
        </section>

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

        <section className="card next-step-card botanical-next-step" aria-label="Satu langkah kecil hari ini">
          <div className="next-step-label"><span className="next-step-dot" /> ONE THING TODAY · SATU LANGKAH KECIL</div>
          {vacationMode ? (
            <>
              <h2>Hari ini, izinkan dirimu beristirahat.</h2>
              <p>Mode libur aktif. Tidak ada target yang perlu dikejar hari ini.</p>
            </>
          ) : upcomingHabit ? (
            <>
              <div className="daily-intention-meta"><span>{upcomingHabit.time}</span><span>{upcomingHabit.duration} menit</span><span>{upcomingHabit.category}</span></div>
              <h2>{upcomingHabit.title}</h2>
              <p>Cukup fokus pada satu hal ini. Kamu tidak perlu memikirkan semuanya sekaligus.</p>
              <div className="daily-intention-actions">
                <button className="next-step-action" type="button" disabled={!onTimerToggle} onClick={() => onTimerToggle?.(upcomingHabit.id)} aria-pressed={activeTimerId === upcomingHabit.id}>
                  {activeTimerId === upcomingHabit.id ? <Pause size={15} /> : <Play size={15} />}
                  {activeTimerId === upcomingHabit.id ? "Hentikan timer habit" : "Mulai timer habit"}
                </button>
                <button className="daily-intention-complete" type="button" onClick={() => onToggle(upcomingHabit.id)}>
                  <Check size={14} /> Tandai selesai
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>{totalHabits === 0 ? "Mulai dari satu kebiasaan kecil." : habits.length === 0 ? "Hari ini tidak ada habit terjadwal." : "Semua ritual hari ini sudah kamu rawat."}</h2>
              <p>{totalHabits === 0 ? "Pilih hal sederhana yang ingin kamu lakukan untuk dirimu sendiri." : habits.length === 0 ? "Kamu boleh menggunakan ruang ini untuk hal lain yang penting hari ini." : "Kamu sudah menyelesaikan semua kebiasaan terjadwal. Ambil jeda dan nikmati progresmu."}</p>
              <button className="next-step-action" type="button" onClick={totalHabits === 0 ? onAddHabit : () => onNavigate("habits")}>
                {totalHabits === 0 ? <Plus size={15} /> : <ArrowRight size={15} />}
                {totalHabits === 0 ? "Buat kebiasaan pertama" : "Lihat kebiasaan"}
              </button>
            </>
          )}
        </section>

        <section className="dashboard-support-bottom">
          {dailyCheckin && <section className="daily-checkin-mini"><span className="daily-checkin-icon"><HeartPulse size={17} /></span><div><strong>Catatan dirimu hari ini</strong><span>Mood {dailyCheckin.mood}/5 · Tidur {dailyCheckin.sleepHours} jam</span></div></section>}
          <FocusTimer />
        </section>
      </div>
    </div>
  );
}
