"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, ChartLine, Cloud, CloudOff, Home, ListChecks, LoaderCircle,
  RefreshCw, Search, Sprout, WalletCards, Target, BriefcaseBusiness,
  HeartPulse, Dumbbell, ClipboardCheck, TreeDeciduous, Grid2X2, ChevronRight, Sun, Moon, Monitor,
} from "lucide-react";
import type { Habit, TabId, Transaction, TransactionCategory, TransactionType } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { summarizeTransactions } from "@/lib/finance";
import { useWorkspace } from "@/lib/use-workspace";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { HabitsView } from "@/features/habits/habits-view";
import { FinanceView } from "@/features/finance/finance-view";
import { CalendarView } from "@/features/calendar/calendar-view";
import { InsightsView } from "@/features/insights/insights-view";
import { EntryModal } from "@/components/ui/entry-modal";
import { SearchDialog } from "@/components/ui/search-dialog";
import { PwaInstallButton } from "@/components/pwa/install-button";
import { useModules } from "@/lib/use-modules";
import { ModulesView, FinanceExtrasPanel } from "@/features/modules/modules-view";

const navigation: { id: TabId; label: string; icon: typeof Home; description: string }[] = [
  { id: "home", label: "Beranda", icon: Home, description: "Ringkasan hari ini" },
  { id: "habits", label: "Kebiasaan", icon: ListChecks, description: "Atur ritme harian" },
  { id: "finance", label: "Keuangan", icon: WalletCards, description: "Kelola arus uang" },
  { id: "calendar", label: "Kalender", icon: CalendarDays, description: "Lihat jadwal" },
  { id: "insights", label: "Insight", icon: ChartLine, description: "Pahami progres" },
  { id: "goals", label: "Tujuan", icon: Target, description: "Goals dan milestones" },
  { id: "checkin", label: "Check-in", icon: ClipboardCheck, description: "Mood, energi, dan jurnal" },
  { id: "work", label: "Meja Kerja", icon: BriefcaseBusiness, description: "Task board, catatan, rutinitas" },
  { id: "wellness", label: "Wellness", icon: HeartPulse, description: "Air, protein, dan berat badan" },
  { id: "training", label: "Latihan", icon: Dumbbell, description: "Workout, program, dan kardio" },
  { id: "tree", label: "Pohon", icon: TreeDeciduous, description: "Level dan perjalanan progres" },
];
const mobilePrimary = navigation.filter((item) => ["home", "habits", "finance", "calendar"].includes(item.id));
const mobileMore = navigation.filter((item) => !mobilePrimary.some((primary) => primary.id === item.id));

type SyncStatus = "local" | "syncing" | "synced" | "error";

