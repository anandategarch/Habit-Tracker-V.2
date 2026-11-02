"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, ChartLine, Cloud, CloudOff, Home,
  ListChecks, LoaderCircle, RefreshCw, Search, Sprout, WalletCards,
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

const navigation: { id: TabId; label: string; icon: typeof Home; description: string }[] = [
  { id: "home", label: "Beranda", icon: Home, description: "Ringkasan hari ini" },
  { id: "habits", label: "Kebiasaan", icon: ListChecks, description: "Atur ritme harian" },
  { id: "finance", label: "Keuangan", icon: WalletCards, description: "Kelola arus uang" },
  { id: "calendar", label: "Kalender", icon: CalendarDays, description: "Lihat jadwal" },
  { id: "insights", label: "Insight", icon: ChartLine, description: "Pahami progres" },
];

type SyncStatus = "local" | "syncing" | "synced" | "error";

export function RutinaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [modal, setModal] = useState<"habit" | "transaction" | null>(null);
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const currentMonth = todayISO().slice(0, 7);
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
    updateHabits((current) => current.map((habit) => habit.id === id
      ? { ...habit, completed: !habit.completed }
      : habit));
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
      category: String(data.get("category")) as TransactionCategory,
      amount,
      date: String(data.get("date") || todayISO()),
    };

    updateTransactions((current) => [transaction, ...current]);
    setModal(null);
    setToast("Transaksi berhasil dicatat.");
  }

  if (!workspaceReady) {
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
              <Search size={16} /><span>Cari sesuatu…</span><kbd>⌘ K</kbd>
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
            <PwaInstallButton />
            <div className="avatar topbar-avatar" aria-label="Workspace pribadi">R</div>
          </div>
        </header>

        <div className="content-wrap page-transition" key={activeTab}>
          {activeTab === "home" && <DashboardView habits={habits} income={income} expense={expense} onNavigate={setActiveTab} onToggle={toggleHabit} onAddHabit={() => setModal("habit")} />}
          {activeTab === "habits" && <HabitsView habits={habits} onToggle={toggleHabit} onAdd={() => setModal("habit")} />}
          {activeTab === "finance" && <FinanceView transactions={monthTransactions} budgets={budgets} income={income} expense={expense} onAdd={() => setModal("transaction")} />}
          {activeTab === "calendar" && <CalendarView habits={habits} />}
          {activeTab === "insights" && <InsightsView habits={habits} income={income} expense={expense} />}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama mobile">
        {navigation.map(({ id, label, icon: Icon }) => (
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
      </nav>

      {modal && <EntryModal mode={modal} onClose={() => setModal(null)} onSubmit={modal === "habit" ? submitHabit : submitTransaction} />}
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
