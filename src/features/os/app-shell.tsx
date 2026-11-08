"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Toaster, toast } from "sonner";
import { useWorkspace, refreshWorkspace } from "@/lib/use-workspace";
import { todayISO } from "@/lib/format";
import { useJournal, useServerHistoryHydration } from "@/features/os/use-history";
import type { OsActions, OsData, SectionId } from "@/features/os/view-props";
import { BudgetSheet, HabitSheet, TransactionSheet, type HabitDraft, type TransactionDraft } from "@/features/os/forms";
import { FINANCE_CATEGORIES } from "@/features/os/os-icons";
import {
  BrandMark, CalendarIcon, ChartIcon, CloudIcon, CloudOffIcon, HabitsIcon, OverviewIcon,
  PlusIcon, RefreshIcon, SlidersIcon, WalletIcon,
} from "@/features/os/os-icons";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { OverviewView } from "@/features/os/views/overview-view";
import { HabitsView } from "@/features/os/views/habits-view";
import { FinanceView } from "@/features/os/views/finance-view";
import { CalendarView } from "@/features/os/views/calendar-view";
import { AnalyticsView } from "@/features/os/views/analytics-view";
import { SettingsView } from "@/features/os/views/settings-view";

const SECTIONS: Array<{ id: SectionId; label: string; short: string; Icon: (p: { size?: number }) => React.ReactNode }> = [
  { id: "overview", label: "Ringkasan", short: "Beranda", Icon: OverviewIcon },
  { id: "habits", label: "Kebiasaan", short: "Kebiasaan", Icon: HabitsIcon },
  { id: "finance", label: "Keuangan", short: "Keuangan", Icon: WalletIcon },
  { id: "calendar", label: "Kalender", short: "Kalender", Icon: CalendarIcon },
  { id: "analytics", label: "Analitik", short: "Analitik", Icon: ChartIcon },
  { id: "settings", label: "Pengaturan", short: "Setelan", Icon: SlidersIcon },
];

const MOBILE_SECTIONS = SECTIONS.filter((s) => s.id !== "settings");

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = todayISO();
      setToday((prev) => (prev === now ? prev : now));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (today !== todayISO()) return;
    void refreshWorkspace();
  }, [today]);
  return today;
}

