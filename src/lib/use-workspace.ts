"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { initialBudgets, initialHabits, getInitialTransactions } from "@/lib/seed-data";

const STORAGE_KEY = "rutina.v2.workspace";
const CHANGE_EVENT = "rutina:workspace-change";

export interface WorkspaceSnapshot {
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
}

interface RemoteWorkspace extends WorkspaceSnapshot {
  isEmpty: boolean;
}

type Update<T> = T | ((current: T) => T);
type SyncStatus = "local" | "syncing" | "synced" | "error";

// Dibangun ulang saat dipanggil agar tanggal demo (todayISO) tidak membeku
// pada saat proses pertama kali memuat modul.
function seedSnapshot(): WorkspaceSnapshot {
  return {
    habits: initialHabits,
    transactions: getInitialTransactions(),
    budgets: initialBudgets,
  };
}

const SERVER_SNAPSHOT = JSON.stringify(seedSnapshot());
let memorySnapshot = SERVER_SNAPSHOT;
let syncStatus: SyncStatus = "local";
let remoteReady = false;
let refreshPromise: Promise<boolean> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let autoRefreshStarted = false;
let workspaceReady = false;

if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) memorySnapshot = JSON.stringify(normalizeSnapshot(stored));
  } catch {
    // Keep the in-memory demo snapshot when browser storage is unavailable.
  }
}

function normalizeSnapshot(raw: string): WorkspaceSnapshot {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : initialHabits,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : getInitialTransactions(),
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : initialBudgets,
    };
  } catch {
    return seedSnapshot();
  }
}

function getSnapshot(): string {
  return memorySnapshot;
}

function getSyncStatus(): SyncStatus {
  return syncStatus;
}

function getWorkspaceReady(): boolean {
  return workspaceReady;
}

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function setSyncStatus(status: SyncStatus): void {
  syncStatus = status;
  emitChange();
}

function readPersistedLocalSnapshot(): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSnapshot(stored) : null;
  } catch {
    return null;
  }
}

function publishSnapshot(snapshot: WorkspaceSnapshot): void {
  const serialized = JSON.stringify(snapshot);
  memorySnapshot = serialized;

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // The workspace remains available in memory if browser storage is blocked or full.
  }

  emitChange();
}

function enqueueRemoteWrite(snapshot: WorkspaceSnapshot): void {
  if (!remoteReady) return;

  setSyncStatus("syncing");
  writeQueue = writeQueue
    .then(async () => {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...snapshot, today: todayISO() }),
      });

      if (!response.ok) {
        if (response.status === 401) remoteReady = false;
        throw new Error("Turso sync failed");
      }

      setSyncStatus("synced");
    })
    .catch(() => {
      setSyncStatus("error");
    });
}

export async function refreshWorkspace(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    setSyncStatus("syncing");

    try {
      const response = await fetch(`/api/workspace?today=${encodeURIComponent(todayISO())}`, {
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 503) {
        remoteReady = false;
        setSyncStatus("local");
        return false;
      }

      if (!response.ok) {
        remoteReady = false;
        setSyncStatus("error");
        return false;
      }

      const remote = (await response.json()) as RemoteWorkspace;
      const localSnapshot = readPersistedLocalSnapshot();

      // First connection: preserve the user's existing browser data in the empty database.
      if (
        remote.isEmpty &&
        localSnapshot &&
        (localSnapshot.habits.length > 0 || localSnapshot.transactions.length > 0)
      ) {
        const migrationResponse = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...localSnapshot, today: todayISO() }),
        });

        if (!migrationResponse.ok) {
          remoteReady = false;
          setSyncStatus("error");
          return false;
        }

        remoteReady = true;
        publishSnapshot(localSnapshot);
        setSyncStatus("synced");
        return true;
      }

      remoteReady = true;
      publishSnapshot({
        habits: remote.habits,
        transactions: remote.transactions,
        budgets: remote.budgets,
      });
      setSyncStatus("synced");
      return true;
    } catch {
      remoteReady = false;
      setSyncStatus("local");
      return false;
    }
  })().finally(() => {
    workspaceReady = true;
    refreshPromise = null;
    emitChange();
  });

  return refreshPromise;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    memorySnapshot = JSON.stringify(normalizeSnapshot(event.newValue));
    callback();
  };

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useWorkspace() {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const status = useSyncExternalStore(subscribe, getSyncStatus, () => "local" as SyncStatus);
  const isReady = useSyncExternalStore(subscribe, getWorkspaceReady, () => false);
  const snapshot = normalizeSnapshot(serialized);

  useEffect(() => {
    if (autoRefreshStarted) return;
    autoRefreshStarted = true;
    void refreshWorkspace();
  }, []);

  function updateHabits(update: Update<Habit[]>): void {
    const current = normalizeSnapshot(getSnapshot());
    const habits = typeof update === "function" ? update(current.habits) : update;
    const next = { ...current, habits };
    publishSnapshot(next);
    enqueueRemoteWrite(next);
  }

  function updateTransactions(update: Update<Transaction[]>): void {
    const current = normalizeSnapshot(getSnapshot());
    const transactions = typeof update === "function" ? update(current.transactions) : update;
    const next = { ...current, transactions };
    publishSnapshot(next);
    enqueueRemoteWrite(next);
  }

  return {
    habits: snapshot.habits,
    transactions: snapshot.transactions,
    budgets: snapshot.budgets,
    syncStatus: status,
    isReady,
    updateHabits,
    updateTransactions,
    refreshWorkspace,
  };
}
