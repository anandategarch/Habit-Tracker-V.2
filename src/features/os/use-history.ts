"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { isScheduledOn } from "@/lib/habit-schedule";
import type { Habit } from "@/lib/types";

/* ==========================================================================
   RUTINA OS — local check-in journal
   Heatmaps, streaks and trends need day-by-day history. The remote Turso DB
   has it (habit_checkins), but this app must stay fully functional offline —
   so the journal keeps a local log (habitId → dates) and enriches it with
   server history whenever the workspace sync is live.
   ========================================================================== */

const KEY = "rutina.os.history.v1";
const EVENT = "rutina:os-history-change";

export type JournalRecord = Record<string, string[]>;

let snapshotJson = "{}";
let serverHydrated = false;

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) snapshotJson = JSON.stringify(normalize(raw));
  } catch {
    /* storage unavailable — in-memory journal still works */
  }
}

function normalize(raw: string): JournalRecord {
  try {
    const parsed = JSON.parse(raw) as JournalRecord;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: JournalRecord = {};
    for (const [habitId, dates] of Object.entries(parsed)) {
      if (typeof habitId !== "string" || !Array.isArray(dates)) continue;
      const clean = [...new Set(dates.filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
      if (clean.length > 0) out[habitId] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function publish(next: JournalRecord): void {
  snapshotJson = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, snapshotJson);
  } catch {
    /* keep memory copy */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot(): string {
  return snapshotJson;
}

export function useJournal() {
  const json = useSyncExternalStore(subscribe, getSnapshot, () => "{}");
  const journal = useMemo(() => normalize(json), [json]);

  const toggle = useCallback((habitId: string, date: string, done: boolean) => {
    const current = normalize(snapshotJson);
    const dates = new Set(current[habitId] ?? []);
    if (done) dates.add(date);
    else dates.delete(date);
    const list = [...dates].sort();
    const next = { ...current };
    if (list.length > 0) next[habitId] = list;
    else delete next[habitId];
    publish(next);
  }, []);

  const mergeRemote = useCallback((records: Array<{ habitId: string; date: string }>) => {
    const current = normalize(snapshotJson);
    const next: JournalRecord = {};
    let changed = false;
    for (const [habitId, dates] of Object.entries(current)) next[habitId] = [...dates];
    for (const { habitId, date } of records) {
      if (!habitId || !date) continue;
      const set = new Set(next[habitId] ?? []);
      if (!set.has(date)) {
        set.add(date);
        changed = true;
        next[habitId] = [...set].sort();
      }
    }
    if (changed) publish(next);
  }, []);

  return { journal, toggle, mergeRemote };
}

/** Pull server history (current + previous month) once per session when live. */
export function useServerHistoryHydration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || serverHydrated) return;
    serverHydrated = true;

    const months: string[] = [];
    const now = new Date();
    for (let offset = 0; offset < 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    let cancelled = false;
    void (async () => {
      try {
        const current = normalize(snapshotJson);
        let changed = false;
        for (const month of months) {
          const response = await fetch(`/api/history?month=${month}`, { cache: "no-store" });
          if (!response.ok) return;
          const data = (await response.json()) as { records?: Array<{ habitId: string; date: string }> };
          if (!Array.isArray(data.records)) continue;
          for (const { habitId, date } of data.records) {
            if (!habitId || !date) continue;
            const set = new Set(current[habitId] ?? []);
            if (!set.has(date)) {
              set.add(date);
              changed = true;
              current[habitId] = [...set].sort();
            }
          }
        }
        if (!cancelled && changed) publish(current);
      } catch {
        /* offline / 503 — local journal only */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

/* ==========================================================================
   Pure helpers — the analytical core
   ========================================================================== */

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function dateSet(journal: JournalRecord, habitId: string): Set<string> {
  return new Set(journal[habitId] ?? []);
}

/** A habit counts as done on `date` if the journal has it, or (for today
 *  only) the workspace flag says completed — keeps both data sources true. */
export function isDoneOn(journal: JournalRecord, habit: Habit, date: string, today: string): boolean {
  if (date === today && habit.completed) return true;
  return dateSet(journal, habit.id).has(date);
}

export interface DayCompletion {
  done: number;
  total: number;
  ratio: number; // 0..1, 0 when nothing scheduled
}

export function completionForDate(journal: JournalRecord, habits: Habit[], date: string, today: string): DayCompletion {
  let done = 0;
  let total = 0;
  for (const habit of habits) {
    if (!isScheduledOn(habit.schedule, date)) continue;
    total += 1;
    if (isDoneOn(journal, habit, date, today)) done += 1;
  }
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

/** Consecutive scheduled days completed, ending today (or yesterday if today
 *  isn't done yet). Mirrors the server streak algorithm. */
export function computeStreak(journal: JournalRecord, habit: Habit, today: string): number {
  const dates = dateSet(journal, habit.id);
  if (habit.completed) dates.add(today);
  if (dates.size === 0) return 0;
  const floor = shiftDate(today, -366);
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (cursor >= floor) {
    if (!isScheduledOn(habit.schedule, cursor)) {
      cursor = shiftDate(cursor, -1);
      continue;
    }
    if (!dates.has(cursor)) break;
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return Math.min(streak, 365);
}

/** Last n days ending today (oldest first). */
export function lastDays(today: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDate(today, -i));
  return out;
}

export function weekdayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
