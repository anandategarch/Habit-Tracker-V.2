"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  ChartLine, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Coffee,
  Droplets, Dumbbell, Flame, Heart, Home, ListChecks, Moon, MoreHorizontal,
  Plus, Search, Sprout, Target, WalletCards, X, PencilLine,
} from "lucide-react";
import type { Budget, Habit, TabId, Transaction, TransactionCategory, TransactionType } from "@/lib/types";
import { formatCompactRupiah, formatDate, formatRupiah, todayISO } from "@/lib/format";
import { initialBudgets, initialHabits, initialTransactions } from "@/lib/seed-data";
import { summarizeTransactions, summarizeBudgets } from "@/lib/finance";
import { summarizeHabits } from "@/lib/habits";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace-storage";

const navigation: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "habits", label: "Habit", icon: ListChecks },
  { id: "finance", label: "Uang", icon: WalletCards },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "insights", label: "Insight", icon: ChartLine },
];

const categories: TransactionCategory[] = [
  "Gaji", "Freelance", "Makanan", "Transportasi", "Tagihan", "Lifestyle", "Kesehatan", "Lainnya",
];

const budgetIcons: Record<string, typeof Coffee> = {
  Makanan: Coffee, Transportasi: Activity, Tagihan: CircleDollarSign, Lifestyle: Heart,
};

