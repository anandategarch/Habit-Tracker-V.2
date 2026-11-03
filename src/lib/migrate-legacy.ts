import "server-only";

import { db } from "@/lib/db";
import { readWorkspace, writeWorkspace } from "@/lib/server/workspace-repository";
import type { Budget, Habit, Transaction } from "@/lib/types";
import {
  normalizeModules,
  EMPTY_MODULES,
  type WorkspaceModules,
  type DailyCheckin,
  type WorkNote,
  type WorkRoutine,
  type WorkTask,
  type WellnessEntry,
  type HabitGroup,
  type Wallet,
  type WeeklyBudget,
} from "@/lib/module-types";

// ============================================================================
// Legacy (V1) backup shape — sumber: rutina-backup-2026-11-03.json
// Format V1 TIDAK memiliki envelope `format`/`version` dan menyatukan semua
// data di bawah `data.*` dengan nama tabel yang berbeda dari V2.
// ============================================================================

type LegacyHabitCategory = "Fitness" | "General" | "Health" | "Learning" | "Olahraga" | "Productivity" | "Mindfulness" | string;
type LegacyPriority = "High" | "Medium" | "Sedang" | "Low" | string;
type LegacyDifficulty = "Expert" | "Hard" | "Medium" | "Sedang" | "Sulit" | "Easy" | string;

