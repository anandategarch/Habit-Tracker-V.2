import type { Budget, Habit, Transaction } from "@/lib/types";
import type { JournalRecord } from "@/features/os/use-history";

export type SectionId = "overview" | "habits" | "finance" | "calendar" | "analytics" | "settings";

export interface OsData {
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
  journal: JournalRecord;
  today: string;
  syncStatus: "local" | "syncing" | "synced" | "error";
  refresh: () => void;
}

export interface OsActions {
  newHabit: () => void;
  editHabit: (habit: Habit) => void;
  newTransaction: () => void;
  editTransaction: (tx: Transaction) => void;
  newBudget: () => void;
  editBudget: (budget: Budget) => void;
  goTo: (section: SectionId) => void;
  toggleCheckin: (habit: Habit) => void;
  updateHabits: (update: (current: Habit[]) => Habit[]) => void;
  updateTransactions: (update: (current: Transaction[]) => Transaction[]) => void;
  updateBudgets: (update: (current: Budget[]) => Budget[]) => void;
}
