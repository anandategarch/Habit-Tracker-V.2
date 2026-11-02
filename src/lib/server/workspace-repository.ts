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

function asNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function readWorkspace(today: string): Promise<WorkspaceData> {
  await ensureSchema();
  const client = getTursoClient();

  const [habitResult, transactionResult, budgetResult] = await Promise.all([
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
  ]);

  const habits: Habit[] = habitResult.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category) as Habit["category"],
    time: String(row.time),
    duration: asNumber(row.duration),
    icon: String(row.icon) as Habit["icon"],
    streak: asNumber(row.streak),
    completed: asNumber(row.completed) === 1,
  }));

  const transactions: Transaction[] = transactionResult.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    category: String(row.category) as Transaction["category"],
    type: String(row.type) as Transaction["type"],
    amount: asNumber(row.amount),
    date: String(row.transaction_date),
  }));

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

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