export function RutinaOS() {
  const { habits, transactions, budgets, syncStatus, isReady, updateHabits, updateTransactions, updateBudgets } = useWorkspace();
  const { journal, toggle: journalToggle } = useJournal();
  const today = useToday();
  const [section, setSection] = useState<SectionId>("overview");

  useServerHistoryHydration(syncStatus === "synced");

  /* ---------- sheet state ---------- */
  const [habitSheet, setHabitSheet] = useState<{ open: boolean; initial: Habit | null }>({ open: false, initial: null });
  const [txSheet, setTxSheet] = useState<{ open: boolean; initial: Transaction | null }>({ open: false, initial: null });
  const [budgetSheet, setBudgetSheet] = useState<{ open: boolean; initial: Budget | null }>({ open: false, initial: null });

  const knownCategories = useMemo(() => [...new Set(transactions.map((t) => t.category))], [transactions]);

  /* ---------- actions ---------- */
  const actions: OsActions = useMemo(
    () => ({
      newHabit: () => setHabitSheet({ open: true, initial: null }),
      editHabit: (habit) => setHabitSheet({ open: true, initial: habit }),
      newTransaction: () => setTxSheet({ open: true, initial: null }),
      editTransaction: (tx) => setTxSheet({ open: true, initial: tx }),
      newBudget: () => setBudgetSheet({ open: true, initial: null }),
      editBudget: (budget) => setBudgetSheet({ open: true, initial: budget }),
      goTo: (next) => setSection(next),
      toggleCheckin: (habit) => {
        const next = !habit.completed;
        updateHabits((current) => current.map((h) => (h.id === habit.id ? { ...h, completed: next } : h)));
        journalToggle(habit.id, today, next);
        if (next) toast.success(`Selesai · ${habit.title}`);
      },
      updateHabits: (update) => updateHabits((current) => update(current)),
      updateTransactions: (update) => updateTransactions((current) => update(current)),
      updateBudgets: (update) => updateBudgets((current) => update(current)),
    }),
    [updateHabits, updateTransactions, updateBudgets, journalToggle, today],
  );

  const data: OsData = useMemo(
    () => ({
      habits,
      transactions,
      budgets,
      journal,
      today,
      syncStatus,
      refresh: () => void refreshWorkspace(),
    }),
    [habits, transactions, budgets, journal, today, syncStatus],
  );

  const submitHabit = useCallback(
    (draft: HabitDraft) => {
      const editing = habitSheet.initial;
      if (editing) {
        updateHabits((current) => current.map((h) => (h.id === editing.id ? { ...h, ...draft } : h)));
        toast.success("Kebiasaan diperbarui");
      } else {
        const habit: Habit = { id: uid(), completed: false, streak: 0, ...draft };
        updateHabits((current) => [...current, habit]);
        toast.success("Kebiasaan ditambahkan");
      }
    },
    [habitSheet.initial, updateHabits],
  );

  const submitTransaction = useCallback(
    (draft: TransactionDraft) => {
      const editing = txSheet.initial;
      if (editing) {
        updateTransactions((current) => current.map((t) => (t.id === editing.id ? { ...t, ...draft } : t)));
        toast.success("Transaksi diperbarui");
      } else {
        const tx: Transaction = { id: uid(), ...draft };
        updateTransactions((current) => [tx, ...current]);
        toast.success("Transaksi dicatat");
      }
    },
    [txSheet.initial, updateTransactions],
  );

  const submitBudget = useCallback(
    (draft: { category: string; limit: number }) => {
      updateBudgets((current) => {
        const exists = current.some((b) => b.category === draft.category);
        if (exists) return current.map((b) => (b.category === draft.category ? { ...b, limit: draft.limit } : b));
        return [...current, { category: draft.category, limit: draft.limit }];
      });
      toast.success("Anggaran disimpan");
    },
    [updateBudgets],
  );

  const activeSection = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).format(
        new Date(`${today}T12:00:00+07:00`),
      ),
    [today],
  );

  const SyncBadge = (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-dim"
      role="status"
      aria-label={
        syncStatus === "synced" ? "Data tersinkron dengan cloud" : syncStatus === "syncing" ? "Sedang menyinkronkan" : syncStatus === "error" ? "Sinkronisasi tertunda" : "Mode lokal — data tersimpan di perangkat"
      }
      title={syncStatus === "synced" ? "Tersinkron" : syncStatus === "syncing" ? "Menyinkronkan…" : syncStatus === "error" ? "Tertunda" : "Mode lokal"}
    >
      {syncStatus === "synced" ? (
        <CloudIcon size={16} />
      ) : syncStatus === "syncing" ? (
        <RefreshIcon size={16} className="animate-spin" />
      ) : syncStatus === "error" ? (
        <RefreshIcon size={16} />
      ) : (
        <CloudOffIcon size={16} />
      )}
    </span>
  );

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <a href="#os-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-panel2 focus:px-4 focus:py-2 focus:text-[13px]">
        Lompat ke konten
      </a>

      {/* ---------- sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-line bg-[#0b0f0c] lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark size={30} />
          <div className="leading-tight">
            <p className="text-[14px] font-bold tracking-[0.06em] text-ink">
              RUTINA<span className="text-accent">OS</span>
            </p>
            <p className="os-micro !text-[9px] !tracking-[0.14em]">Personal Console</p>
          </div>
        </div>
        <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1 px-3">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className="os-nav-item" data-active={section === s.id} aria-current={section === s.id ? "page" : undefined} onClick={() => setSection(s.id)}>
              <s.Icon size={17} />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-5">
          <div className="rounded-xl border border-line bg-panel px-3.5 py-3">
            <p className="os-micro !text-[9px]">{syncStatus === "local" ? "Mode lokal" : syncStatus === "synced" ? "Tersinkron cloud" : syncStatus === "syncing" ? "Menyinkronkan…" : "Sinkron tertunda"}</p>
            <p className="num mt-1 text-[11.5px] text-dim">
              {habits.length} kebiasaan · {transactions.length} transaksi
            </p>
          </div>
        </div>
      </aside>

      {/* ---------- main column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[236px]">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="lg:hidden">
                <BrandMark size={26} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[15.5px] font-bold text-ink">{activeSection.label}</h1>
                <p className="num hidden truncate text-[11.5px] text-faint sm:block">{dateLabel}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button type="button" className="os-btn os-btn-primary !h-9 !px-3" aria-label="Tambah cepat: kebiasaan, transaksi, atau anggaran">
                    <PlusIcon size={15} />
                    <span className="hidden sm:inline">Tambah</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={8} className="z-[70] min-w-[210px] rounded-xl border border-line bg-panel p-1.5 shadow-2xl">
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink outline-none data-[highlighted]:bg-panel2"
                      onSelect={() => setHabitSheet({ open: true, initial: null })}
                    >
                      <HabitsIcon size={16} />
                      Kebiasaan baru
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink outline-none data-[highlighted]:bg-panel2"
                      onSelect={() => setTxSheet({ open: true, initial: null })}
                    >
                      <WalletIcon size={16} />
                      Transaksi baru
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink outline-none data-[highlighted]:bg-panel2"
                      onSelect={() => setBudgetSheet({ open: true, initial: null })}
                    >
                      <SlidersIcon size={16} />
                      Anggaran baru
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              {SyncBadge}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-dim transition-colors hover:border-line2 hover:text-ink lg:hidden"
                aria-label="Pengaturan"
                title="Pengaturan"
                onClick={() => setSection("settings")}
              >
                <SlidersIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* content */}
        <main id="os-main" className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {!isReady ? (
            <LoadingSkeleton />
          ) : (
            <div key={section} className="os-rise">
              {section === "overview" && <OverviewView data={data} actions={actions} />}
              {section === "habits" && <HabitsView data={data} actions={actions} />}
              {section === "finance" && <FinanceView data={data} actions={actions} />}
              {section === "calendar" && <CalendarView data={data} actions={actions} />}
              {section === "analytics" && <AnalyticsView data={data} />}
              {section === "settings" && <SettingsView data={data} actions={actions} />}
            </div>
          )}
        </main>
      </div>

      {/* ---------- bottom nav (mobile) ---------- */}
      <nav
        aria-label="Navigasi bawah"
        className="os-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0b0f0cf2] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-stretch justify-around">
          {MOBILE_SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setSection(s.id)}
                className="relative flex min-h-[58px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2"
                style={{ color: active ? "#37d99a" : "#6d7a70" }}
              >
                <span className="absolute inset-x-3 top-0 h-[2px] rounded-full" style={{ background: active ? "#37d99a" : "transparent" }} aria-hidden="true" />
                <s.Icon size={20} />
                <span className="text-[10px] font-semibold">{s.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---------- sheets ---------- */}
      <HabitSheet open={habitSheet.open} onOpenChange={(open) => setHabitSheet((s) => ({ ...s, open }))} initial={habitSheet.initial} onSubmit={submitHabit} />
      <TransactionSheet
        open={txSheet.open}
        onOpenChange={(open) => setTxSheet((s) => ({ ...s, open }))}
        initial={txSheet.initial}
        onSubmit={submitTransaction}
        knownCategories={knownCategories}
        defaultCategories={FINANCE_CATEGORIES}
      />
      <BudgetSheet
        open={budgetSheet.open}
        onOpenChange={(open) => setBudgetSheet((s) => ({ ...s, open }))}
        initial={budgetSheet.initial}
        existingCategories={knownCategories}
        defaultCategories={FINANCE_CATEGORIES}
        onSubmit={submitBudget}
      />

      <Toaster position="top-center" theme="dark" toastOptions={{ style: { borderRadius: "12px" } }} />
    </div>
  );
}

/* ---------- loading skeleton ---------- */

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Memuat data">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="os-skeleton h-[104px]" />
        ))}
      </div>
      <div className="os-skeleton h-[320px]" />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="os-skeleton h-[240px]" />
        <div className="os-skeleton h-[240px]" />
      </div>
    </div>
  );
}
