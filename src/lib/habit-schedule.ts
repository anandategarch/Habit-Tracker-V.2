export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekly"; days: number[] }
  | { kind: "monthly"; dates: number[] };

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Min", 1: "Sen", 2: "Sel", 3: "Rab", 4: "Kam", 5: "Jum", 6: "Sab",
};

function uniqueIntegers(value: unknown, min: number, max: number): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((n) => Number.isInteger(n) && n >= min && n <= max))]
    .sort((a, b) => a - b);
}

export function normalizeSchedule(value: unknown): HabitSchedule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === undefined || record.kind === "daily") return { kind: "daily" };
  if (record.kind === "weekly") {
    const days = uniqueIntegers(record.days, 0, 6);
    return days.length ? { kind: "weekly", days } : null;
  }
  if (record.kind === "monthly") {
    const dates = uniqueIntegers(record.dates, 1, 31);
    return dates.length ? { kind: "monthly", dates } : null;
  }
  return null;
}

export function isScheduledOn(schedule: HabitSchedule | undefined, ymd: string): boolean {
  if (!schedule || schedule.kind === "daily" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return true;
  const [year, month, day] = ymd.split("-").map(Number);
  if (schedule.kind === "weekly") return schedule.days.includes(new Date(Date.UTC(year, month - 1, day)).getUTCDay());
  return schedule.dates.includes(day);
}

export function scheduleLabel(schedule: HabitSchedule | undefined): string {
  if (!schedule || schedule.kind === "daily") return "Setiap hari";
  if (schedule.kind === "weekly") return schedule.days.map((day) => WEEKDAY_LABELS[day] ?? String(day)).join(", ");
  return `Tgl ${schedule.dates.join(", ")}`;
}

export function parseNumberList(value: string, min: number, max: number): number[] {
  return [...new Set(value.split(/[\s,;]+/).map(Number).filter((n) => Number.isInteger(n) && n >= min && n <= max))]
    .sort((a, b) => a - b);
}
