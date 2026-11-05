import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Droplets, Flame, HeartPulse, Leaf, Pause, Play, Plus, RefreshCw, Shield, Sprout, TrendingUp, WalletCards } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { Habit, TabId } from "@/lib/types";
import { formatCompactRupiah, todayISO } from "@/lib/format";
import { summarizeHabits } from "@/lib/habits";
import { computeGardenRhythm, consumeShield, shieldAvailableThisWeek, summarizeSeedBank, type GardenRhythm } from "@/lib/garden-rewards";
import { progressSentence, streakStory, todayStory, weeklyStepsStory } from "@/lib/storytelling";
import { ThemedSelect } from "@/components/ui/themed-select";
import { RichText } from "@/components/ui/rich-text";
import { burstLeaves, useCountUp } from "@/components/ui/celebrate";
import { EmptyState, HabitRow, PageIntro, PrimaryButton, SectionHeading, StatCard } from "@/components/ui/primitives";
import { FocusTimer } from "@/features/focus/focus-timer";
import { BotanicalIllustrationBackdrop } from "@/components/ui/botanical-illustration";

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
    byDate: completedByDate,
    ready: records !== null && !historyError,
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

export function DashboardView({ habits, totalHabits, income, expense, onNavigate, onToggle, onAddHabit, onAdjust, onTimerToggle, activeTimerId, timerElapsedSeconds = 0, vacationMode = false, dailyCheckin, focusTimerRemainingSeconds, focusTimerRunning, onFocusTimerToggle, onFocusTimerReset, storySlot }: {
  habits: Habit[]; totalHabits: number; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; activeTimerId?: string | null; timerElapsedSeconds?: number; vacationMode?: boolean; dailyCheckin?: { mood: number; sleepHours: number };
  focusTimerRemainingSeconds: number; focusTimerRunning: boolean; onFocusTimerToggle: () => void; onFocusTimerReset: () => void; storySlot?: ReactNode;
}) {
  const now = new Date();
  const todayKey = todayISO();
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

  // ===== Fase 1: angka roll-up (streak & rupiah) =====
  const animatedStreak = useCountUp(longestStreak, 700, 180);
  const animatedNet = useCountUp(net, 950, 240);

  // ===== Fase 2: ritme kebun (perisai / layu) + koleksi benih =====
  const [rhythm, setRhythm] = useState<GardenRhythm | null>(null);
  const rhythmDecided = useRef(false);
  const [seedChip, setSeedChip] = useState(() => summarizeSeedBank());
  useEffect(() => {
    const onSeedAdded = () => setSeedChip(summarizeSeedBank());
    window.addEventListener("rutina:seed-added", onSeedAdded);
    return () => window.removeEventListener("rutina:seed-added", onSeedAdded);
  }, []);
  useEffect(() => {
    if (rhythmDecided.current || !weekly.ready || weekly.byDate.size === 0) return;
    const plan = computeGardenRhythm(todayKey, weekly.byDate, completed, shieldAvailableThisWeek());
    if (!plan.level) return;
    rhythmDecided.current = true;
    if (plan.level === "shield") {
      const applied = consumeShield();
      setRhythm(applied ? plan : { ...plan, level: "parched" });
    } else {
      setRhythm(plan);
    }
  }, [weekly.ready, weekly.byDate, todayKey, completed]);
  const [returning, setReturning] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [focusHabitId, setFocusHabitId] = useState("");
  const [gardenTheme, setGardenTheme] = useState<"sage" | "peach" | "moss">("sage");
  useEffect(() => {
    try {
      const today = todayISO();
      const lastVisit = window.localStorage.getItem("rutina.v2.last-dashboard-visit");
      const dismissed = window.localStorage.getItem("rutina.v2.welcome-dismissed");
      const pendingWelcome = window.localStorage.getItem("rutina.v2.welcome-pending");
      const gap = lastVisit
        ? Math.floor((new Date(`${today}T12:00:00+07:00`).getTime() - new Date(`${lastVisit}T12:00:00+07:00`).getTime()) / 86400000)
        : 0;
      const shouldWelcome = dismissed !== today && (pendingWelcome === today || gap >= 3);
      setReturning(shouldWelcome);
      if (shouldWelcome) window.localStorage.setItem("rutina.v2.welcome-pending", today);
      window.localStorage.setItem("rutina.v2.last-dashboard-visit", today);
      const savedFocus = window.localStorage.getItem("rutina.v2.daily-focus");
      if (savedFocus) {
        const focusPreference = JSON.parse(savedFocus) as { date?: unknown; habitId?: unknown };
        if (focusPreference.date === today && typeof focusPreference.habitId === "string") {
          setFocusHabitId(focusPreference.habitId);
        }
      }
      const savedTheme = window.localStorage.getItem("rutina.v2.garden-theme");
      // Migrasi nilai lawas "lavender" (dihapus pada audit v0.13 — bertentangan
      // dengan pedoman taman botani yang melarang ungu) ke "moss" yang seinduk.
      const migratedTheme = savedTheme === "lavender" ? "moss" : savedTheme;
      if (migratedTheme === "moss") {
        setGardenTheme("moss");
        try { window.localStorage.setItem("rutina.v2.garden-theme", "moss"); } catch { /* abaikan */ }
      } else if (migratedTheme === "peach" || migratedTheme === "sage") {
        setGardenTheme(migratedTheme);
      }
    } catch { /* Preferensi lokal bersifat opsional. */ }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem("rutina.v2.daily-focus", JSON.stringify({
        date: todayISO(),
        habitId: focusHabitId,
      }));
    } catch { /* Storage dinonaktifkan. */ }
  }, [focusHabitId, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    try { window.localStorage.setItem("rutina.v2.garden-theme", gardenTheme); } catch { /* Storage dinonaktifkan. */ }
  }, [gardenTheme, preferencesReady]);
  const focusedHabit = habits.find((habit) => habit.id === focusHabitId && !habit.completed) ?? upcomingHabit;
  // v0.13 — cerita langkah mingguan: chip tren (↑2) + kalimat insight ber-bold.
  // Menggantikan pesan perbandingan polos yang datar.
  const weeklyStory = weeklyStepsStory({
    total: weekly.total,
    previousTotal: weekly.previousTotal,
    ready: weekly.ready,
  });
  const gardenMilestone = longestStreak >= 30 ? "Akar yang kuat · 30 hari" : longestStreak >= 7 ? "Tunas konsisten · 7 hari" : completed > 0 ? "Tunas pertamamu mulai tumbuh" : "Setiap taman dimulai dari satu benih";
  const weeklyMilestones = [
    { title: "Benih pertama", target: 1, hint: "1 langkah tercatat" },
    { title: "Akar mulai kuat", target: 7, hint: "7 langkah tercatat" },
    { title: "Taman berbunga", target: 15, hint: "15 langkah tercatat" },
  ];
  const unlockedMilestones = weeklyMilestones.filter((item) => weekly.total >= item.target).length;
  const weeklyMax = Math.max(1, ...weekly.days.map((day) => day.completed));
  // Subjudul PageIntro = sapaan emosional; hitungan mundur pindah ke hero
  // cerita (v0.12) supaya satu pesan = satu tempat, tanpa duplikasi.
  const dailyEncouragement = vacationMode
    ? "Hari ini kamu boleh mengambil jeda. Rutinitasmu tetap ada saat kamu siap kembali."
    : totalHabits === 0
      ? "Mulai dari satu hal sederhana yang ingin kamu rawat hari ini."
      : habits.length === 0
        ? "Tidak ada kebiasaan terjadwal hari ini. Gunakan ruang ini untuk hal lain yang penting bagimu."
        : completed === habits.length
          ? "Semua langkah terjadwal sudah kamu rawat. Sisakan ruang untuk menikmati harimu."
          : completed > 0
            ? "Kamu sudah melangkah hari ini — kebunmu mulai merespons 🌿"
            : "Tidak perlu menunggu sempurna. Satu langkah kecil sudah cukup untuk memulai.";
  // Hero = cerita hari ini yang berubah mengikuti data (bukan tagline statis).
  const heroStory = todayStory({ total: habits.length, completed, vacationMode });

  return (
    <div className={`botanical-dashboard-page garden-theme-${gardenTheme}`}>
      <PageIntro
        eyebrow={dateLabel}
        title={`${greeting}, Ananda! 🌱`}
        subtitle={dailyEncouragement}
        artwork="home"
      />
      {returning && !welcomeDismissed && !vacationMode && <section className="welcome-back-card" aria-label="Selamat datang kembali"><span className="welcome-back-art"><Sprout size={25} /></span><div className="welcome-back-copy"><span className="small-label">TAMANMU MENUNGGU</span><strong>Senang kamu kembali.</strong><p>Kita tidak perlu mengejar hari yang terlewat. Mulai lagi dari satu hal kecil yang terasa mudah.</p></div><button type="button" className="welcome-back-close" onClick={() => { setWelcomeDismissed(true); try { window.localStorage.setItem("rutina.v2.welcome-dismissed", todayISO()); window.localStorage.removeItem("rutina.v2.welcome-pending"); } catch { /* abaikan */ } }} aria-label="Tutup pesan selamat datang">×</button></section>}
      {vacationMode && <div className="vacation-banner" role="status"><strong>Mode libur aktif.</strong> Habit tidak bisa dicatat sampai mode libur diakhiri dari halaman Kebiasaan.</div>}

      {rhythm?.level === "shield" && (
        <section className="garden-rhythm-card shield" role="status" aria-live="polite">
          <span className="garden-rhythm-icon"><Shield size={20} /></span>
          <div className="garden-rhythm-copy">
            <span className="small-label">BUNGA PELINDUNG AKTIF</span>
            <strong>Bloom streak-mu tetap aman 🛡️</strong>
            <p>Kemarin sempat bolos, tapi ritme kebunmu kami jaga tetap hidup. Satu perisai tersedia setiap minggu — yang ini terpakai untuk pekan ini.</p>
            {rhythm.bloomStreak > 1 && <small>Bloom streak: {rhythm.bloomStreak} hari berjalan</small>}
          </div>
        </section>
      )}
      {rhythm?.level === "parched" && (
        <section className="garden-rhythm-card parched" role="status">
          <span className="garden-rhythm-icon"><Droplets size={20} /></span>
          <div className="garden-rhythm-copy">
            <span className="small-label">TAMANMU MENUNGGU</span>
            <strong>Daun-daunmu merindukan perhatian</strong>
            <p>Kemarin berlalu tanpa satu langkah kecil. Tidak apa-apa — satu habit ringan hari ini cukup untuk menghidupkannya kembali.</p>
          </div>
        </section>
      )}
      {rhythm?.level === "wilted" && (
        <section className="garden-rhythm-card wilted" role="status">
          <span className="garden-rhythm-icon"><Leaf size={20} /></span>
          <div className="garden-rhythm-copy">
            <span className="small-label">KEBUN MENGUNING</span>
            <strong>Kecambahmu menunggu disiram 🥀</strong>
            <p>Sudah beberapa hari tanpa langkah kecil. Mulai lagi dari habit paling ringan — satu langkah saja sudah cukup untuk mengembalikan warna hijaunya.</p>
          </div>
        </section>
      )}

      {storySlot}

      <section className="hero-card botanical-hero" aria-label="Ringkasan perkembangan hari ini">
        <BotanicalIllustrationBackdrop variant="home" />
        <div className="hero-copy">
          <div className="hero-kicker">{vacationMode ? "SAATNYA BERISTIRAHAT" : "KEBUN KECILMU"}</div>
          <h2 className="hero-title" data-tone={heroStory.tone}>
            <RichText text={heroStory.headline} />
          </h2>
          <p className="hero-description">{heroStory.note}</p>
          <button className="garden-journey-link" type="button" onClick={() => onNavigate("tree")}>Lihat perjalanan pohonmu <ArrowRight size={13} /></button>
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
            <div className="hero-progress-heading"><strong>Habit hari ini</strong></div>
            <p className="hero-progress-sentence" data-tone={heroStory.tone}>
              <RichText text={progressSentence(completed, habits.length)} />
            </p>
          </div>
        </div>
      </section>
      <section className="card next-step-card botanical-next-step" aria-label="Satu langkah kecil hari ini">
        <div className="next-step-label"><span className="next-step-dot" /> SATU LANGKAH HARI INI</div>
        {vacationMode ? (
          <>
            <h2>Hari ini, izinkan dirimu beristirahat.</h2>
            <p>Mode libur aktif. Tidak ada target yang perlu dikejar hari ini.</p>
          </>
        ) : focusedHabit ? (
          <>
            <label className="daily-focus-picker">FOKUS HARI INI<ThemedSelect value={focusedHabit.id} onChange={(value) => setFocusHabitId(value)} ariaLabel="Pilih fokus kebiasaan">{habits.filter((habit) => !habit.completed).map((habit) => <option key={habit.id} value={habit.id}>{habit.title}</option>)}</ThemedSelect></label>
            <div className="daily-intention-meta"><span>{focusedHabit.time}</span><span>{focusedHabit.duration} menit</span><span>{focusedHabit.category}</span></div>
            <h2>{focusedHabit.title}</h2>
            <p>Cukup fokus pada satu hal ini. Kamu tidak perlu memikirkan semuanya sekaligus.</p>
            <div className="daily-intention-actions">
              <button className="next-step-action" type="button" disabled={!onTimerToggle} onClick={() => onTimerToggle?.(focusedHabit.id)} aria-pressed={activeTimerId === focusedHabit.id}>
                {activeTimerId === focusedHabit.id ? <Pause size={15} /> : <Play size={15} />}
                {activeTimerId === focusedHabit.id ? "Hentikan timer habit" : "Mulai timer habit"}
              </button>
              <button className="daily-intention-complete" type="button" onClick={(event) => { if (!focusedHabit.completed) burstLeaves(event.currentTarget); onToggle(focusedHabit.id); }}>
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

      <div className="stats-grid botanical-stats botanical-stats-three">
        <StatCard label="Rekor konsistensi" value={`${animatedStreak} hari`} foot={streakStory(longestStreak)} icon={Flame} tone="amber" />
        <StatCard label="Kebiasaan aktif" value={String(totalHabits)} foot="Hal yang sedang kamu rawat" icon={Sprout} tone="green" />
        <StatCard label="Arus kas bersih" value={formatCompactRupiah(animatedNet)} foot="Bulan berjalan" icon={WalletCards} tone="orange" />
      </div>

      <section className="garden-personalize-row" aria-label="Personalisasi taman"><div><span className="small-label">SUASANA TAMANMU</span><strong>{gardenMilestone}</strong></div>{seedChip.total > 0 && <div className="garden-seed-chip" role="status" title="Koleksi benih dari perayaan bloom">🌱 <strong>{seedChip.total}</strong> benih{seedChip.langka > 0 ? ` · ${seedChip.langka} langka` : ""}{seedChip.legendaris > 0 ? ` · ${seedChip.legendaris} legendaris` : ""}</div>}<div className="garden-theme-options" role="group" aria-label="Pilih suasana taman"><button type="button" className={gardenTheme === "sage" ? "active" : ""} aria-pressed={gardenTheme === "sage"} onClick={() => setGardenTheme("sage")}><i className="sage" />Sage</button><button type="button" className={gardenTheme === "peach" ? "active" : ""} aria-pressed={gardenTheme === "peach"} onClick={() => setGardenTheme("peach")}><i className="peach" />Peach</button><button type="button" className={gardenTheme === "moss" ? "active" : ""} aria-pressed={gardenTheme === "moss"} onClick={() => setGardenTheme("moss")}><i className="moss" />Moss</button></div></section>

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
                <span
                  className={"weekly-comparison " + (weeklyStory.trend?.direction === "up" ? "positive" : weeklyStory.trend?.direction === "down" ? "negative" : "")}
                >
                  {weeklyStory.trend && (
                    <i className={"weekly-comparison-chip " + weeklyStory.trend.direction} aria-hidden="true">
                      {weeklyStory.trend.label}
                    </i>
                  )}
                  <RichText text={weeklyStory.message} />
                </span>
                <button className="weekly-add-action" type="button" onClick={onAddHabit}><Plus size={14} /> Tambah Kebiasaan</button>
              </div>
              <details className="weekly-milestones">
                <summary><span><Sprout size={14} /> Koleksi langkah minggu ini</span><small>{unlockedMilestones}/3 tercapai</small><ChevronDown size={14} /></summary>
                <div className="weekly-milestones-grid">
                  {weeklyMilestones.map((item) => {
                    const unlocked = weekly.total >= item.target;
                    return <div className={`weekly-milestone-item${unlocked ? " is-unlocked" : ""}`} key={item.title}>
                      <span className="weekly-milestone-icon"><Sprout size={15} /></span>
                      <span className="weekly-milestone-copy"><strong>{item.title}</strong><small>{item.hint}</small></span>
                      <span className="weekly-milestone-status">{unlocked ? "Tercapai" : "Berproses"}</span>
                    </div>;
                  })}
                </div>
              </details>
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
          <div className="finance-mini-value">{formatCompactRupiah(animatedNet)}</div>
          <div className="small-label">Arus kas bersih · bulan berjalan</div>
          <div className="finance-pair">
            <div className="finance-pair-item income"><span className="small-label">Pemasukan</span><strong>{formatCompactRupiah(income)}</strong></div>
            <div className="finance-pair-item expense"><span className="small-label">Pengeluaran</span><strong>{formatCompactRupiah(expense)}</strong></div>
          </div>
          <button className="text-button finance-mini-link" type="button" onClick={() => onNavigate("finance")}>Buka keuangan <ArrowRight size={13} /></button>
        </section>

        <section className="dashboard-support-bottom">
          {dailyCheckin ? (
            <section className="daily-checkin-mini">
              <span className="daily-checkin-icon"><HeartPulse size={17} /></span>
              <div><strong>Catatan dirimu hari ini</strong><span>Mood {dailyCheckin.mood}/5 · Tidur {dailyCheckin.sleepHours} jam</span></div>
            </section>
          ) : (
            <button className="daily-checkin-prompt" type="button" onClick={() => onNavigate("checkin")}>
              <span className="daily-checkin-icon"><HeartPulse size={17} /></span>
              <span className="daily-checkin-prompt-copy"><strong>Luangkan 30 detik untuk dirimu.</strong><small>Bagaimana mood, energi, dan istirahatmu hari ini?</small></span>
              <span className="daily-checkin-prompt-action">Check-in <ArrowRight size={13} /></span>
            </button>
          )}
          <FocusTimer remainingSeconds={focusTimerRemainingSeconds} running={focusTimerRunning} onToggle={onFocusTimerToggle} onReset={onFocusTimerReset} />
        </section>
      </div>
    </div>
  );
}
