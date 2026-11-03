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

function persistLocal(value: WorkspaceModules): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* memory state remains usable */ }
}

export function useModules() {
  const [modules, setModules] = useState<WorkspaceModules>(EMPTY_MODULES);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/modules", { cache: "no-store" });
        if (!response.ok) throw new Error("Remote modules unavailable");
        const payload = await response.json() as { modules?: unknown };
        if (cancelled) return;
        // Server (Turso) adalah sumber kebenaran tunggal — data remote SELALU
        // menimpa localStorage. Dulu: merge localStorage (berisi data demo
        // lama) + remote lalu push balik ke server — itu mencemari database.
        // Push ke server HANYA terjadi lewat updateModule (aksi user eksplisit).
        const remote = normalizeModules(payload.modules);
        setModules(remote);
        persistLocal(remote);
        setRemoteReady(true);
      } catch {
        if (!cancelled) setModules(readLocal());
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
