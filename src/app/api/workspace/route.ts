import { NextResponse } from "next/server";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { readWorkspace, writeWorkspace } from "@/lib/server/workspace-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHabit(value: unknown): value is Habit {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" && value.id.length > 0 && value.id.length <= 100 &&
    typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 100 &&
    (value.category === "Mindfulness" || value.category === "Health" || value.category === "Learning" || value.category === "Personal") &&
    typeof value.time === "string" && /^\d{2}:\d{2}$/.test(value.time) &&
    typeof value.duration === "number" && Number.isInteger(value.duration) && value.duration > 0 &&
    typeof value.completed === "boolean" &&
    (value.icon === "book" || value.icon === "water" || value.icon === "movement" || value.icon === "mind" || value.icon === "write") &&
    typeof value.streak === "number" && Number.isInteger(value.streak) && value.streak >= 0 &&
    (value.kind === undefined || ["normal", "avoid", "amount"].includes(String(value.kind))) &&
    (value.targetAmount === undefined || (typeof value.targetAmount === "number" && Number.isFinite(value.targetAmount) && value.targetAmount > 0)) &&
    (value.currentAmount === undefined || (typeof value.currentAmount === "number" && Number.isFinite(value.currentAmount) && value.currentAmount >= 0)) &&
    (value.unit === undefined || (typeof value.unit === "string" && value.unit.length <= 30)) &&
    (value.priority === undefined || ["low", "medium", "high"].includes(String(value.priority))) &&
    (value.difficulty === undefined || ["easy", "medium", "hard"].includes(String(value.difficulty))) &&
    (value.groupName === undefined || (typeof value.groupName === "string" && value.groupName.length <= 60)) &&
    (value.timeSpentMinutes === undefined || (typeof value.timeSpentMinutes === "number" && Number.isInteger(value.timeSpentMinutes) && value.timeSpentMinutes >= 0 && value.timeSpentMinutes <= 100000)) &&
    (value.schedule === undefined || (isRecord(value.schedule) && (value.schedule.kind === "daily" || (value.schedule.kind === "weekly" && Array.isArray(value.schedule.days) && value.schedule.days.length > 0 && value.schedule.days.length <= 7 && value.schedule.days.every((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)) || (value.schedule.kind === "monthly" && Array.isArray(value.schedule.dates) && value.schedule.dates.length > 0 && value.schedule.dates.length <= 31 && value.schedule.dates.every((day) => Number.isInteger(day) && Number(day) >= 1 && Number(day) <= 31)))))
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" && value.id.length > 0 && value.id.length <= 100 &&
    typeof value.title === "string" && value.title.trim().length > 0 && value.title.length <= 100 &&
    typeof value.category === "string" && value.category.trim().length > 0 && value.category.length <= 60 &&
    (value.type === "income" || value.type === "expense") &&
    typeof value.amount === "number" && Number.isSafeInteger(value.amount) && value.amount > 0 &&
    typeof value.date === "string" && isValidDate(value.date) &&
    (value.walletId === undefined || (typeof value.walletId === "string" && value.walletId.length <= 100)) &&
    (value.tags === undefined || (Array.isArray(value.tags) && value.tags.length <= 20 && value.tags.every((tag) => typeof tag === "string" && tag.length <= 40))) &&
    (value.splitGroupId === undefined || (typeof value.splitGroupId === "string" && value.splitGroupId.length <= 100))
  );
}

function isBudget(value: unknown): value is Budget {
  if (!isRecord(value)) return false;
  return (
    typeof value.category === "string" && value.category.trim().length > 0 && value.category.length <= 60 &&
    typeof value.limit === "number" && Number.isSafeInteger(value.limit) && value.limit >= 0
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = url.searchParams.get("today") ?? "";
  if (!isValidDate(today)) {
    return NextResponse.json({ error: "Tanggal hari ini tidak valid." }, { status: 400 });
  }

  try {
    const workspace = await readWorkspace(today);
    return NextResponse.json(workspace, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Rutina workspace read failed:", error);
    return NextResponse.json({ error: "Gagal membaca data dari database." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Payload workspace tidak valid." }, { status: 400 });
  }

  const habits = body.habits;
  const transactions = body.transactions;
  const budgets = body.budgets;
  const today = body.today;

  if (
    !Array.isArray(habits) || habits.length > 500 || !habits.every(isHabit) ||
    !Array.isArray(transactions) || transactions.length > 10000 || !transactions.every(isTransaction) ||
    !Array.isArray(budgets) || budgets.length > 100 || !budgets.every(isBudget) ||
    typeof today !== "string" || !isValidDate(today)
  ) {
    return NextResponse.json({ error: "Ada data workspace yang tidak valid." }, { status: 400 });
  }

  try {
    await writeWorkspace(
      {
        habits: habits as Habit[],
        transactions: transactions as Transaction[],
        budgets: budgets as Budget[],
      },
      today as string,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Rutina workspace write failed:", error);
    return NextResponse.json({ error: "Gagal menyimpan data ke database." }, { status: 500 });
  }
}
