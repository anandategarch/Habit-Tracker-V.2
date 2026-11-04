"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_MODULES, normalizeModules, type WorkspaceModuleKey, type WorkspaceModules } from "@/lib/module-types";

const STORAGE_KEY = "rutina.v2.extended-modules";
let writeQueue: Promise<void> = Promise.resolve();

function readLocal(): WorkspaceModules {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeModules(JSON.parse(raw)) : EMPTY_MODULES;
  } catch {
    return EMPTY_MODULES;
  }
}

function hasData(value: WorkspaceModules): boolean {
  return Object.entries(value).some(([key, item]) => key === "finance"
    ? Object.values(item as Record<string, unknown>).some((part) => Array.isArray(part) && part.length > 0)
    : key === "settings"
      ? Boolean((item as WorkspaceModules["settings"]).vacationMode || (item as WorkspaceModules["settings"]).theme !== "system")
      : Array.isArray(item) && item.length > 0);
}

function persistLocal(value: WorkspaceModules): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* memory state remains usable */ }
}

function mergeRecords<T>(local: T[], remote: T[], keyOf: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(keyOf(item), item);
  for (const item of remote) merged.set(keyOf(item), item);
  return [...merged.values()];
}

function mergeModuleData(local: WorkspaceModules, remote: WorkspaceModules): WorkspaceModules {
  // Setelan (mode libur): last-write-wins via stempel waktu updatedAt.
  // Aturan lama `remote.vacationMode || local.vacationMode` membuat server
  // basi (true) selalu mengalahkan tombol terbaru pengguna (false) setelah
  // reload — mode libur "hidup kembali" sendiri (audit v0.4.1).
  const localStamp = typeof local.settings.updatedAt === "number" ? local.settings.updatedAt : 0;
  const remoteStamp = typeof remote.settings.updatedAt === "number" ? remote.settings.updatedAt : 0;
  // Prioritas: yang bertstempel dan paling baru. Bila keduanya tanpa stempel
  // (data lama), remote tetap diutamakan — perilaku lama terjaga (perangkat
  // baru tanpa data lokal mengikuti snapshot server).
  const useLocal = localStamp > 0 && localStamp >= remoteStamp;
  const settingsSource = useLocal ? local.settings : remote.settings;
  const settings: WorkspaceModules["settings"] = { ...settingsSource, updatedAt: Math.max(localStamp, remoteStamp) || undefined };
  return normalizeModules({
    goals: mergeRecords(local.goals, remote.goals, (item) => item.id),
    checkins: mergeRecords(local.checkins, remote.checkins, (item) => item.date),
    tasks: mergeRecords(local.tasks, remote.tasks, (item) => item.id),
    notes: mergeRecords(local.notes, remote.notes, (item) => item.id),
    routines: mergeRecords(local.routines, remote.routines, (item) => item.id),
    wellness: mergeRecords(local.wellness, remote.wellness, (item) => item.date),
    workouts: mergeRecords(local.workouts, remote.workouts, (item) => item.id),
    programs: mergeRecords(local.programs, remote.programs, (item) => item.id),
    progressPhotos: mergeRecords(local.progressPhotos, remote.progressPhotos, (item) => item.id).slice(-5),
    habitGroups: mergeRecords(local.habitGroups, remote.habitGroups, (item) => item.id),
    settings,
    finance: {
      wallets: mergeRecords(local.finance.wallets, remote.finance.wallets, (item) => item.id),
      transfers: mergeRecords(local.finance.transfers, remote.finance.transfers, (item) => item.id),
      recurring: mergeRecords(local.finance.recurring, remote.finance.recurring, (item) => item.id),
      savingsGoals: mergeRecords(local.finance.savingsGoals, remote.finance.savingsGoals, (item) => item.id),
      categoryRules: mergeRecords(local.finance.categoryRules, remote.finance.categoryRules, (item) => item.id),
      weeklyBudgets: mergeRecords(local.finance.weeklyBudgets, remote.finance.weeklyBudgets, (item) => item.category),
    },
  });
}

export function useModules() {
  const [modules, setModules] = useState<WorkspaceModules>(EMPTY_MODULES);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocal();

    void (async () => {
      try {
        // Timeout 10 detik: jaringan menggantung tidak boleh menahan loader
        // awal selamanya — lanjut dengan snapshot localStorage (offline-first).
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        try {
          response = await fetch("/api/modules", { cache: "no-store", signal: controller.signal });
        } finally {
          window.clearTimeout(timeoutId);
        }
        if (!response.ok) throw new Error("Remote modules unavailable");
        const payload = await response.json() as { modules?: unknown };
        if (cancelled) return;
        const remote = normalizeModules(payload.modules);
        const merged = mergeModuleData(local, remote);
        setModules(merged);
        persistLocal(merged);
        setRemoteReady(true);
        if (hasData(merged) && (!hasData(remote) || JSON.stringify(merged) !== JSON.stringify(remote))) {
          writeQueue = writeQueue.then(async () => {
            await fetch("/api/modules", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ modules: merged }),
            });
          }).catch(() => undefined);
        }
      } catch {
        if (!cancelled) setModules(local);
        setRemoteReady(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const updateModule = useCallback(<K extends WorkspaceModuleKey>(
    key: K,
    update: WorkspaceModules[K] | ((current: WorkspaceModules[K]) => WorkspaceModules[K]),
  ) => {
    setModules((current) => {
      const rawValue = typeof update === "function"
        ? (update as (value: WorkspaceModules[K]) => WorkspaceModules[K])(current[key])
        : update;
      // Stempel waktu pada setiap perubahan setelan → last-write-wins saat
      // merge sinkronisasi (mode libur tidak lagi kembali diam-diam).
      const nextValue = key === "settings" && rawValue && typeof rawValue === "object"
        ? { ...(rawValue as WorkspaceModules["settings"]), updatedAt: Date.now() } as WorkspaceModules[K]
        : rawValue;
      const next = { ...current, [key]: nextValue };
      persistLocal(next);
      if (remoteReady) {
        writeQueue = writeQueue.then(async () => {
          const response = await fetch("/api/modules", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modules: { [key]: nextValue } }),
          });
          if (!response.ok) throw new Error("Module sync failed");
        }).catch(() => {
          setRemoteReady(false);
          // Jangan telan kegagalan diam-diam: beri tahu UI (pola sama dengan
          // use-workspace) agar pengguna tahu perubahan belum tersinkron.
          try {
            window.dispatchEvent(new CustomEvent("rutina:sync-failed"));
          } catch { /* lingkungan non-DOM */ }
        });
      }
      return next;
    });
  }, [remoteReady]);

  return { modules, updateModule, ready };
}
