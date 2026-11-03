"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { todayISO } from "@/lib/format";

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

// Snapshot kosong — TANPA data demo. Server (Turso) adalah sumber kebenaran
// tunggal. Sebelumnya snapshot demo + push localStorage ke server kosong
// mencemari database dengan data yang bukan milik user.
function emptySnapshot(): WorkspaceSnapshot {
  return { habits: [], transactions: [], budgets: [] };
}

const SERVER_SNAPSHOT = JSON.stringify(emptySnapshot());
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
    // Biarkan snapshot kosong saat browser storage tidak tersedia.
  }
}

function normalizeSnapshot(raw: string): WorkspaceSnapshot {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
    };
  } catch {
    return emptySnapshot();
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

// ---------------------------------------------------------------------------
// fetch dengan retry otomatis. Transient failure (dev server sedang hot-reload,
// blip jaringan sesaat, 5xx sesaat) jangan langsung jadi "error" yang memunculkan
// toast "Sambungan ke server terputus". Coba ulang sampai 3x dengan backoff
// 400ms / 800ms. Hanya setelah semua percobaan gagal baru lempar → caller set
// "error". Status 4xx (mis. 401/503) TIDAK di-retry — itu kegagalan permanen
// (auth/konfigurasi), langsung dikembalikan ke caller untuk dihandle.
// ---------------------------------------------------------------------------
const SYNC_MAX_ATTEMPTS = 3;
const SYNC_BACKOFF_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(input: string, init?: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= SYNC_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);
      // 5xx = server sesaat tidak siap (mis. recompile) → retry.
      // 4xx = kegagalan permanen (auth/payload) → kembalikan langsung.
      if (response.status >= 500 && attempt < SYNC_MAX_ATTEMPTS) {
        lastResponse = response;
        await sleep(SYNC_BACKOFF_MS * attempt);
        continue;
      }
      return response;
    } catch (err) {
      // Network error (fetch throw) → retry bila masih ada kesempatan.
      if (attempt >= SYNC_MAX_ATTEMPTS) throw err;
      await sleep(SYNC_BACKOFF_MS * attempt);
    }
  }
  // Semua retry habis pada jalur 5xx — kembalikan response 5xx terakhir.
  return lastResponse ?? new Response("retry exhausted", { status: 503 });
}

function enqueueRemoteWrite(snapshot: WorkspaceSnapshot): void {
  if (!remoteReady) return;

  setSyncStatus("syncing");
  writeQueue = writeQueue
    .then(async () => {
      const response = await fetchWithRetry("/api/workspace", {
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
      const response = await fetchWithRetry(`/api/workspace?today=${encodeURIComponent(todayISO())}`, {
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

      // Server (Turso) adalah sumber kebenaran — data remote SELALU menimpa
      // snapshot lokal. Dulu ada blok "first connection" yang push localStorage
      // ke server kosong; itu mencemari database dengan data demo lama dan
      // sudah dihapus dengan sengaja.
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
