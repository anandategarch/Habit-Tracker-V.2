export type TabId = "home" | "habits" | "finance" | "calendar" | "insights" | "goals" | "checkin" | "work" | "wellness" | "training" | "tree";

export type HabitCategory = "Mindfulness" | "Health" | "Learning" | "Personal";

export type HabitKind = "normal" | "avoid" | "amount";
export type HabitPriority = "low" | "medium" | "high";
export type HabitDifficulty = "easy" | "medium" | "hard";
export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekly"; days: number[] }
  | { kind: "monthly"; dates: number[] };

export interface Habit {
  id: string;
  title: string;
  category: HabitCategory;
  time: string;
  duration: number;
  completed: boolean;
  icon: "book" | "water" | "movement" | "mind" | "write";
  streak: number;
  kind?: HabitKind;
  targetAmount?: number;
  currentAmount?: number;
  unit?: string;
  priority?: HabitPriority;
  difficulty?: HabitDifficulty;
  groupName?: string;
  timeSpentMinutes?: number;
  schedule?: HabitSchedule;
}

export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "Gaji"
  | "Freelance"
  | "Makanan"
  | "Transportasi"
  | "Tagihan"
  | "Lifestyle"
  | "Kesehatan"
  | "Lainnya";

export interface Transaction {
  id: string;
  title: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  date: string;
  walletId?: string;
  tags?: string[];
  splitGroupId?: string;
}

export interface Budget {
  category: TransactionCategory;
  limit: number;
}