function PageIntro({ eyebrow, title, subtitle, action }: {
  eyebrow: string; title: string; subtitle: string; action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function PrimaryButton({ children, onClick, type = "button" }: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit";
}) {
  return <button className="primary-button" type={type} onClick={onClick}>{children}</button>;
}

function IconAction({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function SectionHeading({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div><h2 className="section-title">{title}</h2>{caption && <p className="section-caption">{caption}</p>}</div>
      {action}
    </div>
  );
}

function HabitGlyph({ icon }: { icon: Habit["icon"] }) {
  const Icon = icon === "water" ? Droplets : icon === "book" ? BookOpen : icon === "movement" ? Dumbbell : icon === "write" ? PencilLine : Moon;
  return <Icon size={18} strokeWidth={1.8} />;
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: (id: string) => void }) {
  return (
    <div className="habit-row">
      <div className="habit-icon"><HabitGlyph icon={habit.icon} /></div>
      <div className="habit-main">
        <div className="habit-name">{habit.title}</div>
        <div className="habit-meta"><span><Clock3 size={11} /> {habit.time}</span><span>{habit.duration} menit</span><span><Flame size={11} /> {habit.streak} hari</span></div>
      </div>
      <button className={`check-button ${habit.completed ? "done" : ""}`} aria-label={habit.completed ? `Batalkan ${habit.title}` : `Selesaikan ${habit.title}`} onClick={() => onToggle(habit.id)}>
        {habit.completed && <Check size={15} strokeWidth={2.8} />}
      </button>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${income ? "" : "expense"}`}>
        {income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
      </div>
      <div>
        <div className="transaction-title">{transaction.title}</div>
        <div className="transaction-meta">{transaction.category} · {formatDate(transaction.date)}</div>
      </div>
      <div className={`transaction-amount ${income ? "income" : "expense"}`}>{income ? "+" : "−"}{formatRupiah(transaction.amount)}</div>
    </div>
  );
}

function StatCard({ label, value, foot, icon: Icon }: {
  label: string; value: string; foot: string; icon: typeof Target;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span className="small-label">{label}</span><span className="stat-icon"><Icon size={15} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function DashboardView({ habits, income, expense, onNavigate, onToggle, onAddHabit }: {
  habits: Habit[]; income: number; expense: number; onNavigate: (tab: TabId) => void;
  onToggle: (id: string) => void; onAddHabit: () => void;
}) {
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
  const { completed, progress, totalStreak } = summarizeHabits(habits);
  const net = income - expense;

  return (
    <>
      <PageIntro eyebrow={dateLabel} title="Selamat pagi." subtitle="Pelan-pelan, tapi terus bertumbuh." />
      <div className="dashboard-grid">
        <div className="left-stack">
          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker">RUANG KECIL UNTUK BERTUMBUH</div>
              <h2 className="hero-title">Your life,<br />in rhythm.</h2>
              <p className="hero-description">Satu langkah baik hari ini adalah awal dari perubahan besar.</p>
            </div>
            <div className="hero-ring" style={{ "--progress": `${progress}%` } as CSSProperties}>
              <div className="hero-ring-inner"><span className="hero-percent">{progress}%</span><span className="hero-percent-caption">TODAY</span></div>
            </div>
          </section>

          <div className="stats-grid">
            <StatCard label="Habit selesai" value={`${completed}/${habits.length}`} foot="Hari ini" icon={Check} />
            <StatCard label="Total streak" value={`${totalStreak}`} foot="Hari terkumpul" icon={Flame} />
            <StatCard label="Konsistensi" value={`${progress}%`} foot="Progress harian" icon={Target} />
          </div>

          <section className="card card-pad">
            <SectionHeading title="Hari ini" caption="Langkah kecil yang ingin kamu selesaikan" action={<button className="text-button" onClick={() => onNavigate("habits")}>Lihat semua <ArrowRight size={13} /></button>} />
            <div className="habit-list">
              {habits.slice(0, 4).map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={onToggle} />)}
              {habits.length === 0 && <div className="empty-state">Belum ada habit. Tambahkan satu langkah kecil untuk memulai.</div>}
            </div>
            <div style={{ marginTop: 13 }}><button className="text-button" onClick={onAddHabit}><Plus size={14} /> Tambah habit baru</button></div>
          </section>
        </div>

        <div className="right-stack">
          <section className="card finance-mini">
            <div className="finance-mini-head"><span className="small-label">KEUANGAN BULAN INI</span><WalletCards size={17} color="var(--primary)" /></div>
            <div className="finance-mini-value">{formatCompactRupiah(net)}</div>
            <div className="small-label">Arus kas bersih · data lokal</div>
            <div className="finance-pair" style={{ marginTop: 16 }}>
              <div className="finance-pair-item income"><span className="small-label">Masuk</span><strong>{formatCompactRupiah(income)}</strong></div>
              <div className="finance-pair-item expense"><span className="small-label">Keluar</span><strong>{formatCompactRupiah(expense)}</strong></div>
            </div>
            <button className="text-button" style={{ marginTop: 14 }} onClick={() => onNavigate("finance")}>Buka keuangan <ArrowRight size={13} /></button>
          </section>
          <section className="card card-pad">
            <SectionHeading title="Ritme mingguan" caption="Kebiasaan baik dibangun dari pengulangan." />
            <div className="chart-bars" style={{ height: 142 }}>
              {[42, 68, 54, 82, 63, 92, progress || 8].map((height, index) => (
                <div className="chart-column" key={index}><div className={`chart-bar ${index === 6 ? "active" : ""}`} style={{ height: `${height}%` }} /><span className="chart-label">{["S","S","R","K","J","S","M"][index]}</span></div>
              ))}
            </div>
          </section>
          <section className="quote-card">
            <div className="quote-mark">“</div>
            <p className="quote-text">Tidak harus sempurna. Yang penting, kamu kembali melangkah.</p>
            <div className="quote-caption">A GENTLE REMINDER · RUTINA</div>
          </section>
        </div>
      </div>
    </>
  );
}

function HabitsView({ habits, onToggle, onAdd }: { habits: Habit[]; onToggle: (id: string) => void; onAdd: () => void }) {
  const { completed, total, progress } = summarizeHabits(habits);
  return (
    <>
      <PageIntro eyebrow="KEBIASAAN HARIAN" title="Bangun ritmemu." subtitle="Konsistensi kecil lebih berarti daripada target yang terlalu besar." action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Habit baru</PrimaryButton>} />
      <div className="habit-page-grid">
        <section className="card card-pad">
          <SectionHeading title="Semua habit" caption={`${total} kebiasaan tersimpan · ${completed} selesai hari ini`} />
          <div className="habit-list">
            {habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={onToggle} />)}
            {habits.length === 0 && <div className="empty-state">Belum ada habit. Mulai dari satu kebiasaan sederhana.</div>}
          </div>
        </section>
        <div className="right-stack">
          <section className="card habit-side-card">
            <span className="small-label">PROGRESS HARI INI</span>
            <div className="streak-number">{progress}%</div>
            <div className="streak-caption">{completed} dari {habits.length} habit telah selesai.</div>
            <div className="budget-track" style={{ marginTop: 15, height: 9 }}><div className="budget-fill" style={{ width: `${progress}%` }} /></div>
          </section>
          <section className="quote-card"><div className="quote-mark">“</div><p className="quote-text">Mulai dari yang bisa kamu lakukan hari ini.</p><div className="quote-caption">ONE DAY AT A TIME</div></section>
        </div>
      </div>
    </>
  );
}

function FinanceView({ transactions, budgets, income, expense, onAdd }: {
  transactions: Transaction[]; budgets: Budget[]; income: number; expense: number; onAdd: () => void;
}) {
  const net = income - expense;
  const spendByCategory = summarizeBudgets(transactions, budgets);
  return (
    <>
      <PageIntro eyebrow="KEUANGAN PRIBADI" title="Uang lebih terarah." subtitle="Kenali arus uangmu, atur batas, dan ambil keputusan dengan sadar." action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Catat transaksi</PrimaryButton>} />
      <div className="finance-overview">
        <section className="card finance-balance">
          <span className="small-label">ARUS KAS BERSIH · DATA DEMO</span>
          <div className="metric-value">{formatRupiah(net)}</div>
          <span style={{ color: "rgba(255,255,255,.7)", fontSize: 10 }}>Pemasukan dikurangi pengeluaran tercatat</span>
        </section>
        <section className="card finance-metric">
          <span className="small-label"><ArrowDownLeft size={13} style={{ verticalAlign: "middle" }} /> PEMASUKAN</span>
          <div className="metric-value metric-positive">{formatCompactRupiah(income)}</div>
          <span className="stat-foot">Total uang masuk</span>
        </section>
        <section className="card finance-metric">
          <span className="small-label"><ArrowUpRight size={13} style={{ verticalAlign: "middle" }} /> PENGELUARAN</span>
          <div className="metric-value metric-negative">{formatCompactRupiah(expense)}</div>
          <span className="stat-foot">Total uang keluar</span>
        </section>
      </div>
      <div className="finance-content-grid">
        <section className="card card-pad">
          <SectionHeading title="Transaksi terbaru" caption={`${transactions.length} transaksi tersimpan di perangkat ini`} action={<button className="text-button" onClick={onAdd}><Plus size={13} /> Tambah</button>} />
          <div className="transaction-list">
            {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
            {transactions.length === 0 && <div className="empty-state">Belum ada transaksi. Catat pemasukan atau pengeluaran pertamamu.</div>}
          </div>
        </section>
        <section className="card card-pad">
          <SectionHeading title="Anggaran kategori" caption="Batas pengeluaran bulanan (demo)" />
          <div className="budget-list">
            {spendByCategory.map((budget) => {
              const ratio = Math.round(budget.spent / budget.limit * 100);
              const Icon = budgetIcons[budget.category] ?? CircleDollarSign;
              return (
                <div className="budget-item" key={budget.category}>
                  <div className="budget-head"><span><Icon size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{budget.category}</span><span>{ratio}%</span></div>
                  <div className="budget-values">{formatCompactRupiah(budget.spent)} dari {formatCompactRupiah(budget.limit)}</div>
                  <div className="budget-track"><div className={`budget-fill ${ratio >= 100 ? "over" : ratio >= 80 ? "warning" : ""}`} style={{ width: `${Math.min(ratio, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function CalendarView({ habits }: { habits: Habit[] }) {
  const [month, setMonth] = useState(() => new Date(2026, 10, 1));
  const [selectedDay, setSelectedDay] = useState(2);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array((firstDay + 6) % 7).fill(0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  return (
    <>
      <PageIntro eyebrow="RIWAYAT DAN RENCANA" title="Lihat perjalananmu." subtitle="Setiap tanda kecil adalah bukti kamu sudah berusaha." />
      <div className="calendar-layout">
        <section className="card card-pad">
          <div className="calendar-head">
            <div className="calendar-month">{monthLabel}</div>
            <div style={{ display: "flex", gap: 7 }}>
              <IconAction label="Bulan sebelumnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></IconAction>
              <IconAction label="Bulan berikutnya" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></IconAction>
            </div>
          </div>
          <div className="calendar-grid">
            {["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {cells.map((day, index) => day === 0
              ? <div key={`blank-${index}`} />
              : <button key={day} className={`calendar-day ${day === selectedDay ? "selected" : ""} ${day === 2 && month.getMonth() === 10 ? "today" : ""} ${day % 2 === 0 ? "has-activity" : ""}`} onClick={() => setSelectedDay(day)}>{day}</button>)}
          </div>
        </section>
        <aside className="calendar-summary">
          <div className="small-label">RINGKASAN TANGGAL</div>
          <div className="calendar-summary-date">{selectedDay} {monthLabel.split(" ")[0]}</div>
          <div className="activity-line"><span className="activity-dot" />{habits.filter((habit) => habit.completed).length} habit selesai hari ini</div>
          <div className="activity-line"><span className="activity-dot" />{habits.length} habit terjadwal</div>
          <p className="section-caption" style={{ marginTop: 19 }}>Kalender ini masih memakai data demo. Riwayat check-in per tanggal akan dikembangkan pada tahap berikutnya.</p>
        </aside>
      </div>
    </>
  );
}

function InsightsView({ habits, income, expense }: { habits: Habit[]; income: number; expense: number }) {
  const { completed, progress: consistency } = summarizeHabits(habits);
  const values = [45, 62, 51, 78, 66, 85, consistency];
  return (
    <>
      <PageIntro eyebrow="REFLEKSI PERKEMBANGAN" title="Lihat yang sudah tumbuh." subtitle="Gunakan pola sederhana untuk memahami perjalananmu." />
      <div className="insight-grid">
        <section className="card card-pad">
          <SectionHeading title="Konsistensi kebiasaan" caption="Aktivitas mingguan · ilustrasi data demo" />
          <div className="chart-bars">
            {values.map((height, index) => <div className="chart-column" key={index}><div className={`chart-bar ${index === 6 ? "active" : ""}`} style={{ height: `${height}%` }} /><span className="chart-label">{["Sen","Sel","Rab","Kam","Jum","Sab","Min"][index]}</span></div>)}
          </div>
        </section>
        <div className="right-stack">
          <section className="insight-highlight">
            <div className="small-label">PROGRESS HARI INI</div>
            <div className="insight-number">{consistency}%</div>
            <p className="section-caption">{completed} dari {habits.length} habit berhasil diselesaikan.</p>
          </section>
          <section className="card card-pad">
            <SectionHeading title="Arus kas tercatat" caption="Ringkasan dari transaksi demo" />
            <div style={{ display: "grid", gap: 14 }}>
              <div><div className="small-label">PEMASUKAN</div><div className="metric-value metric-positive" style={{ marginTop: 5 }}>{formatCompactRupiah(income)}</div></div>
              <div><div className="small-label">PENGELUARAN</div><div className="metric-value metric-negative" style={{ marginTop: 5 }}>{formatCompactRupiah(expense)}</div></div>
              <div><div className="small-label">BERSIH</div><div className="metric-value" style={{ marginTop: 5 }}>{formatCompactRupiah(income - expense)}</div></div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function EntryModal({ mode, onClose, onSubmit }: {
  mode: "habit" | "transaction"; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isHabit = mode === "habit";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
        <div className="modal-head">
          <div><div className="eyebrow">{isHabit ? "BANGUN KEBIASAAN" : "CATAT ARUS UANG"}</div><h2 className="modal-title" id="entry-modal-title">{isHabit ? "Tambah habit baru" : "Transaksi baru"}</h2></div>
          <IconAction label="Tutup modal" onClick={onClose}><X size={17} /></IconAction>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {isHabit ? (
            <>
              <label className="form-field"><span className="form-label">Nama habit</span><input className="form-control" name="title" placeholder="Contoh: Membaca 10 halaman" required maxLength={60} /></label>
              <label className="form-field"><span className="form-label">Kategori</span><select className="form-control" name="category"><option>Health</option><option>Learning</option><option>Mindfulness</option><option>Personal</option></select></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="form-field"><span className="form-label">Waktu</span><input className="form-control" type="time" name="time" defaultValue="07:00" required /></label>
                <label className="form-field"><span className="form-label">Durasi (menit)</span><input className="form-control" type="number" name="duration" min="1" max="600" defaultValue="15" required /></label>
              </div>
            </>
          ) : (
            <>
              <label className="form-field"><span className="form-label">Jenis transaksi</span><select className="form-control" name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label>
              <label className="form-field"><span className="form-label">Nama transaksi</span><input className="form-control" name="title" placeholder="Contoh: Belanja bulanan" maxLength={60} required /></label>
              <label className="form-field"><span className="form-label">Nominal (Rp)</span><input className="form-control" type="number" name="amount" min="1" step="1" placeholder="150000" required /></label>
              <label className="form-field"><span className="form-label">Kategori</span><select className="form-control" name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="form-field"><span className="form-label">Tanggal</span><input className="form-control" type="date" name="date" defaultValue={todayISO()} required /></label>
            </>
          )}
          <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><PrimaryButton type="submit"><Check size={15} /> Simpan</PrimaryButton></div>
        </form>
      </section>
    </div>
  );
}

export function RutinaApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [budgets] = useState<Budget[]>(initialBudgets);
  const [modal, setModal] = useState<"habit" | "transaction" | null>(null);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadWorkspace();
    if (stored?.habits) setHabits(stored.habits);
    if (stored?.transactions) setTransactions(stored.transactions);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkspace({ habits, transactions });
  }, [habits, transactions, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const { income, expense } = useMemo(() => summarizeTransactions(transactions), [transactions]);

  function toggleHabit(id: string) {
    setHabits((current) => current.map((habit) => habit.id === id ? { ...habit, completed: !habit.completed } : habit));
  }

  function submitHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const category = String(data.get("category") ?? "Personal") as Habit["category"];
    const habit: Habit = {
      id: crypto.randomUUID(), title, category,
      time: String(data.get("time") ?? "07:00"),
      duration: Math.max(1, Number(data.get("duration")) || 15),
      completed: false, icon: category === "Health" ? "movement" : category === "Learning" ? "book" : category === "Mindfulness" ? "mind" : "write",
      streak: 0,
    };
    setHabits((current) => [...current, habit]);
    setModal(null);
    setToast("Habit baru berhasil ditambahkan.");
  }

  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Math.round(Number(data.get("amount")));
    const title = String(data.get("title") ?? "").trim();
    if (!title || !Number.isFinite(amount) || amount <= 0) return;
    const transaction: Transaction = {
      id: crypto.randomUUID(), title,
      type: String(data.get("type")) as TransactionType,
      category: String(data.get("category")) as TransactionCategory,
      amount, date: String(data.get("date") || todayISO()),
    };
    setTransactions((current) => [transaction, ...current]);
    setModal(null);
    setToast("Transaksi berhasil dicatat.");
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="brand"><span className="brand-mark"><Sprout size={21} /></span><div><div className="brand-name">rutina.</div><div className="brand-sub">grow at your pace</div></div></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}><Icon size={17} strokeWidth={1.8} />{label}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="profile-row"><div className="avatar">R</div><div><div className="profile-name">Ruang pribadimu</div><div className="profile-caption">Data tersimpan di perangkat</div></div><MoreHorizontal size={17} color="var(--muted)" /></div></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark" style={{ width: 31, height: 31, borderRadius: 11 }}><Sprout size={17} /></span><span>rutina.</span></div>
          <div className="topbar-note">Make room for what matters.</div>
          <div className="topbar-actions"><IconAction label="Cari"><Search size={17} /></IconAction><IconAction label="Notifikasi"><Bell size={17} /></IconAction><div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>R</div></div>
        </header>

        <div className="content-wrap">
          {activeTab === "home" && <DashboardView habits={habits} income={income} expense={expense} onNavigate={setActiveTab} onToggle={toggleHabit} onAddHabit={() => setModal("habit")} />}
          {activeTab === "habits" && <HabitsView habits={habits} onToggle={toggleHabit} onAdd={() => setModal("habit")} />}
          {activeTab === "finance" && <FinanceView transactions={transactions} budgets={budgets} income={income} expense={expense} onAdd={() => setModal("transaction")} />}
          {activeTab === "calendar" && <CalendarView habits={habits} />}
          {activeTab === "insights" && <InsightsView habits={habits} income={income} expense={expense} />}
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama mobile">
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></button>)}
      </nav>

      {modal && <EntryModal mode={modal} onClose={() => setModal(null)} onSubmit={modal === "habit" ? submitHabit : submitTransaction} />}
      {toast && <div role="status" className="toast">{toast}</div>}
    </div>
  );
}
