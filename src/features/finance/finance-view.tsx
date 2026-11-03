"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Coffee,
  Heart,
  Plus,
  Receipt,
  Sprout,
} from "lucide-react";
import type { Budget, Transaction, TransactionCategory } from "@/lib/types";
import { formatCompactRupiah, formatRupiah, todayISO } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { EmptyState, PageIntro, PrimaryButton, SectionHeading, TransactionRow } from "@/components/ui/primitives";

const budgetIcons: Record<string, typeof Coffee> = {
  Makanan: Coffee,
  Transportasi: Activity,
  Tagihan: CircleDollarSign,
  Lifestyle: Heart,
};

const categoryPaletteLength = 8;
type TransactionFilter = "all" | "income" | "expense";

export function FinanceView({ transactions, budgets, income, expense, onAdd }: {
  transactions: Transaction[];
  budgets: Budget[];
  income: number;
  expense: number;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const todayKey = todayISO();
  const monthKey = todayKey.slice(0, 7);
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey),
    [transactions, monthKey],
  );
  const net = income - expense;

  // Daily totals are computed from the complete transaction history so the
  // rolling seven-day chart remains correct across a month boundary.
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();
    transactions.forEach((transaction) => {
      const current = totals.get(transaction.date) ?? { income: 0, expense: 0 };
      current[transaction.type] += transaction.amount;
      totals.set(transaction.date, current);
    });
    return totals;
  }, [transactions]);

  const cashflowWeek = useMemo(() => {
    const todayParts = todayKey.split("-").map(Number);
    const todayUtc = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayUtc);
      date.setUTCDate(todayUtc.getUTCDate() - (6 - index));
      const iso = date.toISOString().slice(0, 10);
      const totals = dailyTotals.get(iso) ?? { income: 0, expense: 0 };
      return {
        iso,
        income: totals.income,
        expense: totals.expense,
        label: new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(iso + "T12:00:00+07:00")),
      };
    });
  }, [dailyTotals, todayKey]);

  const weeklyScale = Math.max(1, ...cashflowWeek.flatMap((day) => [day.income, day.expense]));
  const weeklyIncome = cashflowWeek.reduce((sum, day) => sum + day.income, 0);
  const weeklyExpense = cashflowWeek.reduce((sum, day) => sum + day.expense, 0);
  const spendByCategory = useMemo(
    () => summarizeBudgets(monthTransactions, budgets),
    [monthTransactions, budgets],
  );

  const expenseCategories = useMemo(() => {
    const totals = new Map<TransactionCategory, number>();
    monthTransactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    });
    return [...totals.entries()]
      .map(([category, spent]) => ({ category, spent }))
      .sort((a, b) => b.spent - a.spent);
  }, [monthTransactions]);

  const categorySpendTotal = expenseCategories.reduce((sum, item) => sum + item.spent, 0);
  const visibleExpenseCategories = useMemo(() => {
    const topCategories = expenseCategories.slice(0, 6);
    const remainingSpend = expenseCategories
      .slice(6)
      .reduce((sum, item) => sum + item.spent, 0);
    if (remainingSpend > 0) {
      return [...topCategories, { category: "Kategori lainnya", spent: remainingSpend }];
    }
    return topCategories;
  }, [expenseCategories]);

  const filteredTransactions = useMemo(
    () => [...monthTransactions]
      .filter((transaction) => filter === "all" || transaction.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [monthTransactions, filter],
  );
  const visibleTransactions = showAllTransactions
    ? filteredTransactions
    : filteredTransactions.slice(0, 5);

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(todayKey + "T12:00:00+07:00"));
  const cashflowMessage = net >= 0
    ? "Pemasukan bulan ini masih lebih besar dari pengeluaran."
    : "Pengeluaran bulan ini lebih besar dari pemasukan.";

  return (
    <>
      <PageIntro
        eyebrow={`KEUANGAN PRIBADI · ${monthLabel.toUpperCase()}`}
        title="Keuanganmu."
        subtitle="Lihat ke mana uang bergerak, lalu tentukan langkah berikutnya."
        action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Catat transaksi</PrimaryButton>}
      />

      <section className="finance-overview" aria-label="Ringkasan keuangan bulan ini">
        <div className="card finance-balance">
          <span className="small-label">ARUS KAS BERSIH</span>
          <div className="metric-value">{formatRupiah(net)}</div>
          <span className="finance-balance-note">{cashflowMessage}</span>
          <div className="finance-balance-period"><CalendarDays size={13} /> {monthLabel}</div>
        </div>
        <section className="card finance-metric">
          <span className="finance-metric-label">
            <span className="finance-metric-icon income"><ArrowDownLeft size={15} /></span>
            PEMASUKAN
          </span>
          <div className="metric-value metric-positive">{formatCompactRupiah(income)}</div>
          <span className="stat-foot">Total uang masuk bulan ini</span>
        </section>
        <section className="card finance-metric">
          <span className="finance-metric-label">
            <span className="finance-metric-icon expense"><ArrowUpRight size={15} /></span>
            PENGELUARAN
          </span>
          <div className="metric-value metric-negative">{formatCompactRupiah(expense)}</div>
          <span className="stat-foot">Total uang keluar bulan ini</span>
        </section>
      </section>

      <section className="card card-pad finance-chart-card" aria-labelledby="finance-cashflow-title">
        <div className="finance-chart-header">
          <div>
            <span className="finance-section-kicker">ARUS UANG</span>
            <h2 className="section-title" id="finance-cashflow-title">Pemasukan vs pengeluaran</h2>
            <p className="section-caption">Pergerakan harian selama 7 hari terakhir</p>
          </div>
          <div className="finance-chart-totals" aria-label="Total arus uang tujuh hari terakhir">
            <div><span className="finance-chart-dot income" /><span>Masuk</span><strong>{formatCompactRupiah(weeklyIncome)}</strong></div>
            <div><span className="finance-chart-dot expense" /><span>Keluar</span><strong>{formatCompactRupiah(weeklyExpense)}</strong></div>
          </div>
        </div>
        {weeklyIncome === 0 && weeklyExpense === 0 ? (
          <div className="finance-chart-empty">
            <Sprout size={18} />
            <span>Belum ada transaksi dalam 7 hari terakhir.</span>
          </div>
        ) : (
          <div className="finance-chart-plot">
            <svg viewBox="0 0 600 154" role="img" aria-label="Grafik batang pemasukan dan pengeluaran harian selama tujuh hari terakhir">
              <line className="finance-chart-gridline" x1="12" y1="16" x2="588" y2="16" />
              <line className="finance-chart-gridline" x1="12" y1="64" x2="588" y2="64" />
              <line className="finance-chart-baseline" x1="12" y1="112" x2="588" y2="112" />
              {cashflowWeek.map((day, index) => {
                const x = 30 + index * 82;
                const incomeHeight = day.income / weeklyScale * 88;
                const expenseHeight = day.expense / weeklyScale * 88;
                return (
                  <g key={day.iso}>
                    <rect
                      className="finance-chart-bar income"
                      x={x}
                      y={112 - incomeHeight}
                      width="19"
                      height={incomeHeight}
                      rx="5"
                    />
                    <rect
                      className="finance-chart-bar expense"
                      x={x + 24}
                      y={112 - expenseHeight}
                      width="19"
                      height={expenseHeight}
                      rx="5"
                    />
                    <text className="finance-chart-day" x={x + 21} y="139" textAnchor="middle">{day.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </section>

      <div className="finance-analysis-grid">
        <section className="card card-pad finance-category-panel">
          <SectionHeading
            title="Ke mana uang pergi?"
            caption="Distribusi pengeluaran menurut kategori bulan ini"
          />
          <div className="finance-category-total">
            <span>Total pengeluaran tercatat</span>
            <strong>{formatCompactRupiah(categorySpendTotal)}</strong>
            <small>{expenseCategories.length} kategori</small>
          </div>
          {visibleExpenseCategories.length > 0 ? (
            <div className="finance-category-list">
              {visibleExpenseCategories.map((item, index) => {
                const percentage = categorySpendTotal > 0
                  ? item.spent / categorySpendTotal * 100
                  : 0;
                const tone = index % categoryPaletteLength;
                return (
                  <div className="finance-category-row" key={item.category}>
                    <div className="finance-category-meta">
                      <span className={`finance-category-name tone-${tone}`}>
                        <span className="finance-category-swatch" />
                        <strong>{item.category}</strong>
                      </span>
                      <strong className="finance-category-amount">{formatCompactRupiah(item.spent)}</strong>
                    </div>
                    <div
                      className="finance-category-track"
                      role="img"
                      aria-label={`${item.category}: ${formatRupiah(item.spent)}, ${Math.round(percentage)} persen dari pengeluaran`}
                    >
                      <span
                        className={`finance-category-fill tone-${tone}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="finance-category-percent">{Math.round(percentage)}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="finance-panel-empty">
              <Sprout size={20} />
              <p>Belum ada pengeluaran tercatat bulan ini. Kategori akan muncul setelah transaksi ditambahkan.</p>
            </div>
          )}
        </section>

        <section className="card card-pad finance-budget-panel">
          <SectionHeading title="Kontrol anggaran" caption="Pantau realisasi terhadap batas bulanan" />
          {spendByCategory.length > 0 ? (
            <div className="budget-list">
              {spendByCategory.map((budget) => {
                const hasLimit = budget.limit > 0;
                const ratio = hasLimit ? budget.spent / budget.limit * 100 : 0;
                const displayRatio = Math.round(ratio);
                const Icon = budgetIcons[budget.category] ?? CircleDollarSign;
                const state = !hasLimit
                  ? "no-limit"
                  : budget.spent > budget.limit
                    ? "over"
                    : ratio >= 80
                      ? "warning"
                      : "";
                const detail = !hasLimit
                  ? "Batas anggaran belum ditentukan"
                  : budget.spent > budget.limit
                    ? `Melebihi batas ${formatCompactRupiah(budget.spent - budget.limit)}`
                    : budget.spent === budget.limit
                      ? "Batas anggaran tercapai"
                      : budget.spent === 0
                        ? `${formatCompactRupiah(budget.limit)} masih tersedia`
                        : `Sisa ${formatCompactRupiah(budget.limit - budget.spent)}`;
                return (
                  <div className="budget-item" key={budget.category}>
                    <div className="budget-head">
                      <span className="budget-category"><Icon size={14} />{budget.category}</span>
                      <strong className={state ? `budget-status ${state}` : "budget-status"}>
                        {hasLimit ? `${displayRatio}%` : "—"}
                      </strong>
                    </div>
                    <div className="budget-values">
                      {formatCompactRupiah(budget.spent)}
                      <span> dari </span>
                      {hasLimit ? formatCompactRupiah(budget.limit) : "Belum ada batas"}
                    </div>
                    <div
                      className="budget-track"
                      role={hasLimit ? "progressbar" : "img"}
                      aria-label={`Anggaran ${budget.category}`}
                      aria-valuenow={hasLimit ? Math.min(displayRatio, 100) : undefined}
                      aria-valuemin={hasLimit ? 0 : undefined}
                      aria-valuemax={hasLimit ? 100 : undefined}
                    >
                      <div className={`budget-fill ${state}`} style={{ width: `${Math.min(displayRatio, 100)}%` }} />
                    </div>
                    <div className={`budget-hint ${state}`}>{detail}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="finance-panel-empty">
              <CircleDollarSign size={20} />
              <p>Belum ada kategori anggaran yang tersedia.</p>
            </div>
          )}
        </section>
      </div>

      <section className="card card-pad finance-transactions-panel">
        <SectionHeading
          title="Aktivitas transaksi"
          caption={`${filteredTransactions.length} transaksi pada ${monthLabel}`}
          action={
            filteredTransactions.length > 5 ? (
              <button
                className="finance-expand-button"
                type="button"
                onClick={() => setShowAllTransactions((current) => !current)}
                aria-expanded={showAllTransactions}
                aria-controls="finance-transaction-list"
              >
                {showAllTransactions ? "Tampilkan lebih sedikit" : `Lihat semua (${filteredTransactions.length})`}
                {showAllTransactions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <button className="text-button" type="button" onClick={onAdd}><Plus size={13} /> Tambah</button>
            )
          }
        />
        <div className="completion-filters finance-filters" role="group" aria-label="Filter jenis transaksi">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => { setFilter("all"); setShowAllTransactions(false); }}>Semua</button>
          <button type="button" className={filter === "income" ? "active" : ""} onClick={() => { setFilter("income"); setShowAllTransactions(false); }}>Pemasukan</button>
          <button type="button" className={filter === "expense" ? "active" : ""} onClick={() => { setFilter("expense"); setShowAllTransactions(false); }}>Pengeluaran</button>
        </div>
        <div className="transaction-list" id="finance-transaction-list">
          {visibleTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
        {filteredTransactions.length === 0 && (
          <EmptyState
            icon={Receipt}
            title={monthTransactions.length === 0 ? "Belum ada transaksi" : "Tidak ada transaksi pada filter ini"}
            description={monthTransactions.length === 0
              ? "Catat pemasukan atau pengeluaran pertama untuk mulai memahami arus uangmu."
              : "Coba pilih jenis transaksi yang lain."}
            action={monthTransactions.length === 0
              ? <PrimaryButton onClick={onAdd}><Plus size={14} /> Catat transaksi</PrimaryButton>
              : undefined}
          />
        )}
      </section>
    </>
  );
}
