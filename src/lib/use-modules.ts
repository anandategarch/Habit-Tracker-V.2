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

export function useModules() {
  const [modules, setModules] = useState<WorkspaceModules>(EMPTY_MODULES);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocal();

    void (async () => {
      try {
        const response = await fetch("/api/modules", { cache: "no-store" });
        if (!response.ok) throw new Error("Remote modules unavailable");
        const payload = await response.json() as { modules?: unknown };
        if (cancelled) return;
        const remote = normalizeModules(payload.modules);
        const merged = normalizeModules(Object.fromEntries(
          Object.keys(EMPTY_MODULES).map((key) => {
            const localValue = (local as unknown as Record<string, unknown>)[key];
            const remoteValue = (remote as unknown as Record<string, unknown>)[key];
            const localHas = key === "finance"
              ? Object.values((localValue ?? {}) as Record<string, unknown>).some((part) => Array.isArray(part) && part.length > 0)
              : key === "settings"
                ? Boolean((localValue as WorkspaceModules["settings"] | undefined)?.vacationMode || (localValue as WorkspaceModules["settings"] | undefined)?.theme !== "system")
                : Array.isArray(localValue) && localValue.length > 0;
            const remoteHas = key === "finance"
              ? Object.values((remoteValue ?? {}) as Record<string, unknown>).some((part) => Array.isArray(part) && part.length > 0)
              : key === "settings"
                ? Boolean((remoteValue as WorkspaceModules["settings"] | undefined)?.vacationMode || (remoteValue as WorkspaceModules["settings"] | undefined)?.theme !== "system")
                : Array.isArray(remoteValue) && remoteValue.length > 0;
            return [key, !remoteHas && localHas ? localValue : remoteValue];
          }),
        ));
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
      const nextValue = typeof update === "function"
        ? (update as (value: WorkspaceModules[K]) => WorkspaceModules[K])(current[key])
        : update;
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
        }).catch(() => setRemoteReady(false));
      }
      return next;
    });
  }, [remoteReady]);

  return { modules, updateModule, ready };
}
