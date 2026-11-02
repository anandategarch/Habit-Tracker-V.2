"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bell, Cloud, CloudOff, LoaderCircle, RefreshCw, Search, Grid2X2, ChevronRight, X, Plus, Sun, Moon, Monitor,
} from "lucide-react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { RutinaMark } from "@/components/ui/rutina-mark";
import type { Habit, TabId, Transaction, TransactionCategory, TransactionType } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { isScheduledOn, parseNumberList } from "@/lib/habit-schedule";
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

const navigation: { id: TabId; label: string; icon: AppIconName; description: string }[] = [
  { id: "home", label: "Beranda", icon: "home", description: "Ringkasan hari ini" },
  { id: "habits", label: "Kebiasaan", icon: "habits", description: "Atur ritme harian" },
  { id: "finance", label: "Keuangan", icon: "finance", description: "Kelola arus uang" },
  { id: "calendar", label: "Kalender", icon: "calendar", description: "Lihat jadwal" },
  { id: "insights", label: "Insight", icon: "insights", description: "Pahami progres" },
  { id: "goals", label: "Tujuan", icon: "goals", description: "Goals dan milestones" },
  { id: "checkin", label: "Check-in", icon: "checkin", description: "Mood, energi, dan jurnal" },
  { id: "work", label: "Meja Kerja", icon: "work", description: "Task board, catatan, rutinitas" },
  { id: "wellness", label: "Wellness", icon: "wellness", description: "Air, protein, dan berat badan" },
  { id: "training", label: "Latihan", icon: "training", description: "Workout, program, dan kardio" },
  { id: "tree", label: "Pohon", icon: "growth", description: "Level dan perjalanan progres" },
  { id: "settings", label: "Pengaturan", icon: "settings", description: "Backup dan preferensi data" },
];
const mobilePrimary = navigation.filter((item) => ["home", "habits", "finance", "calendar"].includes(item.id));
const navigationGroups: { label: string; ids: TabId[] }[] = [
  { label: "Overview", ids: ["home", "habits", "calendar"] },
  { label: "Money & Insight", ids: ["finance", "insights"] },
  { label: "Growth", ids: ["goals", "checkin", "tree"] },
  { label: "Lifestyle", ids: ["wellness", "training"] },
  { label: "Workspace", ids: ["work"] },
  { label: "System", ids: ["settings"] },
];

const desktopNavigationGroups: { label: string; ids: TabId[] }[] = [
  { label: "MENU UTAMA", ids: ["home", "habits", "finance", "calendar", "insights"] },
  { label: "RUANG PERSONAL", ids: ["goals", "checkin", "work", "wellness", "training", "tree"] },
  { label: "PREFERENSI", ids: ["settings"] },
];

type SyncStatus = "local" | "syncing" | "synced" | "error";