export function RutinaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [modal, setModal] = useState<"habit" | "transaction" | null>(null);
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeHabitTimer, setActiveHabitTimer] = useState<{ habitId: string; startedAt: number } | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const {
    habits,
    transactions,
    budgets,
    syncStatus,
    updateHabits,
    updateTransactions,
    refreshWorkspace,
    isReady: workspaceReady,
  } = useWorkspace();
  const { modules, updateModule, ready: modulesReady } = useModules();
  const selectedTheme = modules.settings.theme;
  const themeLabel = selectedTheme === "system" ? "Sistem" : selectedTheme === "dark" ? "Gelap" : "Terang";

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = selectedTheme === "system" ? (media.matches ? "dark" : "light") : selectedTheme;
      document.documentElement.dataset.theme = resolved;
    };
    applyTheme();
    if (selectedTheme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [selectedTheme]);

  useEffect(() => {
    let frame = 0;
    try {
      const saved = window.localStorage.getItem("rutina.v2.active-habit-timer");
      if (!saved) return;
      const timer = JSON.parse(saved) as { habitId?: unknown; startedAt?: unknown };
      if (typeof timer.habitId === "string" && typeof timer.startedAt === "number" && Date.now() - timer.startedAt >= 0 && Date.now() - timer.startedAt < 4 * 60 * 60 * 1000) {
        frame = window.requestAnimationFrame(() => setActiveHabitTimer({ habitId: timer.habitId as string, startedAt: timer.startedAt as number }));
      } else window.localStorage.removeItem("rutina.v2.active-habit-timer");
    } catch { window.localStorage.removeItem("rutina.v2.active-habit-timer"); }
    return () => { if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!activeHabitTimer) return;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeHabitTimer]);

  useEffect(() => {
    if (!workspaceReady || !activeHabitTimer || habits.some((habit) => habit.id === activeHabitTimer.habitId)) return;
    const frame = window.requestAnimationFrame(() => setActiveHabitTimer(null));
    window.localStorage.removeItem("rutina.v2.active-habit-timer");
    return () => window.cancelAnimationFrame(frame);
  }, [workspaceReady, habits, activeHabitTimer]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const todayKey = todayISO();
  const todayHabits = useMemo(() => habits.filter((habit) => isScheduledOn(habit.schedule, todayKey)), [habits, todayKey]);
  const currentMonth = todayKey.slice(0, 7);
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === currentMonth),
    [transactions, currentMonth],
  );
  const { income, expense } = useMemo(
    () => summarizeTransactions(monthTransactions),
    [monthTransactions],
  );

  const syncPresentation: Record<SyncStatus, { label: string; detail: string; className: string }> = {
    synced: { label: "Tersinkron", detail: "Perubahan tersimpan di Turso", className: "is-synced" },
    syncing: { label: "Menyinkronkan", detail: "Sedang menyimpan perubahan", className: "is-syncing" },
    error: { label: "Belum tersinkron", detail: "Tekan untuk mencoba sinkronisasi ulang", className: "is-error" },
    local: { label: "Mode lokal", detail: "Data sementara tersimpan di browser", className: "is-local" },
  };
  const sync = syncPresentation[syncStatus as SyncStatus];

  function toggleHabit(id: string) {
    if (modules.settings.vacationMode) return;
    updateHabits((current) => current.map((habit) => habit.id === id ? { ...habit, completed: !habit.completed } : habit));
  }

  function adjustHabit(id: string, delta: number) {
    if (modules.settings.vacationMode) return;
    updateHabits((current) => current.map((habit) => {
      if (habit.id !== id || habit.kind !== "amount") return habit;
      const currentAmount = Math.max(0, (habit.currentAmount ?? 0) + delta);
      return { ...habit, currentAmount, completed: currentAmount >= (habit.targetAmount ?? 1) };
    }));
  }

  function toggleHabitTimer(id: string) {
    if (modules.settings.vacationMode) return;
    if (activeHabitTimer) {
      const elapsed = Math.max(0, Math.floor((Date.now() - activeHabitTimer.startedAt) / 1000));
      const minutes = Math.floor(elapsed / 60);
      if (minutes > 0) updateHabits((current) => current.map((habit) => habit.id === activeHabitTimer.habitId ? { ...habit, timeSpentMinutes: (habit.timeSpentMinutes ?? 0) + minutes } : habit));
      setActiveHabitTimer(null);
      window.localStorage.removeItem("rutina.v2.active-habit-timer");
      if (activeHabitTimer.habitId === id) return;
    }
    const next = { habitId: id, startedAt: Date.now() };
    setActiveHabitTimer(next);
    window.localStorage.setItem("rutina.v2.active-habit-timer", JSON.stringify(next));
  }

  function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;

    const category = String(data.get("category") ?? "Personal") as Habit["category"];
    const habit: Habit = {
      id: crypto.randomUUID(),
      title,
      category,
      time: String(data.get("time") ?? "07:00"),
      duration: Math.max(1, Number(data.get("duration")) || 15),
      completed: false,
      icon: category === "Health" ? "movement" : category === "Learning" ? "book" : category === "Mindfulness" ? "mind" : "write",
      streak: 0,
      kind: String(data.get("kind") || "normal") as Habit["kind"],
      targetAmount: Math.max(1, Number(data.get("targetAmount")) || 8),
      currentAmount: 0,
      unit: String(data.get("unit") || "unit").trim().slice(0, 30),
      priority: String(data.get("priority") || "medium") as Habit["priority"],
      difficulty: String(data.get("difficulty") || "easy") as Habit["difficulty"],
      groupName: String(data.get("groupName") || "").trim().slice(0, 60),
      timeSpentMinutes: 0,
    };

    updateHabits((current) => [...current, habit]);
    setModal(null);
    setToast("Kebiasaan baru berhasil ditambahkan.");
  }

  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Math.round(Number(data.get("amount")));
    const title = String(data.get("title") ?? "").trim();
    if (!title || !Number.isFinite(amount) || amount <= 0) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      title,
      type: String(data.get("type")) as TransactionType,
      category: (modules.finance.categoryRules.find((rule) => title.toLocaleLowerCase("id-ID").includes(rule.keyword.toLocaleLowerCase("id-ID")))?.category ?? String(data.get("category"))) as TransactionCategory,
      amount,
      date: String(data.get("date") || todayISO()),
      ...(String(data.get("walletId") || "") ? { walletId: String(data.get("walletId")) } : {}),
      ...(String(data.get("tags") || "").trim() ? { tags: String(data.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) } : {}),
    };

    updateTransactions((current) => [transaction, ...current]);
    setModal(null);
    setToast("Transaksi berhasil dicatat.");
  }

  if (!workspaceReady || !modulesReady) {
    return (
      <main className="workspace-loading" role="status" aria-live="polite">
        <div className="workspace-loading-brand"><span className="brand-mark"><Sprout size={22} /></span><strong>rutina<span>.</span></strong></div>
        <span className="workspace-loading-spinner" aria-hidden="true" />
        <p>Menyiapkan ruang pribadimu…</p>
        <small>Menghubungkan data dan memuat aktivitas</small>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <a className="brand" href="#beranda" onClick={(event) => { event.preventDefault(); setActiveTab("home"); }} aria-label="Rutina, kembali ke beranda">
          <span className="brand-mark"><Sprout size={22} strokeWidth={1.9} /></span>
          <span className="brand-copy"><span className="brand-name">rutina<span>.</span></span><span className="brand-sub">grow at your pace</span></span>
        </a>

        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              type="button"
              className={`nav-link ${activeTab === id ? "active" : ""}`}
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => setActiveTab(id)}
            >
              <span className="nav-link-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="nav-link-copy"><strong>{label}</strong><small>{description}</small></span>
              {activeTab === id && <span className="nav-active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-growth">
          <span className="sidebar-growth-icon"><Sprout size={17} /></span>
          <p>Hal besar tumbuh dari langkah kecil.</p>
          <span>ONE DAY AT A TIME</span>
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className={`sync-card ${sync.className}`}
            onClick={() => void refreshWorkspace()}
            aria-label={`Status sinkronisasi: ${sync.label}. Tekan untuk menyegarkan.`}
            title={sync.detail}
          >
            <span className="sync-card-icon">
              {syncStatus === "syncing" ? <LoaderCircle size={17} className="spin" /> : syncStatus === "error" || syncStatus === "local" ? <CloudOff size={17} /> : <Cloud size={17} />}
            </span>
            <span className="sync-card-copy"><strong>{sync.label}</strong><small>{sync.detail}</small></span>
            <RefreshCw size={14} className="sync-refresh" />
          </button>
          <div className="profile-row">
            <div className="avatar">R</div>
            <div><div className="profile-name">Ruang pribadimu</div><div className="profile-caption">Personal workspace</div></div>
          </div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><Sprout size={18} /></span>
            <span>rutina<span>.</span></span>
          </div>
          <div className="topbar-context">
            <span className="topbar-context-dot" />
            <span>Ruang pribadi</span>
            <span className="topbar-context-divider">/</span>
            <strong>{navigation.find((item) => item.id === activeTab)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Cari di Rutina">
              <Search size={16} /><span>Cari sesuatu…</span><kbd>Ctrl / ⌘ K</kbd>
            </button>
            <button
              type="button"
              className={`mobile-sync-button ${sync.className}`}
              onClick={() => void refreshWorkspace()}
              title={sync.detail}
              aria-label={`Status sinkronisasi: ${sync.label}. Tekan untuk menyegarkan.`}
            >
              {syncStatus === "syncing" ? <LoaderCircle size={17} className="spin" /> : syncStatus === "error" || syncStatus === "local" ? <CloudOff size={17} /> : <Cloud size={17} />}
            </button>
            <button type="button" className="theme-toggle" onClick={() => updateModule("settings", (current) => ({ ...current, theme: current.theme === "light" ? "dark" : current.theme === "dark" ? "system" : "light" }))} aria-label={`Tema: ${themeLabel}. Ganti tema.`} title={`Tema: ${themeLabel}`}>
              {selectedTheme === "system" ? <Monitor size={16} /> : selectedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{themeLabel}</span>
            </button>
            <PwaInstallButton />
            <div className="avatar topbar-avatar" aria-label="Workspace pribadi">R</div>
          </div>
        </header>

        <div className="content-wrap page-transition" key={activeTab}>
          {activeTab === "home" && <DashboardView habits={todayHabits} income={income} expense={expense} onNavigate={setActiveTab} onToggle={toggleHabit} onAdjust={adjustHabit} onTimerToggle={toggleHabitTimer} activeTimerId={activeHabitTimer?.habitId ?? null} timerElapsedSeconds={activeHabitTimer ? Math.max(0, Math.floor((timerNow - activeHabitTimer.startedAt) / 1000)) : 0} onAddHabit={() => setModal("habit")} vacationMode={modules.settings.vacationMode} dailyCheckin={modules.checkins.find((item) => item.date === todayISO())} />}
          {activeTab === "habits" && <HabitsView habits={habits} onToggle={toggleHabit} onAdjust={adjustHabit} onTimerToggle={toggleHabitTimer} activeTimerId={activeHabitTimer?.habitId ?? null} timerElapsedSeconds={activeHabitTimer ? Math.max(0, Math.floor((timerNow - activeHabitTimer.startedAt) / 1000)) : 0} onReorder={updateHabits} onAdd={() => setModal("habit")} vacationMode={modules.settings.vacationMode} onToggleVacation={() => updateModule("settings", (current) => ({ ...current, vacationMode: !current.vacationMode }))} />}
          {activeTab === "finance" && <><FinanceView transactions={monthTransactions} budgets={budgets} income={income} expense={expense} onAdd={() => setModal("transaction")} /><FinanceExtrasPanel modules={modules} updateModule={updateModule} transactions={transactions} onAddTransactions={(items) => updateTransactions((current) => [...items, ...current])} /></>}
          {activeTab === "calendar" && <CalendarView habits={habits} />}
          {activeTab === "insights" && <InsightsView habits={habits} income={income} expense={expense} checkins={modules.checkins} />}
          {(activeTab === "goals" || activeTab === "checkin" || activeTab === "work" || activeTab === "wellness" || activeTab === "training" || activeTab === "tree") && <ModulesView tab={activeTab} modules={modules} updateModule={updateModule} />}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama mobile">
        {mobilePrimary.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? "active" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className={moreOpen ? "active" : ""} aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><Grid2X2 size={19} /><span>Lainnya</span></button>
      </nav>
      {moreOpen && <div className="mobile-more-menu" role="menu" aria-label="Modul lainnya">{mobileMore.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="menuitem" onClick={() => { setActiveTab(id); setMoreOpen(false); }}><Icon size={17} /><span>{label}</span><ChevronRight size={14} /></button>)}</div>}

      {modal && <EntryModal mode={modal} onClose={() => setModal(null)} onSubmit={modal === "habit" ? submitHabit : submitTransaction} wallets={modules.finance.wallets} />}
      <SearchDialog
        open={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        habits={habits}
        transactions={transactions}
        onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
        onNavigate={(tab) => setActiveTab(tab)}
      />
      {toast && <div role="status" aria-live="polite" className="toast"><span className="toast-dot" />{toast}</div>}
    </div>
  );
}
