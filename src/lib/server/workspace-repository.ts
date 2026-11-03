import "server-only";

import type { Budget, Habit, Transaction } from "@/lib/types";
import { isScheduledOn, normalizeSchedule } from "@/lib/habit-schedule";
import { initialBudgets } from "@/lib/seed-data";
import { db } from "@/lib/db";

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

// Seed awal anggaran (idempoten) — menggantikan INSERT OR IGNORE pada
// initializer skema Turso versi asli.
let seedPromise: Promise<void> | null = null;
function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      for (const budget of initialBudgets) {
        await db.$executeRaw`INSERT OR IGNORE INTO budgets (category, monthly_limit) VALUES (${budget.category}, ${budget.limit})`;
      }
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

interface HabitRow {
  id: string;
  title: string;
  category: string;
  time: string;
  duration: number | bigint;
  icon: string;
  streak: number | bigint;
  completed: number | bigint;
}

interface TransactionRow {
  id: string;
  title: string;
  category: string;
  type: string;
  amount: number | bigint;
  transaction_date: string;
}

interface MetadataRow {
  transaction_id: string;
  wallet_id: string | null;
  tags_json: string;
  split_group_id: string | null;
}

interface HabitMetadataRow {
  habit_id: string;
  payload: string;
}

interface DailyProgressRow {
  habit_id: string;
  current_amount: number | bigint;
  time_spent_minutes: number | bigint;
}

interface BudgetRow {
  category: string;
  monthly_limit: number | bigint;
}

