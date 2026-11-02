import "server-only";

import type { Budget, Habit, Transaction } from "@/lib/types";
import { ensureSchema } from "@/lib/server/schema";
import { getTursoClient } from "@/lib/server/turso";

export interface WorkspaceData {
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
  isEmpty: boolean;
}

export interface WorkspaceInput {
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function readWorkspace(today: string): Promise<WorkspaceData> {
  await ensureSchema();
  const client = getTursoClient();

  const [habitResult, transactionResult, budgetResult, metadataResult, habitMetadataResult, dailyProgressResult] = await Promise.all([
    client.execute({
      sql: `SELECT
        h.id, h.title, h.category, h.time, h.duration, h.icon, h.streak,
        CASE WHEN c.habit_id IS NULL THEN 0 ELSE 1 END AS completed
      FROM habits h
      LEFT JOIN habit_checkins c
        ON c.habit_id = h.id AND c.completed_on = ?
      ORDER BY h.sort_order ASC, h.created_at ASC`,
      args: [today],
    }),
    client.execute(`SELECT id, title, category, type, amount, transaction_date
      FROM transactions
      ORDER BY transaction_date DESC, created_at DESC`),
    client.execute("SELECT category, monthly_limit FROM budgets ORDER BY category ASC"),
    client.execute("SELECT transaction_id, wallet_id, tags_json, split_group_id FROM transaction_metadata"),
    client.execute("SELECT habit_id, payload FROM habit_metadata"),
    client.execute({ sql: "SELECT habit_id, current_amount, time_spent_minutes FROM habit_daily_progress WHERE activity_date = ?", args: [today] }),
  ]);
  const metadata = new Map(metadataResult.rows.map((row) => [String(row.transaction_id), row]));
  const habitMetadata = new Map(habitMetadataResult.rows.map((row) => [String(row.habit_id), row]));
  const dailyProgress = new Map(dailyProgressResult.rows.map((row) => [String(row.habit_id), row]));

  const habits: Habit[] = habitResult.rows.map((row) => {
    const detail = habitMetadata.get(String(row.id));
    const daily = dailyProgress.get(String(row.id));
    let extra: Record<string, unknown> = {};
    try { const parsed = JSON.parse(String(detail?.payload ?? "{}")); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) extra = parsed as Record<string, unknown>; } catch { extra = {}; }
    return {
      id: String(row.id), title: String(row.title),
      category: String(row.category) as Habit["category"], time: String(row.time),
      duration: asNumber(row.duration), icon: String(row.icon) as Habit["icon"],
      streak: asNumber(row.streak), completed: asNumber(row.completed) === 1,
      ...(extra.kind ? { kind: extra.kind as Habit["kind"] } : {}),
      ...(typeof extra.targetAmount === "number" ? { targetAmount: extra.targetAmount } : {}),
      currentAmount: daily ? asNumber(daily.current_amount) : 0,
      ...(typeof extra.unit === "string" ? { unit: extra.unit } : {}),
      ...(extra.priority ? { priority: extra.priority as Habit["priority"] } : {}),
      ...(extra.difficulty ? { difficulty: extra.difficulty as Habit["difficulty"] } : {}),
      ...(typeof extra.groupName === "string" ? { groupName: extra.groupName } : {}),
      timeSpentMinutes: daily ? asNumber(daily.time_spent_minutes) : 0,
    };
  });

  const transactions: Transaction[] = transactionResult.rows.map((row) => {
    const detail = metadata.get(String(row.id));
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(String(detail?.tags_json ?? "[]"));
      if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string");
    } catch { tags = []; }
    return {
      id: String(row.id), title: String(row.title),
      category: String(row.category) as Transaction["category"],
      type: String(row.type) as Transaction["type"],
      amount: asNumber(row.amount), date: String(row.transaction_date),
      ...(detail?.wallet_id ? { walletId: String(detail.wallet_id) } : {}),
      ...(tags.length ? { tags } : {}),
      ...(detail?.split_group_id ? { splitGroupId: String(detail.split_group_id) } : {}),
    };
  });

  const budgets: Budget[] = budgetResult.rows.map((row) => ({
    category: String(row.category) as Budget["category"],
    limit: asNumber(row.monthly_limit),
  }));

  return {
    habits,
    transactions,
    budgets,
    isEmpty: habits.length === 0 && transactions.length === 0,
  };
}

