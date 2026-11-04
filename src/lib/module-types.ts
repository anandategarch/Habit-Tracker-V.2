export interface Milestone { id: string; title: string; completed: boolean }
export interface Goal { id: string; title: string; description: string; dueDate: string; category: string; milestones: Milestone[]; completed: boolean; createdAt: string }
export interface DailyCheckin { date: string; mood: number; energy: number; sleepHours: number; notes: string }
export type TaskStatus = "todo" | "doing" | "done";
export interface WorkTask { id: string; title: string; description: string; priority: "low" | "medium" | "high"; status: TaskStatus; dueDate: string; createdAt: string }
export interface WorkNote { id: string; title: string; body: string; tags: string[]; updatedAt: string }
export interface WorkRoutine { id: string; title: string; description: string; frequency: string; lastDone: string }
export interface WellnessEntry { date: string; waterMl: number; proteinGrams: number; weightKg: number | null; note: string }
export interface WorkoutExercise { id: string; name: string; sets: number; reps: number; weightKg: number }
export interface WorkoutSession { id: string; date: string; title: string; durationMinutes: number; cardioMinutes: number; notes: string; exercises: WorkoutExercise[] }
export interface WorkoutProgram { id: string; title: string; days: string; description: string; active: boolean }
export interface ProgressPhoto { id: string; date: string; label: string; note: string; imageData: string }
export interface Wallet { id: string; name: string; type: "cash" | "bank" | "e-wallet" | "other"; openingBalance: number }
export interface MoneyTransfer { id: string; fromWalletId: string; toWalletId: string; amount: number; date: string; note: string }
export interface RecurringTransaction { id: string; title: string; amount: number; type: "income" | "expense"; category: string; frequency: "weekly" | "monthly" | "yearly"; nextDate: string; active: boolean }
export interface SavingsGoal { id: string; title: string; targetAmount: number; savedAmount: number; dueDate: string }
export interface CategoryRule { id: string; keyword: string; category: string }
export interface WeeklyBudget { category: string; limit: number }
export interface FinanceExtras {
  wallets: Wallet[]; transfers: MoneyTransfer[]; recurring: RecurringTransaction[];
  savingsGoals: SavingsGoal[]; categoryRules: CategoryRule[]; weeklyBudgets: WeeklyBudget[];
}
export interface HabitGroup { id: string; name: string; color: string }
export interface WorkspaceSettings { vacationMode: boolean; theme: "system" | "light" | "dark"; updatedAt?: number }

export interface WorkspaceModules {
  goals: Goal[]; checkins: DailyCheckin[]; tasks: WorkTask[]; notes: WorkNote[];
  routines: WorkRoutine[]; wellness: WellnessEntry[]; workouts: WorkoutSession[]; habitGroups: HabitGroup[];
  programs: WorkoutProgram[]; progressPhotos: ProgressPhoto[]; settings: WorkspaceSettings; finance: FinanceExtras;
}
export type WorkspaceModuleKey = keyof WorkspaceModules;
export type UpdateWorkspaceModule = <K extends WorkspaceModuleKey>(
  key: K,
  update: WorkspaceModules[K] | ((current: WorkspaceModules[K]) => WorkspaceModules[K]),
) => void;
export const EMPTY_FINANCE_EXTRAS: FinanceExtras = {
  wallets: [], transfers: [], recurring: [], savingsGoals: [], categoryRules: [], weeklyBudgets: [],
};
export const EMPTY_MODULES: WorkspaceModules = {
  goals: [], checkins: [], tasks: [], notes: [], routines: [], wellness: [],
  workouts: [], programs: [], progressPhotos: [], habitGroups: [], settings: { vacationMode: false, theme: "system" }, finance: EMPTY_FINANCE_EXTRAS,
};
export function normalizeModules(value: unknown): WorkspaceModules {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_MODULES;
  const record = value as Partial<WorkspaceModules>;
  const finance = record.finance && typeof record.finance === "object" ? record.finance as Partial<FinanceExtras> : {};
  return {
    goals: Array.isArray(record.goals) ? record.goals : [],
    checkins: Array.isArray(record.checkins) ? record.checkins : [],
    tasks: Array.isArray(record.tasks) ? record.tasks : [],
    notes: Array.isArray(record.notes) ? record.notes : [],
    routines: Array.isArray(record.routines) ? record.routines : [],
    wellness: Array.isArray(record.wellness) ? record.wellness : [],
    workouts: Array.isArray(record.workouts) ? record.workouts : [],
    programs: Array.isArray(record.programs) ? record.programs : [],
    progressPhotos: Array.isArray(record.progressPhotos) ? record.progressPhotos : [],
    habitGroups: Array.isArray(record.habitGroups) ? record.habitGroups.filter((item): item is HabitGroup => Boolean(item && typeof item === "object" && typeof (item as HabitGroup).id === "string" && typeof (item as HabitGroup).name === "string" && typeof (item as HabitGroup).color === "string")) : [],
    settings: record.settings && typeof record.settings === "object"
      ? {
          vacationMode: Boolean((record.settings as Partial<WorkspaceSettings>).vacationMode),
          theme: ["system", "light", "dark"].includes(String((record.settings as Partial<WorkspaceSettings>).theme)) ? (record.settings as WorkspaceSettings).theme : "system",
          // Stempel waktu penulisan terakhir (last-write-wins saat merge).
          // Data lama tanpa stempel dianggap lebih tua dari data bertstempel.
          updatedAt: Number.isFinite((record.settings as Partial<WorkspaceSettings>).updatedAt) ? (record.settings as WorkspaceSettings).updatedAt : undefined,
        }
      : { vacationMode: false, theme: "system" },
    finance: {
      wallets: Array.isArray(finance.wallets) ? finance.wallets : [],
      transfers: Array.isArray(finance.transfers) ? finance.transfers : [],
      recurring: Array.isArray(finance.recurring) ? finance.recurring : [],
      savingsGoals: Array.isArray(finance.savingsGoals) ? finance.savingsGoals : [],
      categoryRules: Array.isArray(finance.categoryRules) ? finance.categoryRules : [],
      weeklyBudgets: Array.isArray(finance.weeklyBudgets) ? finance.weeklyBudgets : [],
    },
  };
}
