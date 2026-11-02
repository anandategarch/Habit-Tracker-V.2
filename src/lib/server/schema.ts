import "server-only";

import { initialBudgets } from "@/lib/seed-data";
import { getTursoClient } from "@/lib/server/turso";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 15 CHECK (duration > 0),
    icon TEXT NOT NULL DEFAULT 'write',
    streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS habit_checkins (
    habit_id TEXT NOT NULL,
    completed_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (habit_id, completed_on),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    transaction_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY,
    monthly_limit INTEGER NOT NULL CHECK (monthly_limit >= 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS transaction_metadata (transaction_id TEXT PRIMARY KEY, wallet_id TEXT, tags_json TEXT NOT NULL DEFAULT '[]', split_group_id TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS workspace_modules (module_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  "CREATE INDEX IF NOT EXISTS idx_habits_sort_order ON habits(sort_order, created_at)",
  "CREATE INDEX IF NOT EXISTS idx_habit_checkins_date ON habit_checkins(completed_on)",
  "CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC)",
];

let schemaPromise: Promise<void> | null = null;

async function initializeSchema(): Promise<void> {
  const client = getTursoClient();

  for (const statement of schemaStatements) {
    await client.execute(statement);
  }

  for (const budget of initialBudgets) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO budgets (category, monthly_limit) VALUES (?, ?)",
      args: [budget.category, budget.limit],
    });
  }
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = initializeSchema().catch((error: unknown) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
}
