export const previewHabits = [
  { id: "h1", title: "Minum air putih", category: "Health", time: "07:00", duration: 5, completed: true, streak: 12, icon: "water" },
  { id: "h2", title: "Membaca buku", category: "Learning", time: "08:00", duration: 20, completed: false, streak: 8, icon: "book" },
  { id: "h3", title: "Olahraga ringan", category: "Health", time: "17:30", duration: 30, completed: false, streak: 5, icon: "movement" },
  { id: "h4", title: "Jurnal syukur", category: "Mindfulness", time: "21:00", duration: 10, completed: false, streak: 16, icon: "write" }
] as const;

export const previewTransactions = [
  { id: "t1", title: "Gaji bulanan", category: "Gaji", type: "income", amount: 8500000, date: "Hari ini" },
  { id: "t2", title: "Kopi dan sarapan", category: "Makanan", type: "expense", amount: 42000, date: "Hari ini" },
  { id: "t3", title: "Transportasi", category: "Transportasi", type: "expense", amount: 75000, date: "Hari ini" },
  { id: "t4", title: "Project freelance", category: "Freelance", type: "income", amount: 1250000, date: "Kemarin" },
  { id: "t5", title: "Belanja kebutuhan", category: "Lainnya", type: "expense", amount: 186000, date: "Kemarin" }
] as const;

export const previewFinance = {
  net: 9447000, income: 9750000, expense: 303000,
  wallets: [
    { name: "Tunai", kind: "Tunai", balance: 1250000, tone: "sage" },
    { name: "BCA", kind: "Bank", balance: 6200000, tone: "leaf" },
    { name: "GoPay", kind: "E-wallet", balance: 450000, tone: "peach" }
  ],
  categories: [
    { name: "Makanan", amount: 142000, percent: 47 },
    { name: "Transportasi", amount: 75000, percent: 25 },
    { name: "Lainnya", amount: 86000, percent: 28 }
  ],
  budgets: [
    { name: "Makanan", spent: 142000, limit: 1500000, percent: 9 },
    { name: "Transportasi", spent: 75000, limit: 700000, percent: 11 },
    { name: "Tagihan", spent: 0, limit: 900000, percent: 0 }
  ],
  recurring: [
    { title: "Internet rumah", category: "Tagihan", amount: 350000, next: "12 Nov 2026", cadence: "Bulanan" },
    { title: "Langganan musik", category: "Lifestyle", amount: 55000, next: "18 Nov 2026", cadence: "Bulanan" }
  ],
  savings: [
    { title: "Dana darurat", saved: 3200000, target: 10000000, percent: 32 },
    { title: "Liburan", saved: 1250000, target: 5000000, percent: 25 }
  ]
} as const;