export async function writeWorkspace(input: WorkspaceInput, today: string): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  const transaction = await client.transaction("write");

  try {
    for (const [index, habit] of input.habits.entries()) {
      await transaction.execute({
        sql: `INSERT INTO habits
          (id, title, category, time, duration, icon, streak, sort_order, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            time = excluded.time,
            duration = excluded.duration,
            icon = excluded.icon,
            streak = excluded.streak,
            sort_order = excluded.sort_order,
            updated_at = CURRENT_TIMESTAMP`,
        args: [
          habit.id, habit.title, habit.category, habit.time, habit.duration,
          habit.icon, habit.streak, index,
        ],
      });
      const habitExtra = {
        kind: habit.kind ?? "normal", targetAmount: habit.targetAmount ?? null,
        currentAmount: habit.currentAmount ?? 0, unit: habit.unit ?? "",
        priority: habit.priority ?? "medium", difficulty: habit.difficulty ?? "easy",
        groupName: habit.groupName ?? "", timeSpentMinutes: habit.timeSpentMinutes ?? 0,
      };
      await transaction.execute({
        sql: `INSERT INTO habit_metadata (habit_id, payload, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(habit_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`,
        args: [habit.id, JSON.stringify(habitExtra)],
      });
      await transaction.execute({
        sql: `INSERT INTO habit_daily_progress (habit_id, activity_date, current_amount, time_spent_minutes, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(habit_id, activity_date) DO UPDATE SET
            current_amount = excluded.current_amount,
            time_spent_minutes = excluded.time_spent_minutes,
            updated_at = CURRENT_TIMESTAMP`,
        args: [habit.id, today, habit.currentAmount ?? 0, habit.timeSpentMinutes ?? 0],
      });
    }

    for (const item of input.transactions) {
      await transaction.execute({
        sql: `INSERT INTO transactions
          (id, title, category, type, amount, transaction_date, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            type = excluded.type,
            amount = excluded.amount,
            transaction_date = excluded.transaction_date,
            updated_at = CURRENT_TIMESTAMP`,
        args: [
          item.id, item.title, item.category, item.type, item.amount, item.date,
        ],
      });
      await transaction.execute({
        sql: `INSERT INTO transaction_metadata (transaction_id, wallet_id, tags_json, split_group_id, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(transaction_id) DO UPDATE SET wallet_id = excluded.wallet_id,
            tags_json = excluded.tags_json, split_group_id = excluded.split_group_id, updated_at = CURRENT_TIMESTAMP`,
        args: [item.id, item.walletId ?? null, JSON.stringify(item.tags ?? []), item.splitGroupId ?? null],
      });
    }

    for (const budget of input.budgets) {
      await transaction.execute({
        sql: `INSERT INTO budgets (category, monthly_limit, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(category) DO UPDATE SET
            monthly_limit = excluded.monthly_limit,
            updated_at = CURRENT_TIMESTAMP`,
        args: [budget.category, budget.limit],
      });
    }

    await transaction.execute({
      sql: "DELETE FROM habit_checkins WHERE completed_on = ?",
      args: [today],
    });

    for (const habit of input.habits) {
      if (!habit.completed) continue;
      await transaction.execute({
        sql: "INSERT OR IGNORE INTO habit_checkins (habit_id, completed_on) VALUES (?, ?)",
        args: [habit.id, today],
      });
    }

    // Recompute consecutive completed days from stored check-ins.
    for (const habit of input.habits) {
      const result = await transaction.execute({
        sql: "SELECT completed_on FROM habit_checkins WHERE habit_id = ? AND completed_on >= ? AND completed_on <= ? ORDER BY completed_on DESC",
        args: [habit.id, shiftDate(today, -364), today],
      });
      if (result.rows.length === 0) continue;
      const dates = new Set(result.rows.map((row) => String(row.completed_on)));
      let cursor = dates.has(today) ? today : shiftDate(today, -1);
      let streak = 0;
      while (streak < 365 && dates.has(cursor)) {
        streak += 1;
        cursor = shiftDate(cursor, -1);
      }
      await transaction.execute({
        sql: "UPDATE habits SET streak = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [streak, habit.id],
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
