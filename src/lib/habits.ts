import type { Habit } from "@/lib/types";

export function summarizeHabits(habits: Habit[]) {
  const completed = habits.filter((habit) => habit.completed).length;
  const total = habits.length;
  return {
    completed,
    total,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    totalStreak: habits.reduce((sum, habit) => sum + habit.streak, 0),
    longestStreak: habits.reduce((longest, habit) => Math.max(longest, habit.streak), 0),
  };
}
