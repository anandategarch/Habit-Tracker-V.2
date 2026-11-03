import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readWorkspace, writeWorkspace } from "@/lib/server/workspace-repository";
import { normalizeModules, EMPTY_MODULES, type WorkspaceModules } from "@/lib/module-types";
import { todayISO } from "@/lib/format";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { isLegacyBackup, applyLegacyMigration } from "@/lib/migrate-legacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function mergeByKey<T>(current: T[], incoming: T[], keyOf: (item: T) => string): T[] {
  const values = new Map<string, T>();
  for (const item of current) values.set(keyOf(item), item);
  for (const item of incoming) values.set(keyOf(item), item);
  return [...values.values()];
}

function validateWorkspace(value: unknown): value is { habits: Habit[]; transactions: Transaction[]; budgets: Budget[] } {
  if (!isRecord(value) || !Array.isArray(value.habits) || !Array.isArray(value.transactions) || !Array.isArray(value.budgets)) return false;
  if (value.habits.length > 5000 || value.transactions.length > 50000 || value.budgets.length > 200) return false;
  const habitsOk = value.habits.every((item) => isRecord(item) &&
    typeof item.id === "string" && item.id.length <= 100 &&
    typeof item.title === "string" && item.title.trim().length > 0 &&
    typeof item.category === "string" && typeof item.time === "string" &&
    typeof item.duration === "number" && Number.isFinite(item.duration) && item.duration > 0 &&
    typeof item.completed === "boolean" && typeof item.icon === "string" &&
    typeof item.streak === "number" && Number.isFinite(item.streak));
  const transactionsOk = value.transactions.every((item) => isRecord(item) &&
    typeof item.id === "string" && item.id.length <= 100 &&
    typeof item.title === "string" && typeof item.category === "string" &&
    (item.type === "income" || item.type === "expense") &&
    typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 &&
    typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(item.date));
  const budgetsOk = value.budgets.every((item) => isRecord(item) &&
    typeof item.category === "string" &&
    typeof item.limit === "number" && Number.isFinite(item.limit) && item.limit >= 0);
  return habitsOk && transactionsOk && budgetsOk;
}

function mergeModules(current: WorkspaceModules, incoming: WorkspaceModules): WorkspaceModules {
  return {
    goals: mergeByKey(current.goals, incoming.goals, (item) => item.id),
    checkins: mergeByKey(current.checkins, incoming.checkins, (item) => item.date),
    tasks: mergeByKey(current.tasks, incoming.tasks, (item) => item.id),
    notes: mergeByKey(current.notes, incoming.notes, (item) => item.id),
    routines: mergeByKey(current.routines, incoming.routines, (item) => item.id),
    wellness: mergeByKey(current.wellness, incoming.wellness, (item) => item.date),
    workouts: mergeByKey(current.workouts, incoming.workouts, (item) => item.id),
    programs: mergeByKey(current.programs, incoming.programs, (item) => item.id),
    progressPhotos: mergeByKey(current.progressPhotos, incoming.progressPhotos, (item) => item.id).slice(0, 5),
    habitGroups: mergeByKey(current.habitGroups, incoming.habitGroups, (item) => item.id),
    settings: incoming.settings ?? current.settings,
    finance: {
      wallets: mergeByKey(current.finance.wallets, incoming.finance.wallets, (item) => item.id),
      transfers: mergeByKey(current.finance.transfers, incoming.finance.transfers, (item) => item.id),
      recurring: mergeByKey(current.finance.recurring, incoming.finance.recurring, (item) => item.id),
      savingsGoals: mergeByKey(current.finance.savingsGoals, incoming.finance.savingsGoals, (item) => item.id),
      categoryRules: mergeByKey(current.finance.categoryRules, incoming.finance.categoryRules, (item) => item.id),
      weeklyBudgets: mergeByKey(current.finance.weeklyBudgets, incoming.finance.weeklyBudgets, (item) => item.category),
    },
  };
}

