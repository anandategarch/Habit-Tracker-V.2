"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, ChartLine, Home, ListChecks, MoreHorizontal, Search,
  Sprout, WalletCards,
} from "lucide-react";
import type { Habit, TabId, Transaction, TransactionCategory, TransactionType } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { initialBudgets } from "@/lib/seed-data";
import { summarizeTransactions } from "@/lib/finance";
import { useWorkspace } from "@/lib/use-workspace";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { HabitsView } from "@/features/habits/habits-view";
import { FinanceView } from "@/features/finance/finance-view";
import { CalendarView } from "@/features/calendar/calendar-view";
import { InsightsView } from "@/features/insights/insights-view";
import { IconAction } from "@/components/ui/primitives";
import { EntryModal } from "@/components/ui/entry-modal";
import { SearchDialog } from "@/components/ui/search-dialog";

const navigation: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "habits", label: "Habit", icon: ListChecks },
  { id: "finance", label: "Uang", icon: WalletCards },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "insights", label: "Insight", icon: ChartLine },
];

export function RutinaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [modal, setModal] = useState<"habit" | "transaction" | null>(null);
  const [toast, setToast] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { habits, transactions, updateHabits, updateTransactions } = useWorkspace();
  const budgets = initialBudgets;

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
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

  function toggleHabit(id: string) {
    updateHabits((current) => current.map((habit) => habit.id === id ? { ...habit, completed: !habit.completed } : habit));
  }

  function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const category = String(data.get("category") ?? "Personal") as Habit["category"];
    const habit: Habit = {
      id: crypto.randomUUID(), title, category,
      time: String(data.get("time") ?? "07:00"),
      duration: Math.max(1, Number(data.get("duration")) || 15),
      completed: false, icon: category === "Health" ? "movement" : category === "Learning" ? "book" : category === "Mindfulness" ? "mind" : "write",
      streak: 0,
    };
    updateHabits((current) => [...current, habit]);
    setModal(null);
    setToast("Habit baru berhasil ditambahkan.");
  }

  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Math.round(Number(data.get("amount")));
    const title = String(data.get("title") ?? "").trim();
    if (!title || !Number.isFinite(amount) || amount <= 0) return;
    const transaction: Transaction = {
      id: crypto.randomUUID(), title,
      type: String(data.get("type")) as TransactionType,
      category: String(data.get("category")) as TransactionCategory,
      amount, date: String(data.get("date") || todayISO()),
    };
    updateTransactions((current) => [transaction, ...current]);
    setModal(null);
    setToast("Transaksi berhasil dicatat.");
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="brand"><span className="brand-mark"><Sprout size={21} /></span><div><div className="brand-name">rutina.</div><div className="brand-sub">grow at your pace</div></div></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}><Icon size={17} strokeWidth={1.8} />{label}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="profile-row"><div className="avatar">R</div><div><div className="profile-name">Ruang pribadimu</div><div className="profile-caption">Data tersimpan di perangkat</div></div><MoreHorizontal size={17} color="var(--muted)" /></div></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark" style={{ width: 31, height: 31, borderRadius: 11 }}><Sprout size={17} /></span><span>rutina.</span></div>
          <div className="topbar-note">Make room for what matters.</div>
          <div className="topbar-actions"><IconAction label="Cari (Ctrl K)" onClick={() => setSearchOpen(true)}><Search size={17} /></IconAction><div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>R</div></div>
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
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></button>)}
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
      {toast && <div role="status" className="toast">{toast}</div>}
    </div>
  );
}