"use client";

import { useSyncExternalStore } from "react";
import type { Habit, Transaction } from "@/lib/types";
import { initialHabits, initialTransactions } from "@/lib/seed-data";

const STORAGE_KEY = "rutina.v2.workspace";
const CHANGE_EVENT = "rutina:workspace-change";

export interface WorkspaceSnapshot {
  habits: Habit[];
  transactions: Transaction[];
}

type Update<T> = T | ((current: T) => T);

const SEED_SNAPSHOT: WorkspaceSnapshot = {
  habits: initialHabits,
  transactions: initialTransactions,
};

const SERVER_SNAPSHOT = JSON.stringify(SEED_SNAPSHOT);
let memorySnapshot = SERVER_SNAPSHOT;

function normalizeSnapshot(raw: string): WorkspaceSnapshot {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : initialHabits,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : initialTransactions,
    };
  } catch {
    return SEED_SNAPSHOT;
  }
}

function getSnapshot(): string {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored;
  } catch {
    // Continue with the in-memory snapshot when browser storage is unavailable.
  }

  return memorySnapshot;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function publishSnapshot(snapshot: WorkspaceSnapshot): void {
  const serialized = JSON.stringify(snapshot);
  memorySnapshot = serialized;

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // The app remains usable in memory if storage is blocked or full.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWorkspace() {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const snapshot = normalizeSnapshot(serialized);

  function updateHabits(update: Update<Habit[]>): void {
    const current = normalizeSnapshot(getSnapshot());
    const habits = typeof update === "function" ? update(current.habits) : update;
    publishSnapshot({ ...current, habits });
  }

  function updateTransactions(update: Update<Transaction[]>): void {
    const current = normalizeSnapshot(getSnapshot());
    const transactions = typeof update === "function" ? update(current.transactions) : update;
    publishSnapshot({ ...current, transactions });
  }

  return {
    habits: snapshot.habits,
    transactions: snapshot.transactions,
    updateHabits,
    updateTransactions,
  };
}
