/**
 * Inisialisasi schema di Turso/libSQL via raw SQL (karena Prisma CLI tidak
 * menerima URL libsql:// di schema datasource untuk provider sqlite).
 *
 * Jalankan: bun run scripts/init-turso.ts
 *
 * Idempoten: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? undefined;

if (!url.startsWith("libsql://")) {
  console.error("DATABASE_URL harus diawali libsql:// — nilai saat ini:", url);
  process.exit(1);
}

const client = createClient({ url, authToken } as Record<string, unknown>);

const DDL = [
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 15,
    icon TEXT NOT NULL DEFAULT 'write',
    streak INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_habits_sort_created ON habits (sort_order ASC, created_at ASC)`,
  `CREATE TABLE IF NOT EXISTS habit_checkins (
    habit_id TEXT NOT NULL,
    completed_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (habit_id, completed_on)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_checkins_completed ON habit_checkins (completed_on)`,
  `CREATE TABLE IF NOT EXISTS habit_metadata (
    habit_id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS habit_daily_progress (
    habit_id TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    time_spent_minutes INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (habit_id, activity_date)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    transaction_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions (transaction_date DESC)`,
  `CREATE TABLE IF NOT EXISTS transaction_metadata (
    transaction_id TEXT PRIMARY KEY NOT NULL,
    wallet_id TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    split_group_id TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    category TEXT PRIMARY KEY NOT NULL,
    monthly_limit INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS workspace_modules (
    module_key TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function main() {
  console.log("Connecting to:", url);
  let ok = 0, failed = 0;
  for (const stmt of DDL) {
    try {
      await client.execute(stmt);
      ok++;
      console.log("  ✓", stmt.slice(0, 80).replace(/\n/g, " "));
    } catch (error) {
      failed++;
      console.error("  ✗", (error as Error).message.slice(0, 120));
    }
  }
  console.log(`\nDone: ${ok} succeeded, ${failed} failed.`);
  // sanity: hitung tabel
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log("Tables in Turso:");
    for (const row of tables.rows) {
      console.log("  -", (row as Record<string, unknown>).name);
    }
  } catch (error) {
    console.error("Failed to list tables:", (error as Error).message);
  }
  client.close();
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
