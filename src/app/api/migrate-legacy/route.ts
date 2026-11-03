import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readWorkspace, writeWorkspace } from "@/lib/server/workspace-repository";
import { normalizeModules, EMPTY_MODULES, type WorkspaceModules } from "@/lib/module-types";
import { migrateLegacyBackup, isLegacyBackup, type MigrationReport } from "@/lib/migrate-legacy";
import { todayISO } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mergeByKey<T>(current: T[], incoming: T[], keyOf: (item: T) => string): T[] {
  const values = new Map<string, T>();
  for (const item of current) values.set(keyOf(item), item);
  for (const item of incoming) values.set(keyOf(item), item);
  return [...values.values()];
}

async function readModules(): Promise<WorkspaceModules> {
  const rows = await db.$queryRaw<Array<{ module_key: string; payload: string }>>`SELECT module_key, payload FROM workspace_modules`;
  const value: Record<string, unknown> = { ...EMPTY_MODULES };
  for (const row of rows) {
    try { value[String(row.module_key)] = JSON.parse(String(row.payload)); } catch { /* ignore one malformed module */ }
  }
  return normalizeModules(value);
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

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "File backup bukan JSON yang valid." }, { status: 400 });
  }
  if (!isLegacyBackup(body)) {
    return NextResponse.json({
      error: "File bukan backup legacy V1 Rutina. Endpoint ini khusus migrasi dari aplikasi Rutina lama (format tanpa envelope `format: rutina-v2-backup`).",
    }, { status: 400 });
  }

  const today = todayISO();
  let migration;
  try {
    migration = migrateLegacyBackup(body, today);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memigrasi backup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { workspace, modules: incomingModules, habitCheckins, report } = migration;

  try {
    // 1. Insert historical habit check-ins SEBELUM writeWorkspace.
    //    writeWorkspace akan menghapus check-in HARI INI lalu menyisipkan ulang
    //    berdasarkan flag `completed` pada habit — check-in tanggal lain tidak
    //    tersentuh, jadi riwayat streak tetap utuh.
    await db.$transaction(async (tx) => {
      for (const checkin of habitCheckins) {
        await tx.$executeRaw`INSERT OR IGNORE INTO habit_checkins (habit_id, completed_on) VALUES (${checkin.habitId}, ${checkin.completedOn})`;
      }
    });

    // 2. Gabungkan workspace (habits/transactions/budgets) dengan data yang ada.
    const currentWorkspace = await readWorkspace(today);
    const mergedWorkspace = {
      habits: mergeByKey(currentWorkspace.habits, workspace.habits, (item) => item.id),
      transactions: mergeByKey(currentWorkspace.transactions, workspace.transactions, (item) => item.id),
      budgets: mergeByKey(currentWorkspace.budgets, workspace.budgets, (item) => item.category),
    };
    await writeWorkspace(mergedWorkspace, today);

    // 3. Gabungkan & simpan modul (goals/checkins/tasks/notes/routines/wellness/finance).
    const currentModules = await readModules();
    const mergedModules = mergeModules(currentModules, incomingModules);
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
      mode: "legacy-migration",
      report: report as unknown as MigrationReport,
      restored: {
        habits: workspace.habits.length,
        transactions: workspace.transactions.length,
        budgets: workspace.budgets.length,
        habitCheckins: habitCheckins.length,
        goals: incomingModules.goals.length,
        checkins: incomingModules.checkins.length,
        tasks: incomingModules.tasks.length,
        notes: incomingModules.notes.length,
        routines: incomingModules.routines.length,
        wellness: incomingModules.wellness.length,
        workouts: incomingModules.workouts.length,
        habitGroups: incomingModules.habitGroups.length,
        financeWallets: incomingModules.finance.wallets.length,
        financeWeeklyBudgets: incomingModules.finance.weeklyBudgets.length,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Rutina legacy migration failed:", error);
    return NextResponse.json({
      error: "Gagal memigrasi backup legacy. Data yang sudah ada tidak dihapus.",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/migrate-legacy",
    description: "Migrasi backup Rutina V1 (format lama tanpa envelope rutina-v2-backup) ke skema V2. Kirim POST dengan body JSON backup lama.",
    expectedFormat: "Objek dengan `data.*` berisi habits, habitLogs, dailyLogs, transactions, fundSources, weeklyBudgets, habitGroups, workRoutines, workTasks, workNotes, appSettings, dll.",
  });
}