export function RutinaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [modal, setModal] = useState<"habit" | "transaction" | null>(null);
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
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
        setMoreOpen(false);
        setQuickActionOpen(false);
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
  const pendingHabitCount = todayHabits.filter((habit) => !habit.completed).length;

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

    const scheduleKind = String(data.get("scheduleKind") || "daily");
    let schedule: Habit["schedule"] = { kind: "daily" };
    if (scheduleKind === "weekly") {
      const days = parseNumberList(String(data.get("scheduleDays") || ""), 0, 6);
      if (!days.length) { setToast("Pilih minimal satu hari untuk jadwal mingguan."); return; }
      schedule = { kind: "weekly", days };
    } else if (scheduleKind === "monthly") {
      const dates = parseNumberList(String(data.get("scheduleDates") || ""), 1, 31);
      if (!dates.length) { setToast("Pilih minimal satu tanggal untuk jadwal bulanan."); return; }
      schedule = { kind: "monthly", dates };
    }

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
      schedule,
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
      ...(String(data.get("tags") || "").trim() ? { tags: String(data.get("tags")).split(",").map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20) } : {}),
    };

    updateTransactions((current) => [transaction, ...current]);
    setModal(null);
    setToast("Transaksi berhasil dicatat.");
  }

  if (!workspaceReady || !modulesReady) {
    return (
      <main className="workspace-loading" role="status" aria-live="polite">
        <div className="workspace-loading-brand"><span className="brand-mark"><RutinaMark size={25} /></span><strong>Rutina<span>.</span></strong></div>
        <span className="workspace-loading-spinner" aria-hidden="true" />
        <p>Menyiapkan ruang pribadimu…</p>
        <small>Menghubungkan data dan memuat aktivitas</small>
      </main>
    );
  }

  return (
    <div className="app-shell" data-active-tab={activeTab}>
      <aside className="desktop-sidebar" aria-label="Navigasi Rutina">
        <a className="brand" href="#beranda" onClick={(event) => { event.preventDefault(); setActiveTab("home"); setMoreOpen(false); }} aria-label="Rutina, kembali ke beranda">
          <span className="brand-mark"><RutinaMark size={27} /></span>
          <span className="brand-copy"><span className="brand-name">Rutina</span><span className="brand-sub">grow at your pace</span></span>
        </a>

        <nav className="desktop-expanded-nav" aria-label="Navigasi utama">
          {desktopNavigationGroups.map(({ label, ids }) => (
            <section className="desktop-nav-group" key={label}>
              <div className="desktop-nav-label">{label}</div>
              {ids.map((id) => {
                const item = navigation.find((entry) => entry.id === id);
                if (!item) return null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`desktop-nav-link ${activeTab === item.id ? "active" : ""}`}
                    aria-current={activeTab === item.id ? "page" : undefined}
                    onClick={() => { setActiveTab(item.id); setMoreOpen(false); }}
                  >
                    <AppIcon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <nav className="rail-primary-nav" aria-label="Akses cepat">
          {mobilePrimary.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className={`rail-link ${activeTab === id ? "active" : ""}`}
              aria-label={label}
              aria-current={activeTab === id ? "page" : undefined}
              title={label}
              onClick={() => { setActiveTab(id); setMoreOpen(false); }}
            >
              <AppIcon name={icon} size={21} />
              <span className="rail-tooltip">{label}</span>
            </button>
          ))}
        </nav>

        <div className="rail-spacer" />
        <button
          type="button"
          className={`rail-menu-toggle ${moreOpen ? "active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="workspace-menu"
          aria-label={moreOpen ? "Tutup menu navigasi" : "Buka semua menu"}
          onClick={() => setMoreOpen((value) => !value)}
        >
          {moreOpen ? <X size={20} /> : <Grid2X2 size={20} />}
          <span>Menu</span>
        </button>
        <button
          type="button"
          className={`rail-sync-button ${sync.className}`}
          onClick={() => void refreshWorkspace()}
          aria-label={`Status sinkronisasi: ${sync.label}. Tekan untuk menyegarkan.`}
          title={sync.detail}
        >
          {syncStatus === "syncing" ? <LoaderCircle size={18} className="spin" /> : syncStatus === "error" || syncStatus === "local" ? <CloudOff size={18} /> : <Cloud size={18} />}
          <span className="rail-sync-indicator" />
        </button>

        <div id="workspace-menu" className={`workspace-menu-panel ${moreOpen ? "is-open" : ""}`} aria-hidden={!moreOpen}>
          <div className="menu-panel-header">
            <div>
              <span className="menu-panel-kicker">YOUR SPACE</span>
              <strong>Workspace</strong>
              <small>Semua area Rutina, satu tempat.</small>
            </div>
            <button type="button" className="menu-panel-close" onClick={() => setMoreOpen(false)} aria-label="Tutup menu"><X size={17} /></button>
          </div>
          <div className="menu-panel-content">
            {navigationGroups.map(({ label: groupLabel, ids }) => (
              <section className="menu-group" key={groupLabel}>
                <div className="menu-group-label">{groupLabel}</div>
                <div className="menu-group-list">
                  {ids.map((id) => {
                    const item = navigation.find((entry) => entry.id === id);
                    if (!item) return null;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`menu-item ${activeTab === item.id ? "active" : ""}`}
                        data-module={item.id}
                        aria-current={activeTab === item.id ? "page" : undefined}
                        onClick={() => { setActiveTab(item.id); setMoreOpen(false); }}
                      >
                        <span className="menu-item-icon"><AppIcon name={item.icon} size={18} /></span>
                        <span className="menu-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                        {activeTab === item.id && <span className="menu-item-current" />}
                        <ChevronRight size={14} className="menu-item-arrow" />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="menu-panel-footer">
            <div className="sidebar-growth">
              <span className="sidebar-growth-icon"><AppIcon name="growth" size={16} /></span>
              <p>Hal besar tumbuh dari langkah kecil.</p>
              <span>ONE DAY AT A TIME</span>
            </div>
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
        </div>
        <div className="desktop-sidebar-footer">
          <div className="desktop-sidebar-note">
            <span className="desktop-sidebar-note-icon"><AppIcon name="growth" size={17} /></span>
            <p>Langkah kecil hari ini, membawa perubahan besar esok.</p>
          </div>
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
      {moreOpen && <button type="button" className="workspace-menu-scrim" aria-label="Tutup menu navigasi" onClick={() => setMoreOpen(false)} />}

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><RutinaMark size={22} /></span>
            <span>Rutina</span>
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
            <button
              type="button"
              className="topbar-bell"
              onClick={() => { setActiveTab("habits"); setMoreOpen(false); setQuickActionOpen(false); }}
              aria-label={pendingHabitCount > 0 ? `${pendingHabitCount} kebiasaan belum selesai hari ini. Buka halaman kebiasaan.` : "Semua kebiasaan hari ini sudah selesai. Buka halaman kebiasaan."}
              title={pendingHabitCount > 0 ? `${pendingHabitCount} kebiasaan menunggu` : "Tidak ada kebiasaan tertunda"}
            >
              <Bell size={17} />
              {pendingHabitCount > 0 && <span className="topbar-bell-badge" aria-hidden="true">{pendingHabitCount > 9 ? "9+" : pendingHabitCount}</span>}
            </button>
            <div className="avatar topbar-avatar" aria-label="Workspace pribadi">R</div>
          </div>
        </header>

        <div className="content-wrap page-transition" key={activeTab}>
          {activeTab === "home" && <DashboardView habits={todayHabits} totalHabits={habits.length} income={income} expense={expense} onNavigate={setActiveTab} onToggle={toggleHabit} onAdjust={adjustHabit} onTimerToggle={toggleHabitTimer} activeTimerId={activeHabitTimer?.habitId ?? null} timerElapsedSeconds={activeHabitTimer ? Math.max(0, Math.floor((timerNow - activeHabitTimer.startedAt) / 1000)) : 0} onAddHabit={() => setModal("habit")} onAddTransaction={() => setModal("transaction")} onOpenFeatures={() => { setQuickActionOpen(false); setMoreOpen(true); }} vacationMode={modules.settings.vacationMode} dailyCheckin={modules.checkins.find((item) => item.date === todayISO())} />}
          {activeTab === "habits" && <HabitsView habits={habits} onToggle={toggleHabit} onAdjust={adjustHabit} onTimerToggle={toggleHabitTimer} activeTimerId={activeHabitTimer?.habitId ?? null} timerElapsedSeconds={activeHabitTimer ? Math.max(0, Math.floor((timerNow - activeHabitTimer.startedAt) / 1000)) : 0} onReorder={updateHabits} onAdd={() => setModal("habit")} vacationMode={modules.settings.vacationMode} onToggleVacation={() => updateModule("settings", (current) => ({ ...current, vacationMode: !current.vacationMode }))} groups={modules.habitGroups} onCreateGroup={(name, color) => updateModule("habitGroups", (current) => [...current, { id: crypto.randomUUID(), name, color }])} onDeleteGroup={(groupId) => { const group = modules.habitGroups.find((item) => item.id === groupId); updateModule("habitGroups", (current) => current.filter((item) => item.id !== groupId)); if (group) updateHabits((current) => current.map((habit) => habit.groupName === group.name ? { ...habit, groupName: "" } : habit)); }} />}
          {activeTab === "finance" && <><FinanceView transactions={monthTransactions} budgets={budgets} income={income} expense={expense} onAdd={() => setModal("transaction")} /><FinanceExtrasPanel modules={modules} updateModule={updateModule} transactions={transactions} onAddTransactions={(items) => updateTransactions((current) => [...items, ...current])} /></>}
          {activeTab === "calendar" && <CalendarView habits={habits} />}
          {activeTab === "insights" && <InsightsView habits={habits} income={income} expense={expense} checkins={modules.checkins} />}
          {(activeTab === "goals" || activeTab === "checkin" || activeTab === "work" || activeTab === "wellness" || activeTab === "training" || activeTab === "tree" || activeTab === "settings") && <ModulesView tab={activeTab} modules={modules} updateModule={updateModule} />}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama mobile">
        {mobilePrimary.slice(0, 2).map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? "active" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => { setActiveTab(id); setMoreOpen(false); setQuickActionOpen(false); }}
          >
            <AppIcon name={icon} size={19} />
            <span>{label}</span>
          </button>
        ))}

        <div className={`bottom-nav-action-wrap ${quickActionOpen ? "is-open" : ""}`}>
          <div id="mobile-quick-actions" className="mobile-quick-actions" role="group" aria-label="Aksi cepat" hidden={!quickActionOpen}>
            <div className="mobile-quick-actions-heading">MULAI SESUATU</div>
            <button
              type="button"
              className="mobile-quick-action"
              onClick={() => { setQuickActionOpen(false); setModal("habit"); }}
            >
              <span className="mobile-quick-action-icon habit"><AppIcon name="habits" size={18} /></span>
              <span className="mobile-quick-action-copy"><strong>Tambah kebiasaan</strong><small>Buat rutinitas baru</small></span>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="mobile-quick-action"
              onClick={() => { setQuickActionOpen(false); setModal("transaction"); }}
            >
              <span className="mobile-quick-action-icon finance"><AppIcon name="finance" size={18} /></span>
              <span className="mobile-quick-action-copy"><strong>Catat transaksi</strong><small>Tambah pemasukan atau pengeluaran</small></span>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="mobile-quick-action"
              onClick={() => { setQuickActionOpen(false); setMoreOpen(true); }}
            >
              <span className="mobile-quick-action-icon browse"><Grid2X2 size={18} /></span>
              <span className="mobile-quick-action-copy"><strong>Semua fitur</strong><small>Jelajahi seluruh ruang Rutina</small></span>
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            className={`bottom-nav-action ${quickActionOpen ? "active" : ""}`}
            aria-label={quickActionOpen ? "Tutup aksi cepat" : "Buka aksi cepat"}
            aria-expanded={quickActionOpen}
            aria-controls="mobile-quick-actions"
            onClick={() => { setMoreOpen(false); setQuickActionOpen((value) => !value); }}
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
          <span className="bottom-nav-action-label">{quickActionOpen ? "Tutup" : "Tambah"}</span>
        </div>

        {mobilePrimary.slice(2).map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? "active" : ""}
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => { setActiveTab(id); setMoreOpen(false); setQuickActionOpen(false); }}
          >
            <AppIcon name={icon} size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {moreOpen && <div id="mobile-workspace-menu" className="mobile-more-menu workspace-menu-sheet" role="dialog" aria-modal="true" aria-label="Semua menu Rutina">
        <div className="menu-panel-header">
          <div><span className="menu-panel-kicker">YOUR SPACE</span><strong>Jelajahi Rutina</strong><small>Pilih area yang ingin kamu buka.</small></div>
          <button type="button" className="menu-panel-close" onClick={() => setMoreOpen(false)} aria-label="Tutup menu"><X size={17} /></button>
        </div>
        <div className="menu-panel-content">
          {navigationGroups.map(({ label: groupLabel, ids }) => (
            <section className="menu-group" key={groupLabel}>
              <div className="menu-group-label">{groupLabel}</div>
              <div className="menu-group-list">
                {ids.map((id) => {
                  const item = navigation.find((entry) => entry.id === id);
                  if (!item) return null;
                  return <button key={item.id} type="button" role="menuitem" className={`menu-item ${activeTab === item.id ? "active" : ""}`} data-module={item.id} aria-current={activeTab === item.id ? "page" : undefined} onClick={() => { setActiveTab(item.id); setMoreOpen(false); }}>
                    <span className="menu-item-icon"><AppIcon name={item.icon} size={18} /></span>
                    <span className="menu-item-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                    {activeTab === item.id && <span className="menu-item-current" />}
                    <ChevronRight size={14} className="menu-item-arrow" />
                  </button>;
                })}
              </div>
            </section>
          ))}
        </div>
      </div>}

      {modal && <EntryModal mode={modal} onClose={() => setModal(null)} onSubmit={modal === "habit" ? submitHabit : submitTransaction} wallets={modules.finance.wallets} groups={modules.habitGroups} />}
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
