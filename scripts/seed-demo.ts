/**
 * Seed data demo untuk simulasi Rutina di preview panel.
 * Mereplikasi data demo (habit, transaksi, budget) + menambah riwayat
 * check-in, progres waktu, dan modul workspace agar semua fitur
 * (dashboard, keuangan, kalender, insight, pohon) langsung terisi.
 *
 * Jalankan: bun scripts/seed-demo.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function jakartaToday(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shift(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function main() {
  const today = jakartaToday();
  console.log(`Seeding Rutina demo data (today=${today})...`);

  // Bersihkan data lama (idempoten).
  await db.$executeRawUnsafe("DELETE FROM habit_checkins");
  await db.$executeRawUnsafe("DELETE FROM habit_metadata");
  await db.$executeRawUnsafe("DELETE FROM habit_daily_progress");
  await db.$executeRawUnsafe("DELETE FROM habits");
  await db.$executeRawUnsafe("DELETE FROM transaction_metadata");
  await db.$executeRawUnsafe("DELETE FROM transactions");
  await db.$executeRawUnsafe("DELETE FROM workspace_modules");

  type SeedHabit = {
    id: string;
    title: string;
    category: string;
    time: string;
    duration: number;
    icon: string;
    streak: number;
    streakDays: number; // hari beruntun
    extraDays: number[]; // riwayat tambahan terpisah (offset dari hari ini)
    difficulty: string;
  };

  const habits: SeedHabit[] = [
    { id: "h1", title: "Minum air putih", category: "Health", time: "07:00", duration: 5, icon: "water", streak: 12, streakDays: 12, extraDays: [15, 17, 19, 21, 24, 27], difficulty: "easy" },
    { id: "h2", title: "Membaca buku", category: "Learning", time: "08:00", duration: 20, icon: "book", streak: 8, streakDays: 8, extraDays: [11, 13, 15, 18, 21, 24, 26, 29], difficulty: "medium" },
    { id: "h3", title: "Olahraga ringan", category: "Health", time: "17:30", duration: 30, icon: "movement", streak: 5, streakDays: 5, extraDays: [8, 10, 12, 14, 16, 18, 19, 21, 23, 26, 28], difficulty: "hard" },
    { id: "h4", title: "Jurnal syukur", category: "Mindfulness", time: "21:00", duration: 10, icon: "write", streak: 16, streakDays: 16, extraDays: [18, 20, 23, 26, 28], difficulty: "easy" },
  ];

  for (const [index, habit] of habits.entries()) {
    const completedToday = habit.id === "h1";
    await db.$executeRaw`
      INSERT INTO habits (id, title, category, time, duration, icon, streak, sort_order)
      VALUES (${habit.id}, ${habit.title}, ${habit.category}, ${habit.time}, ${habit.duration}, ${habit.icon}, ${habit.streak}, ${index})`;

    const payload = JSON.stringify({
      kind: "normal",
      targetAmount: null,
      currentAmount: 0,
      unit: "",
      priority: "medium",
      difficulty: habit.difficulty,
      groupName: "",
      timeSpentMinutes: 0,
      schedule: { kind: "daily" },
    });
    await db.$executeRaw`
      INSERT INTO habit_metadata (habit_id, payload) VALUES (${habit.id}, ${payload})`;

    // Check-in beruntun: offset 0..streakDays-1 untuk h1 (termasuk hari ini),
    // offset 1..streakDays untuk habit lain (belum selesai hari ini).
    const startOffset = completedToday ? 0 : 1;
    const checkinOffsets = new Set<number>();
    for (let offset = startOffset; offset < startOffset + habit.streakDays; offset += 1) {
      checkinOffsets.add(offset);
    }
    for (const offset of habit.extraDays) checkinOffsets.add(offset);

    for (const offset of checkinOffsets) {
      await db.$executeRaw`
        INSERT OR IGNORE INTO habit_checkins (habit_id, completed_on)
        VALUES (${habit.id}, ${shift(today, -offset)})`;
    }

    // Progres waktu harian untuk analisis waktu (riwayat waktu).
    for (const offset of checkinOffsets) {
      if (offset === 0 || offset > 90) continue;
      await db.$executeRaw`
        INSERT OR IGNORE INTO habit_daily_progress (habit_id, activity_date, current_amount, time_spent_minutes)
        VALUES (${habit.id}, ${shift(today, -offset)}, 0, ${habit.duration})`;
    }
    if (completedToday) {
      await db.$executeRaw`
        INSERT OR IGNORE INTO habit_daily_progress (habit_id, activity_date, current_amount, time_spent_minutes)
        VALUES (${habit.id}, ${today}, 0, ${habit.duration})`;
    }
  }

  type SeedTransaction = [string, string, string, string, number, number];
  const transactions: SeedTransaction[] = [
    ["t1", "Gaji bulanan", "Gaji", "income", 8_500_000, 0],
    ["t2", "Kopi dan sarapan", "Makanan", "expense", 42_000, 0],
    ["t3", "Transportasi", "Transportasi", "expense", 75_000, 0],
    ["t4", "Project freelance", "Freelance", "income", 1_250_000, 0],
    ["t5", "Belanja kebutuhan", "Lainnya", "expense", 186_000, 0],
    ["t6", "Makan siang", "Makanan", "expense", 35_000, 1],
    ["t7", "Gojek ke kantor", "Transportasi", "expense", 28_000, 2],
    ["t8", "Belanja mingguan", "Lainnya", "expense", 245_000, 3],
    ["t9", "Kopi senja", "Makanan", "expense", 24_000, 4],
    ["t10", "Pulsa dan data", "Tagihan", "expense", 100_000, 6],
    ["t11", "Streaming musik", "Lifestyle", "expense", 55_000, 8],
    ["t12", "Obat vitamin", "Kesehatan", "expense", 78_000, 10],
    ["t13", "Bensin motor", "Transportasi", "expense", 50_000, 12],
  ];

  for (const [id, title, category, type, amount, offset] of transactions) {
    const date = shift(today, -offset);
    await db.$executeRaw`
      INSERT INTO transactions (id, title, category, type, amount, transaction_date)
      VALUES (${id}, ${title}, ${category}, ${type}, ${amount}, ${date})`;
    await db.$executeRaw`
      INSERT INTO transaction_metadata (transaction_id, wallet_id, tags_json, split_group_id)
      VALUES (${id}, null, '[]', null)`;
  }

  for (const budget of [
    { category: "Makanan", limit: 1_500_000 },
    { category: "Transportasi", limit: 700_000 },
    { category: "Tagihan", limit: 900_000 },
    { category: "Lifestyle", limit: 500_000 },
  ]) {
    await db.$executeRaw`
      INSERT OR IGNORE INTO budgets (category, monthly_limit) VALUES (${budget.category}, ${budget.limit})`;
  }

  const modules: Record<string, unknown> = {
    goals: [
      {
        id: "g1",
        title: "Menyelesaikan buku Atomic Habits",
        description: "Satu bab setiap malam sebelum tidur.",
        dueDate: shift(today, 21),
        category: "Learning",
        milestones: [
          { id: "m1", title: "Bab 1-5", completed: true },
          { id: "m2", title: "Bab 6-10", completed: false },
          { id: "m3", title: "Bab 11-selesai", completed: false },
        ],
        completed: false,
        createdAt: shift(today, -14),
      },
      {
        id: "g2",
        title: "Turun ke 68 kg",
        description: "Kombinasi defisit kalori ringan dan olahraga 3x seminggu.",
        dueDate: shift(today, 45),
        category: "Health",
        milestones: [
          { id: "m4", title: "Konsultasi awal", completed: true },
          { id: "m5", title: "Target 70 kg", completed: false },
        ],
        completed: false,
        createdAt: shift(today, -30),
      },
    ],
    checkins: [
      { date: today, mood: 4, energy: 3, sleepHours: 7, notes: "Fokus kerja cukup baik, sore agak lelah." },
      { date: shift(today, -1), mood: 3, energy: 3, sleepHours: 6.5, notes: "Tidur kurang karena nonton drama." },
      { date: shift(today, -2), mood: 5, energy: 4, sleepHours: 8, notes: "Hari produktif, sempat jalan pagi." },
    ],
    tasks: [
      { id: "w1", title: "Susun laporan mingguan", description: "Rekap progres sprint tim.", priority: "high", status: "doing", dueDate: shift(today, 1), createdAt: shift(today, -2) },
      { id: "w2", title: "Balas email klien", description: "", priority: "medium", status: "todo", dueDate: shift(today, 2), createdAt: shift(today, -1) },
      { id: "w3", title: "Review proposal desain", description: "Cek konsistensi token warna.", priority: "low", status: "done", dueDate: shift(today, -1), createdAt: shift(today, -5) },
    ],
    notes: [
      { id: "n1", title: "Ide konten minggu depan", body: "Topik: ritual pagi, review keuangan bulanan, cara memakai timer fokus.", tags: ["ide", "konten"], updatedAt: new Date().toISOString() },
    ],
    routines: [
      { id: "r1", title: "Ritual malam", description: "Matikan layar 30 menit sebelum tidur, baca buku, jurnal singkat.", frequency: "Setiap hari", lastDone: shift(today, -1) },
    ],
    wellness: [
      { date: today, waterMl: 1250, proteinGrams: 45, weightKg: 70.5, note: "Target air 2000 ml, tinggal 750 ml lagi." },
    ],
    workouts: [
      { id: "wo1", date: shift(today, -1), title: "Full body strength", durationMinutes: 45, cardioMinutes: 15, notes: "Naikkan beban squat 2.5 kg.", exercises: [{ id: "e1", name: "Squat", sets: 4, reps: 10, weightKg: 40 }] },
    ],
    programs: [
      { id: "p1", title: "Strength 3x seminggu", days: "Senin, Rabu, Jumat", description: "Fokus compound movement dengan progresi beban mingguan.", active: true },
    ],
    habitGroups: [
      { id: "hg1", name: "Rutinitas pagi", color: "#6b9d82" },
    ],
    settings: { vacationMode: false, theme: "system" },
    finance: {
      wallets: [
        { id: "wlt1", name: "Dompet Tunai", type: "cash", openingBalance: 500_000 },
        { id: "wlt2", name: "Bank Utama", type: "bank", openingBalance: 12_000_000 },
      ],
      transfers: [],
      recurring: [
        { id: "rc1", title: "Langganan streaming", amount: 55_000, type: "expense", category: "Lifestyle", frequency: "monthly", nextDate: shift(today, 10), active: true },
      ],
      savingsGoals: [
        { id: "sv1", title: "Dana darurat", targetAmount: 10_000_000, savedAmount: 2_500_000, dueDate: shift(today, 180) },
      ],
      categoryRules: [
        { id: "cr1", keyword: "kopi", category: "Makanan" },
      ],
      weeklyBudgets: [
        { category: "Makanan", limit: 300_000 },
      ],
    },
  };

  for (const [key, value] of Object.entries(modules)) {
    const payload = JSON.stringify(value);
    await db.$executeRaw`
      INSERT INTO workspace_modules (module_key, payload) VALUES (${key}, ${payload})`;
  }

  console.log("Seed selesai.");
  console.log(`- ${habits.length} habit (dengan riwayat check-in & progres waktu)`);
  console.log(`- ${transactions.length} transaksi (13 hari terakhir)`);
  console.log("- 4 budget + modul workspace (goals, checkins, tasks, wellness, dll.)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