export async function readWorkspace(today: string): Promise<WorkspaceData> {
  await ensureSeeded();

  const [habitRows, transactionRows, budgetRows, metadataRows, habitMetadataRows, dailyProgressRows] = await Promise.all([
    db.$queryRaw<HabitRow[]>`
      SELECT
        h.id, h.title, h.category, h.time, h.duration, h.icon, h.streak,
        CASE WHEN c.habit_id IS NULL THEN 0 ELSE 1 END AS completed
      FROM habits h
      LEFT JOIN habit_checkins c
        ON c.habit_id = h.id AND c.completed_on = ${today}
      ORDER BY h.sort_order ASC, h.created_at ASC`,
    db.$queryRaw<TransactionRow[]>`
      SELECT id, title, category, type, amount, transaction_date
      FROM transactions
      ORDER BY transaction_date DESC, created_at DESC`,
    db.$queryRaw<BudgetRow[]>`SELECT category, monthly_limit FROM budgets ORDER BY category ASC`,
    db.$queryRaw<MetadataRow[]>`SELECT transaction_id, wallet_id, tags_json, split_group_id FROM transaction_metadata`,
    db.$queryRaw<HabitMetadataRow[]>`SELECT habit_id, payload FROM habit_metadata`,
    db.$queryRaw<DailyProgressRow[]>`
      SELECT habit_id, current_amount, time_spent_minutes
      FROM habit_daily_progress WHERE activity_date = ${today}`,
  ]);
  const metadata = new Map(metadataRows.map((row) => [String(row.transaction_id), row]));
  const habitMetadata = new Map(habitMetadataRows.map((row) => [String(row.habit_id), row]));
  const dailyProgress = new Map(dailyProgressRows.map((row) => [String(row.habit_id), row]));

  const habits: Habit[] = habitRows.map((row) => {
    const detail = habitMetadata.get(String(row.id));
    const daily = dailyProgress.get(String(row.id));
    let extra: Record<string, unknown> = {};
    try { const parsed = JSON.parse(String(detail?.payload ?? "{}")); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) extra = parsed as Record<string, unknown>; } catch { extra = {}; }
    // Sanitize stored schedule: legacy/malformed payloads must never reach isScheduledOn.
    const schedule = normalizeSchedule(extra.schedule);
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
      ...(schedule ? { schedule } : {}),
    };
  });

  const transactions: Transaction[] = transactionRows.map((row) => {
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

  const budgets: Budget[] = budgetRows.map((row) => ({
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
  await ensureSeeded();

  // Schedules can arrive malformed (e.g. via backup import where only basic fields
  // are validated). Normalize once so stored metadata and every isScheduledOn call
  // below only ever see a valid daily/weekly/monthly shape.
  const sanitizedHabits = input.habits.map((habit) => ({
    ...habit,
    schedule: normalizeSchedule(habit.schedule) ?? { kind: "daily" },
  }));

  await db.$transaction(async (tx) => {
    for (const [index, habit] of sanitizedHabits.entries()) {
      await tx.$executeRaw`
        INSERT INTO habits
          (id, title, category, time, duration, icon, streak, sort_order, updated_at)
          VALUES (${habit.id}, ${habit.title}, ${habit.category}, ${habit.time}, ${habit.duration}, ${habit.icon}, ${habit.streak}, ${index}, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            time = excluded.time,
            duration = excluded.duration,
            icon = excluded.icon,
            streak = excluded.streak,
            sort_order = excluded.sort_order,
            updated_at = CURRENT_TIMESTAMP`;
      const habitExtra = {
        kind: habit.kind ?? "normal", targetAmount: habit.targetAmount ?? null,
        currentAmount: habit.currentAmount ?? 0, unit: habit.unit ?? "",
        priority: habit.priority ?? "medium", difficulty: habit.difficulty ?? "easy",
        groupName: habit.groupName ?? "", timeSpentMinutes: habit.timeSpentMinutes ?? 0,
        schedule: habit.schedule ?? { kind: "daily" },
      };
      const habitPayload = JSON.stringify(habitExtra);
      await tx.$executeRaw`
        INSERT INTO habit_metadata (habit_id, payload, updated_at) VALUES (${habit.id}, ${habitPayload}, CURRENT_TIMESTAMP)
          ON CONFLICT(habit_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`;
      await tx.$executeRaw`
        INSERT INTO habit_daily_progress (habit_id, activity_date, current_amount, time_spent_minutes, updated_at)
          VALUES (${habit.id}, ${today}, ${habit.currentAmount ?? 0}, ${habit.timeSpentMinutes ?? 0}, CURRENT_TIMESTAMP)
          ON CONFLICT(habit_id, activity_date) DO UPDATE SET
            current_amount = excluded.current_amount,
            time_spent_minutes = excluded.time_spent_minutes,
            updated_at = CURRENT_TIMESTAMP`;
    }

    for (const item of input.transactions) {
      await tx.$executeRaw`
        INSERT INTO transactions
          (id, title, category, type, amount, transaction_date, updated_at)
          VALUES (${item.id}, ${item.title}, ${item.category}, ${item.type}, ${item.amount}, ${item.date}, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            type = excluded.type,
            amount = excluded.amount,
            transaction_date = excluded.transaction_date,
            updated_at = CURRENT_TIMESTAMP`;
      const tagsJson = JSON.stringify(item.tags ?? []);
      await tx.$executeRaw`
        INSERT INTO transaction_metadata (transaction_id, wallet_id, tags_json, split_group_id, updated_at)
          VALUES (${item.id}, ${item.walletId ?? null}, ${tagsJson}, ${item.splitGroupId ?? null}, CURRENT_TIMESTAMP)
          ON CONFLICT(transaction_id) DO UPDATE SET wallet_id = excluded.wallet_id,
            tags_json = excluded.tags_json, split_group_id = excluded.split_group_id, updated_at = CURRENT_TIMESTAMP`;
    }

    for (const budget of input.budgets) {
      await tx.$executeRaw`
        INSERT INTO budgets (category, monthly_limit, updated_at)
          VALUES (${budget.category}, ${budget.limit}, CURRENT_TIMESTAMP)
          ON CONFLICT(category) DO UPDATE SET
            monthly_limit = excluded.monthly_limit,
            updated_at = CURRENT_TIMESTAMP`;
    }

    await tx.$executeRaw`DELETE FROM habit_checkins WHERE completed_on = ${today}`;

    for (const habit of sanitizedHabits) {
      if (!habit.completed) continue;
      await tx.$executeRaw`INSERT OR IGNORE INTO habit_checkins (habit_id, completed_on) VALUES (${habit.id}, ${today})`;
    }

    // Recompute consecutive completed days from stored check-ins.
    // The cursor strictly decreases each iteration and the loop is bounded by a
    // hard date floor, so a malformed schedule can never hang this transaction.
    for (const habit of sanitizedHabits) {
      const rows = await tx.$queryRaw<Array<{ completed_on: string }>>`
        SELECT completed_on FROM habit_checkins
        WHERE habit_id = ${habit.id} AND completed_on >= ${shiftDate(today, -364)} AND completed_on <= ${today}
        ORDER BY completed_on DESC`;
      if (rows.length === 0) continue;
      const dates = new Set(rows.map((row) => String(row.completed_on)));
      const earliest = shiftDate(today, -366);
      let cursor = dates.has(today) ? today : shiftDate(today, -1);
      let streak = 0;
      while (cursor >= earliest) {
        if (!isScheduledOn(habit.schedule, cursor)) {
          cursor = shiftDate(cursor, -1);
          continue;
        }
        if (!dates.has(cursor)) break;
        streak += 1;
        cursor = shiftDate(cursor, -1);
      }
      await tx.$executeRaw`UPDATE habits SET streak = ${Math.min(streak, 365)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${habit.id}`;
    }
  });
}