async function readModules(): Promise<WorkspaceModules> {
  const rows = await db.$queryRaw<Array<{ module_key: string; payload: string }>>`SELECT module_key, payload FROM workspace_modules`;
  const value: Record<string, unknown> = { ...EMPTY_MODULES };
  for (const row of rows) {
    try { value[String(row.module_key)] = JSON.parse(String(row.payload)); } catch { /* ignore one malformed module */ }
  }
  return normalizeModules(value);
}

export async function GET() {
  try {
    const [workspace, modules] = await Promise.all([
      readWorkspace(todayISO()),
      readModules(),
    ]);
    return NextResponse.json({
      format: "rutina-v2-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        workspace: { habits: workspace.habits, transactions: workspace.transactions, budgets: workspace.budgets },
        modules,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina backup export failed:", error);
    return NextResponse.json({ error: "Gagal membuat backup." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "File backup bukan JSON yang valid." }, { status: 400 });
  }

  // AUTO-ROUTE: jika file ternyata backup V1 (lama, tanpa envelope rutina-v2-backup),
  // delegasikan ke pipeline migrasi V1→V2 supaya user tidak perlu pilih tombol khusus.
  if (isLegacyBackup(body)) {
    try {
      const result = await applyLegacyMigration(body, todayISO());
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("Rutina legacy migration (via backup endpoint) failed:", error);
      const message = error instanceof Error ? error.message : "Gagal memigrasi backup legacy. Data yang sudah ada tidak dihapus.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!isRecord(body) || body.format !== "rutina-v2-backup" || body.version !== 1 ||
      !isRecord(body.data) || !validateWorkspace(body.data.workspace)) {
    return NextResponse.json({ error: "Format backup tidak dikenali atau datanya tidak lengkap." }, { status: 400 });
  }
  const incomingWorkspace = body.data.workspace;
  const incomingModules = normalizeModules(body.data.modules);
  if (JSON.stringify(incomingModules.progressPhotos).length > 1_500_000) {
    return NextResponse.json({ error: "Backup foto terlalu besar untuk dipulihkan dalam satu proses." }, { status: 413 });
  }

  try {
    const currentWorkspace = await readWorkspace(todayISO());
    const currentModules = await readModules();
    const mergedWorkspace = {
      habits: mergeByKey(currentWorkspace.habits, incomingWorkspace.habits, (item) => item.id),
      transactions: mergeByKey(currentWorkspace.transactions, incomingWorkspace.transactions, (item) => item.id),
      budgets: mergeByKey(currentWorkspace.budgets, incomingWorkspace.budgets, (item) => item.category),
    };
    const mergedModules = mergeModules(currentModules, incomingModules);

    await writeWorkspace(mergedWorkspace, todayISO());
    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(mergedModules)) {
        const payload = JSON.stringify(value);
        await tx.$executeRaw`
          INSERT INTO workspace_modules (module_key, payload, updated_at)
            VALUES (${key}, ${payload}, CURRENT_TIMESTAMP)
            ON CONFLICT(module_key) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`;
      }
    });

    return NextResponse.json({
      ok: true,
      mode: "merge",
      restored: {
        habits: incomingWorkspace.habits.length,
        transactions: incomingWorkspace.transactions.length,
        budgets: incomingWorkspace.budgets.length,
        goals: incomingModules.goals.length,
        checkins: incomingModules.checkins.length,
        tasks: incomingModules.tasks.length,
        notes: incomingModules.notes.length,
        routines: incomingModules.routines.length,
        wellness: incomingModules.wellness.length,
        workouts: incomingModules.workouts.length,
        financeRecords: Object.values(incomingModules.finance).reduce((sum, rows) => sum + rows.length, 0),
      },
    });
  } catch (error) {
    console.error("Rutina backup import failed:", error);
    return NextResponse.json({ error: "Gagal memulihkan backup. Data yang sudah ada tidak dihapus." }, { status: 500 });
  }
}
