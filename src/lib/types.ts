export type TabId = "home" | "habits" | "finance" | "calendar" | "insights" | "goals" | "checkin" | "work" | "wellness" | "training" | "tree";

export type HabitCategory = "Mindfulness" | "Health" | "Learning" | "Personal";

export interface Habit {
  id: string;
  title: string;
  category: HabitCategory;
  time: string;
  duration: number;
  completed: boolean;
  icon: "book" | "water" | "movement" | "mind" | "write";
  streak: number;
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
