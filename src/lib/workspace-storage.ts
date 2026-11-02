import type { Habit, Transaction } from "@/lib/types";

const STORAGE_KEY = "rutina.v2.workspace";

export interface WorkspaceSnapshot {
  habits: Habit[];
  transactions: Transaction[];
}

export function loadWorkspace(): Partial<WorkspaceSnapshot> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      habits: Array.isArray(value.habits) ? value.habits : undefined,
      transactions: Array.isArray(value.transactions) ? value.transactions : undefined,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveWorkspace(snapshot: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