interface LegacyHabit {
  id: string;
  name: string;
  emoji?: string | null;
  category: LegacyHabitCategory;
  priority?: LegacyPriority | null;
  difficulty?: LegacyDifficulty | null;
  habitType?: string | null;
  target?: number | null;
  unit?: string | null;
  targetType?: string | null;
  targetDays?: number[] | null;
  graduatedAt?: string | null;
  scheduleJson?: string | null;
  reminder?: string | null;
  notes?: string | null;
  trackTime?: boolean | null;
  groupId?: string | null;
  goalId?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
  isArchived?: boolean | null;
  startDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyHabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  value?: number | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyDailyLog {
  id: string;
  date: string;
  mood?: number | null;
  energy?: number | null;
  sleep?: number | null;
  notes?: string | null;
  waterGlasses?: number | null;
  proteinGram?: number | null;
  weightKg?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyTransaction {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number;
  category: string;
  sourceId?: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: string | null;
  date: string;
  groupId?: string | null;
  transferPairId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyFundSource {
  id: string;
  name: string;
  emoji?: string | null;
  type: "cash" | "bank" | "ewallet" | "e-wallet" | "other" | string;
  initialBalance?: number | null;
  isArchived?: boolean | null;
  sortOrder?: number | null;
  createdAt?: string | null;
}

interface LegacyWeeklyBudget {
  id: string;
  category: string;
  month?: string | null;
  amount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyHabitGroup {
  id: string;
  name: string;
  color: string;
  sortOrder?: number | null;
}

interface LegacyWorkRoutine {
  id: string;
  title: string;
  timeOfDay?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyWorkRoutineLog {
  id: string;
  routineId: string;
  dayKey: string;
  done: boolean;
  doneAt?: string | null;
  createdAt?: string | null;
}

interface LegacyWorkTask {
  id: string;
  title: string;
  notes?: string | null;
  status?: string | null;
  dayKey?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyWorkNote {
  id: string;
  content: string;
  tag?: string | null;
  pinned?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface LegacyAppSettings {
  id?: string;
  userName?: string | null;
  theme?: string | null;
  themeColor?: string | null;
  weekStart?: number | null;
  language?: string | null;
  targetCompletion?: number | null;
  appLockHash?: string | null;
  updatedAt?: string | null;
}

export interface LegacyBackup {
  data: {
    habits?: LegacyHabit[];
    habitLogs?: LegacyHabitLog[];
    dailyLogs?: LegacyDailyLog[];
    transactions?: LegacyTransaction[];
    fundSources?: LegacyFundSource[];
    financeCategories?: Array<{ id: string; name: string; emoji?: string; color?: string; type?: string }>;
    weeklyBudgets?: LegacyWeeklyBudget[];
    savingsGoals?: Array<Record<string, unknown>>;
    recurringTransactions?: Array<Record<string, unknown>>;
    transactionRules?: Array<Record<string, unknown>>;
    goals?: Array<Record<string, unknown>>;
    habitOptions?: Array<{ id: string; type: string; label: string; color?: string; sortOrder?: number }>;
    habitGroups?: LegacyHabitGroup[];
    workRoutines?: LegacyWorkRoutine[];
    workRoutineLogs?: LegacyWorkRoutineLog[];
    workTasks?: LegacyWorkTask[];
    workNotes?: LegacyWorkNote[];
    workDayFlags?: Array<Record<string, unknown>>;
    appSettings?: LegacyAppSettings | Record<string, unknown>;
  };
}

// ============================================================================
// Mapping tables
// ============================================================================

const HABIT_CATEGORY_MAP: Record<string, Habit["category"]> = {
  Health: "Health",
  Fitness: "Health",
  Olahraga: "Health",
  Learning: "Learning",
  Mindfulness: "Mindfulness",
  Productivity: "Personal",
  General: "Personal",
  Social: "Personal",
  Creative: "Personal",
};

const PRIORITY_MAP: Record<string, NonNullable<Habit["priority"]>> = {
  high: "high",
  medium: "medium",
  sedang: "medium",
  low: "low",
};

const DIFFICULTY_MAP: Record<string, NonNullable<Habit["difficulty"]>> = {
  easy: "easy",
  medium: "medium",
  sedang: "medium",
  hard: "hard",
  sulit: "hard",
  expert: "hard",
};

// Emoji → ikon bawaan V2 (hanya 5 pilihan: book/water/movement/mind/write)
const EMOJI_ICON_MAP: Record<string, Habit["icon"]> = {
  "📚": "book",
  "📖": "book",
  "🧘": "mind",
  "🧠": "mind",
  "💧": "water",
  "🏃": "movement",
  "🏋️": "movement",
  "🏸": "movement",
  "🤸": "movement",
  "🦵": "movement",
  "🦾": "movement",
  "💪": "movement",
  "👞": "movement",
  "👟": "movement",
};

const TRANSACTION_CATEGORY_MAP: Record<string, Transaction["category"]> = {
  Gaji: "Gaji",
  "Lainnya (Pemasukan)": "Freelance",
  Investasi: "Freelance",
  "Transfer Masuk": "Freelance",
  "Makanan Berat": "Makanan",
  Kopi: "Makanan",
  Jajan: "Makanan",
  Belanja: "Makanan",
  Bensin: "Transportasi",
  Parkir: "Transportasi",
  "Pajak Motor": "Transportasi",
  "Servis Motor": "Transportasi",
  "Tagihan Listrik": "Tagihan",
  "Tagihan Air": "Tagihan",
  "Pulsa & Paket Data": "Tagihan",
  "Tagihan & Utilitas": "Tagihan",
  Badminton: "Kesehatan",
  Kesehatan: "Kesehatan",
  "Potong Rambut": "Kesehatan",
  Dating: "Lifestyle",
  Hiburan: "Lifestyle",
  "Skin Care": "Lifestyle",
  Hutang: "Lainnya",
  Loundry: "Lainnya",
  Lainnya: "Lainnya",
  "Tak Terduga": "Lainnya",
  "Penyesuaian Saldo": "Lainnya",
  "Transfer Keluar": "Lainnya",
  Pendidikan: "Lainnya",
  "Iuran Kas": "Lainnya",
};

const NEW_TRANSACTION_CATEGORIES: Transaction["category"][] = [
  "Gaji", "Freelance", "Makanan", "Transportasi", "Tagihan", "Lifestyle", "Kesehatan", "Lainnya",
];

// ============================================================================
// Helpers
// ============================================================================

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function toISODate(value: string | null | undefined): string {
  if (!value) return "";
  // Sudah YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // ISO datetime? Ambil 10 karakter pertama.
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

function mapHabitCategory(raw: string | undefined): Habit["category"] {
  if (!raw) return "Personal";
  return HABIT_CATEGORY_MAP[raw] ?? "Personal";
}

function mapPriority(raw: string | null | undefined): NonNullable<Habit["priority"]> {
  if (!raw) return "medium";
  return PRIORITY_MAP[raw.toLowerCase()] ?? "medium";
}

function mapDifficulty(raw: string | null | undefined): NonNullable<Habit["difficulty"]> {
  if (!raw) return "easy";
  return DIFFICULTY_MAP[raw.toLowerCase()] ?? "easy";
}

function mapEmojiToIcon(emoji: string | null | undefined, category: string): Habit["icon"] {
  if (emoji && EMOJI_ICON_MAP[emoji]) return EMOJI_ICON_MAP[emoji];
  // Fallback berdasarkan kategori
  if (category === "Health" || category === "Fitness" || category === "Olahraga") return "movement";
  if (category === "Learning") return "book";
  if (category === "Mindfulness") return "mind";
  return "write";
}

function parseReminderToTime(reminder: string | null | undefined): string {
  if (!reminder) return "07:00";
  // Contoh format V1: "05.00 AM", "07.30 PM"
  const match = /^(\d{1,2})[.:](\d{2})\s*(AM|PM)?$/i.exec(reminder.trim());
  if (!match) return "07:00";
  let hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function mapTransactionCategory(raw: string | undefined): Transaction["category"] {
  if (!raw) return "Lainnya";
  return TRANSACTION_CATEGORY_MAP[raw] ?? "Lainnya";
}

// ============================================================================
// Migration report (dipakai UI/API untuk memberi transparansi ke user)
// ============================================================================

export interface MigrationReport {
  sourceFormat: string;
  sourceKeys: string[];
  habits: { total: number; migrated: number; skippedArchived: number };
  habitCheckins: { total: number; inserted: number };
  dailyLogs: { total: number; toCheckins: number; toWellness: number };
  transactions: { total: number; migrated: number; skippedTransfer: number; skippedInvalid: number };
  fundSources: { total: number; migrated: number };
  weeklyBudgets: { total: number; migrated: number };
  habitGroups: { total: number; migrated: number };
  workRoutines: { total: number; migrated: number };
  workTasks: { total: number; migrated: number };
  workNotes: { total: number; migrated: number };
  goals: { total: number; migrated: number };
  savingsGoals: { total: number; migrated: number };
  recurring: { total: number; migrated: number };
  categoryRules: { total: number; migrated: number };
  settings: { migrated: boolean; userName?: string; theme?: string };
  unmappedCategories: string[];
  notes: string[];
}

// ============================================================================
// Transformer utama
// ============================================================================

export interface MigrationResult {
  workspace: { habits: Habit[]; transactions: Transaction[]; budgets: Budget[] };
  modules: WorkspaceModules;
  habitCheckins: Array<{ habitId: string; completedOn: string }>;
  report: MigrationReport;
}

const NEW_TRANSACTION_TYPE = new Set(["income", "expense"]);

export function isLegacyBackup(value: unknown): value is LegacyBackup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  // V2 backup punya `format` === "rutina-v2-backup"; V1 tidak punya `format` sama sekali.
  if (record.format === "rutina-v2-backup") return false;
  const data = record.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const dataRecord = data as Record<string, unknown>;
  // Harus punya setidaknya salah satu kunci khas V1.
  const knownKeys = ["habits", "habitLogs", "dailyLogs", "transactions", "fundSources", "habitGroups", "workRoutines"];
  return knownKeys.some((k) => Array.isArray(dataRecord[k]));
}

export function migrateLegacyBackup(input: unknown, todayISO: string): MigrationResult {
  if (!isLegacyBackup(input)) {
    throw new Error("File bukan backup legacy V1 Rutina. Pastikan file dari aplikasi Rutina lama.");
  }
  const data = input.data;
  const report: MigrationReport = {
    sourceFormat: "rutina-v1-legacy",
    sourceKeys: Object.keys(data),
    habits: { total: 0, migrated: 0, skippedArchived: 0 },
    habitCheckins: { total: 0, inserted: 0 },
    dailyLogs: { total: 0, toCheckins: 0, toWellness: 0 },
    transactions: { total: 0, migrated: 0, skippedTransfer: 0, skippedInvalid: 0 },
    fundSources: { total: 0, migrated: 0 },
    weeklyBudgets: { total: 0, migrated: 0 },
    habitGroups: { total: 0, migrated: 0 },
    workRoutines: { total: 0, migrated: 0 },
    workTasks: { total: 0, migrated: 0 },
    workNotes: { total: 0, migrated: 0 },
    goals: { total: 0, migrated: 0 },
    savingsGoals: { total: 0, migrated: 0 },
    recurring: { total: 0, migrated: 0 },
    categoryRules: { total: 0, migrated: 0 },
    settings: { migrated: false },
    unmappedCategories: [],
    notes: [],
  };

  // --- Habit groups (butuh lookup untuk groupName) ---
  const groupMap = new Map<string, HabitGroup>();
  const habitGroups: HabitGroup[] = asArray(data.habitGroups)
    .filter((g): g is LegacyHabitGroup => Boolean(g && typeof g.id === "string" && typeof g.name === "string"))
    .map((g) => {
      const mapped: HabitGroup = { id: g.id, name: g.name, color: g.color || "#64748b" };
      groupMap.set(g.id, mapped);
      return mapped;
    });
  report.habitGroups.total = asArray(data.habitGroups).length;
  report.habitGroups.migrated = habitGroups.length;

  // --- Habit logs → check-in history + today's completed flag ---
  const allLogs = asArray(data.habitLogs);
  report.habitCheckins.total = allLogs.length;
  const habitCheckins: Array<{ habitId: string; completedOn: string }> = [];
  const todayLogs = new Set<string>(); // habitId yang completed hari ini
  for (const log of allLogs) {
    if (!log || typeof log.habitId !== "string") continue;
    const date = toISODate(log.date);
    if (!date) continue;
    if (log.completed) {
      habitCheckins.push({ habitId: log.habitId, completedOn: date });
      if (date === todayISO) todayLogs.add(log.habitId);
    }
  }
  report.habitCheckins.inserted = habitCheckins.length;

  // --- Habits ---
  const legacyHabits = asArray<LegacyHabit>(data.habits);
  report.habits.total = legacyHabits.length;
  const habits: Habit[] = [];
  for (const h of legacyHabits) {
    if (!h || typeof h.id !== "string" || typeof h.name !== "string") continue;
    if (h.isArchived) { report.habits.skippedArchived++; continue; }
    const category = mapHabitCategory(h.category);
    const habit: Habit = {
      id: h.id,
      title: h.name.trim(),
      category,
      time: parseReminderToTime(h.reminder),
      duration: 15,
      completed: todayLogs.has(h.id),
      icon: mapEmojiToIcon(h.emoji, h.category ?? ""),
      streak: 0, // dihitung ulang oleh writeWorkspace dari habit_checkins
    };
    if (h.habitType === "avoid") habit.kind = "avoid";
    else if (h.habitType === "amount") habit.kind = "amount";
    else habit.kind = "normal";
    if (typeof h.target === "number" && h.target > 0) habit.targetAmount = h.target;
    habit.currentAmount = 0;
    if (typeof h.unit === "string" && h.unit) habit.unit = h.unit;
    habit.priority = mapPriority(h.priority);
    habit.difficulty = mapDifficulty(h.difficulty);
    if (h.groupId && groupMap.has(h.groupId)) habit.groupName = groupMap.get(h.groupId)!.name;
    habit.timeSpentMinutes = 0;
    habit.schedule = { kind: "daily" }; // semua habit V1 di backup ini daily
    habits.push(habit);
  }
  report.habits.migrated = habits.length;

  // --- Transactions ---
  const legacyTxns = asArray<LegacyTransaction>(data.transactions);
  report.transactions.total = legacyTxns.length;
  const transactions: Transaction[] = [];
  for (const t of legacyTxns) {
    if (!t || typeof t.id !== "string") { report.transactions.skippedInvalid++; continue; }
    if (t.type === "transfer") { report.transactions.skippedTransfer++; continue; }
    if (!NEW_TRANSACTION_TYPE.has(t.type)) { report.transactions.skippedInvalid++; continue; }
    const date = toISODate(t.date);
    if (!date) { report.transactions.skippedInvalid++; continue; }
    const amount = typeof t.amount === "number" && Number.isFinite(t.amount) ? t.amount : 0;
    if (amount <= 0) { report.transactions.skippedInvalid++; continue; }
    const rawCategory = t.category;
    const category = mapTransactionCategory(rawCategory);
    if (rawCategory && !TRANSACTION_CATEGORY_MAP[rawCategory] && !NEW_TRANSACTION_CATEGORIES.includes(rawCategory as Transaction["category"])) {
      if (!report.unmappedCategories.includes(rawCategory)) report.unmappedCategories.push(rawCategory);
    }
    const txn: Transaction = {
      id: t.id,
      title: (t.description || t.notes || "Tanpa judul").trim().slice(0, 120) || "Tanpa judul",
      category,
      type: t.type as Transaction["type"],
      amount,
      date,
    };
    if (t.sourceId) txn.walletId = t.sourceId;
    if (t.tags && typeof t.tags === "string" && t.tags.trim()) {
      const tags = t.tags.split(",").map((s) => s.trim()).filter(Boolean);
      if (tags.length) txn.tags = tags;
    }
    if (t.groupId) txn.splitGroupId = t.groupId;
    transactions.push(txn);
  }
  report.transactions.migrated = transactions.length;
  if (report.transactions.skippedTransfer > 0) {
    report.notes.push(`${report.transactions.skippedTransfer} transaksi bertipe "transfer" dilewati (tidak ada skema transfer antar-dompet di V2 — gunakan modul finance.transfers secara terpisah).`);
  }

  // --- Fund sources → wallets ---
  const legacyWallets = asArray<LegacyFundSource>(data.fundSources);
  report.fundSources.total = legacyWallets.length;
  const wallets: Wallet[] = legacyWallets
    .filter((w): w is LegacyFundSource => Boolean(w && typeof w.id === "string" && typeof w.name === "string"))
    .map((w) => ({
      id: w.id,
      name: w.name,
      type: (w.type === "ewallet" ? "e-wallet" : (w.type || "other")) as Wallet["type"],
      openingBalance: typeof w.initialBalance === "number" ? w.initialBalance : 0,
    }));
  report.fundSources.migrated = wallets.length;

  // --- Weekly budgets ---
  const legacyWeekly = asArray(data.weeklyBudgets);
  report.weeklyBudgets.total = legacyWeekly.length;
  const weeklyBudgets: WeeklyBudget[] = legacyWeekly
    .filter((w): w is LegacyWeeklyBudget => Boolean(w && typeof w.category === "string" && typeof w.amount === "number"))
    .map((w) => ({ category: mapTransactionCategory(w.category), limit: w.amount }));
  report.weeklyBudgets.migrated = weeklyBudgets.length;

  // V2 juga punya `budgets` (workspace) untuk limit bulanan. Karena V1 hanya punya
  // weeklyBudgets dengan field `month`, kita tidak memigrasikannya ke workspace.budgets
  // (kategori V1 tidak selalu cocok dengan enum V2). Workspace.budgets tetap pakai
  // initialBudgets dari seed.
  const budgets: Budget[] = [];

  // --- Daily logs → checkins + wellness ---
  const legacyDaily = asArray(data.dailyLogs);
  report.dailyLogs.total = legacyDaily.length;
  const checkins: DailyCheckin[] = [];
  const wellness: WellnessEntry[] = [];
  for (const log of legacyDaily) {
    if (!log || typeof log.date !== "string") continue;
    const date = toISODate(log.date);
    if (!date) continue;
    checkins.push({
      date,
      mood: typeof log.mood === "number" ? log.mood : 3,
      energy: typeof log.energy === "number" ? log.energy : 3,
      sleepHours: typeof log.sleep === "number" ? log.sleep : 0,
      notes: log.notes || "",
    });
    if (log.waterGlasses != null || log.proteinGram != null || log.weightKg != null) {
      wellness.push({
        date,
        waterMl: typeof log.waterGlasses === "number" ? log.waterGlasses * 250 : 0,
        proteinGrams: typeof log.proteinGram === "number" ? log.proteinGram : 0,
        weightKg: typeof log.weightKg === "number" ? log.weightKg : null,
        note: log.notes || "",
      });
    }
  }
  report.dailyLogs.toCheckins = checkins.length;
  report.dailyLogs.toWellness = wellness.length;

  // --- Work routines ---
  const legacyRoutines = asArray(data.workRoutines);
  report.workRoutines.total = legacyRoutines.length;
  const routineLogMap = new Map<string, string>(); // routineId → lastDone (ISO date)
  for (const log of asArray(data.workRoutineLogs)) {
    if (!log || typeof log.routineId !== "string") continue;
    if (!log.done) continue;
    const dayKey = typeof log.dayKey === "string" ? toISODate(log.dayKey) : "";
    if (!dayKey) continue;
    const existing = routineLogMap.get(log.routineId);
    if (!existing || dayKey > existing) routineLogMap.set(log.routineId, dayKey);
  }
  const routines: WorkRoutine[] = legacyRoutines
    .filter((r): r is LegacyWorkRoutine => Boolean(r && typeof r.id === "string" && typeof r.title === "string"))
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.timeOfDay ? `Waktu: ${r.timeOfDay}` : "",
      frequency: r.timeOfDay || "daily",
      lastDone: routineLogMap.get(r.id) || "",
    }));
  report.workRoutines.migrated = routines.length;

  // --- Work tasks ---
  const legacyTasks = asArray(data.workTasks);
  report.workTasks.total = legacyTasks.length;
  const tasks: WorkTask[] = legacyTasks
    .filter((t): t is LegacyWorkTask => Boolean(t && typeof t.id === "string" && typeof t.title === "string"))
    .map((t) => {
      const rawStatus = (t.status || "").toLowerCase();
      let status: WorkTask["status"] = "todo";
      if (rawStatus === "selesai" || rawStatus === "done" || t.completedAt) status = "done";
      else if (rawStatus === "doing" || rawStatus === "proses" || rawStatus === "in-progress") status = "doing";
      return {
        id: t.id,
        title: t.title,
        description: t.notes || "",
        priority: "medium",
        status,
        dueDate: t.dueAt ? toISODate(t.dueAt) : (t.dayKey ? toISODate(t.dayKey) : ""),
        createdAt: t.createdAt ? toISODate(t.createdAt) : "",
      };
    });
  report.workTasks.migrated = tasks.length;

  // --- Work notes ---
  const legacyNotes = asArray(data.workNotes);
  report.workNotes.total = legacyNotes.length;
  const notes: WorkNote[] = legacyNotes
    .filter((n): n is LegacyWorkNote => Boolean(n && typeof n.id === "string" && typeof n.content === "string"))
    .map((n) => {
      const content = n.content || "";
      // Pisahkan baris pertama sebagai title, sisanya sebagai body.
      const lines = content.split("\n");
      const title = lines[0]?.trim().slice(0, 80) || "Catatan";
      const body = content;
      const tags: string[] = [];
      if (n.tag) tags.push(n.tag);
      return {
        id: n.id,
        title,
        body,
        tags,
        updatedAt: n.updatedAt ? toISODate(n.updatedAt) : "",
      };
    });
  report.workNotes.migrated = notes.length;

  // --- Goals (V1 kosong di backup ini) ---
  report.goals.total = asArray(data.goals).length;
  report.goals.migrated = 0;

  // --- Savings goals / recurring / category rules (V1 kosong) ---
  report.savingsGoals.total = asArray(data.savingsGoals).length;
  report.recurring.total = asArray(data.recurringTransactions).length;
  report.categoryRules.total = asArray(data.transactionRules).length;

  // --- Settings ---
  const legacySettings = data.appSettings as LegacyAppSettings | undefined;
  const settings = {
    vacationMode: false,
    theme: (legacySettings && legacySettings.theme === "dark") ? "dark" as const
      : (legacySettings && legacySettings.theme === "light") ? "light" as const
      : "system" as const,
  };
  report.settings.migrated = true;
  if (legacySettings?.userName) report.settings.userName = legacySettings.userName;
  if (legacySettings?.theme) report.settings.theme = legacySettings.theme;
  if (legacySettings?.userName && legacySettings.userName !== "Ananda Tegar C.S") {
    // noop — hanya catatan, tidak ada field di V2
  }

  const modules: WorkspaceModules = {
    ...EMPTY_MODULES,
    goals: [],
    checkins,
    tasks,
    notes,
    routines,
    wellness,
    workouts: [],
    programs: [],
    progressPhotos: [],
    habitGroups,
    settings,
    finance: {
      wallets,
      transfers: [],
      recurring: [],
      savingsGoals: [],
      categoryRules: [],
      weeklyBudgets,
    },
  };
  // Pastikan bentuk modules tetap valid walau ada field aneh dari V1.
  const normalizedModules = normalizeModules(modules);

  return {
    workspace: { habits, transactions, budgets },
    modules: normalizedModules,
    habitCheckins,
    report,
  };
}

// ============================================================================
// Shared DB write logic — dipakai /api/migrate-legacy DAN /api/backup (auto-route)
// ============================================================================

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

export interface ApplyMigrationResult {
  ok: true;
  mode: "legacy-migration";
  report: MigrationReport;
  restored: Record<string, number>;
}

/**
 * Jalankan migrasi V1 → V2: insert check-in historis, gabungkan workspace,
 * gabungkan & simpan modul. Dipakai bersama oleh endpoint /api/migrate-legacy
 * dan /api/backup (auto-route file V1).
 *
 * Fungsi ini TIDAK membungkus error — pemanggil bertanggung jawab try/catch.
 */
export async function applyLegacyMigration(body: unknown, todayISO: string): Promise<ApplyMigrationResult> {
  const migration = migrateLegacyBackup(body, todayISO);
  const { workspace, modules: incomingModules, habitCheckins, report } = migration;

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
  const currentWorkspace = await readWorkspace(todayISO);
  const mergedWorkspace = {
    habits: mergeByKey(currentWorkspace.habits, workspace.habits, (item) => item.id),
    transactions: mergeByKey(currentWorkspace.transactions, workspace.transactions, (item) => item.id),
    budgets: mergeByKey(currentWorkspace.budgets, workspace.budgets, (item) => item.category),
  };
  await writeWorkspace(mergedWorkspace, todayISO);

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

  return {
    ok: true,
    mode: "legacy-migration",
    report,
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
  };
}
