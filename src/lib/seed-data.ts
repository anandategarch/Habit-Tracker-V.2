import type { Budget, Habit, Transaction } from "@/lib/types";
import { todayISO } from "@/lib/format";

export const initialHabits: Habit[] = [
  { id: "h1", title: "Minum air putih", category: "Health", time: "07:00", duration: 5, completed: true, icon: "water", streak: 12 },
  { id: "h2", title: "Membaca buku", category: "Learning", time: "08:00", duration: 20, completed: false, icon: "book", streak: 8 },
  { id: "h3", title: "Olahraga ringan", category: "Health", time: "17:30", duration: 30, completed: false, icon: "movement", streak: 5 },
  { id: "h4", title: "Jurnal syukur", category: "Mindfulness", time: "21:00", duration: 10, completed: false, icon: "write", streak: 16 },
];

// Dihitung lazy (bukan konstanta module-level) supaya tanggal demo ikut berganti
// saat hari berganti, bukan beku pada saat proses pertama kali memuat modul.
export function getInitialTransactions(): Transaction[] {
  const today = todayISO();
  return [
    { id: "t1", title: "Gaji bulanan", category: "Gaji", type: "income", amount: 8_500_000, date: today },
    { id: "t2", title: "Kopi dan sarapan", category: "Makanan", type: "expense", amount: 42_000, date: today },
    { id: "t3", title: "Transportasi", category: "Transportasi", type: "expense", amount: 75_000, date: today },
    { id: "t4", title: "Project freelance", category: "Freelance", type: "income", amount: 1_250_000, date: today },
    { id: "t5", title: "Belanja kebutuhan", category: "Lainnya", type: "expense", amount: 186_000, date: today },
  ];
}

export const initialBudgets: Budget[] = [
  { category: "Makanan", limit: 1_500_000 },
  { category: "Transportasi", limit: 700_000 },
  { category: "Tagihan", limit: 900_000 },
  { category: "Lifestyle", limit: 500_000 },
];
