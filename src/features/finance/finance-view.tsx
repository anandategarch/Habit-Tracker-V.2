"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CircleDollarSign, Coffee, Heart, Plus, Receipt, Sprout } from "lucide-react";
import type { Budget, Transaction, TransactionCategory } from "@/lib/types";
import { formatCompactRupiah, formatRupiah } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { EmptyState, PageIntro, PrimaryButton, SectionHeading, TransactionRow } from "@/components/ui/primitives";

const budgetIcons: Record<string, typeof Coffee> = {
  Makanan: Coffee,
  Transportasi: Activity,
  Tagihan: CircleDollarSign,
  Lifestyle: Heart,
};

type TransactionFilter = "all" | "income" | "expense";

export function FinanceView({ transactions, budgets, income, expense, onAdd }: {
  transactions: Transaction[]; budgets: Budget[]; income: number; expense: number; onAdd: () => void;
}) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const net = income - expense;
  const spendByCategory = summarizeBudgets(transactions, budgets);
  const expenseCategories = useMemo(() => {
    const totals = new Map<TransactionCategory, number>();
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    });
    return [...totals.entries()]
      .map(([category, spent]) => ({ category, spent }))
      .sort((a, b) => b.spent - a.spent);
  }, [transactions]);
  const categorySpendTotal = expenseCategories.reduce((sum, item) => sum + item.spent, 0);
  const categoryPalette = [
    "var(--spend-color-0)", "var(--spend-color-1)", "var(--spend-color-2)", "var(--spend-color-3)",
    "var(--spend-color-4)", "var(--spend-color-5)", "var(--spend-color-6)", "var(--spend-color-7)",
  ];
  const categoryGradient = expenseCategories.map((item, index) => {
    const precedingSpend = expenseCategories
      .slice(0, index)
      .reduce((sum, category) => sum + category.spent, 0);
    const start = categorySpendTotal > 0 ? precedingSpend / categorySpendTotal * 100 : 0;
    const end = categorySpendTotal > 0 ? (precedingSpend + item.spent) / categorySpendTotal * 100 : 0;
    return `${categoryPalette[index % categoryPalette.length]} ${start}% ${end}%`;
  }).join(", ");
  const filteredTransactions = useMemo(
    () => [...transactions]
      .filter((transaction) => filter === "all" || transaction.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, filter],
  );
  // Data difilter berdasarkan bulan Asia/Jakarta (todayISO), jadi label bulan
  // harus memakai zona waktu yang sama agar tidak selisih di batas bulan.
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <>
      <PageIntro
        eyebrow={`KEUANGAN PRIBADI · ${monthLabel.toUpperCase()}`}
        title="Uang lebih terarah."
        subtitle="Kenali arus uangmu, atur batas, dan ambil keputusan dengan sadar."
        action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Catat transaksi</PrimaryButton>}
      />

      <div className="finance-overview">
        <section className="card finance-balance">
          <span className="small-label">ARUS KAS BERSIH</span>
          <div className="metric-value">{formatRupiah(net)}</div>
          <span className="finance-balance-note">Pemasukan dikurangi pengeluaran bulan ini</span>
        </section>
        <section className="card finance-metric">
          <span className="finance-metric-label"><span className="finance-metric-icon income"><ArrowDownLeft size={14} /></span> PEMASUKAN</span>
          <div className="metric-value metric-positive">{formatCompactRupiah(income)}</div>
          <span className="stat-foot">Total uang masuk</span>
        </section>
        <section className="card finance-metric">
          <span className="finance-metric-label"><span className="finance-metric-icon expense"><ArrowUpRight size={14} /></span> PENGELUARAN</span>
          <div className="metric-value metric-negative">{formatCompactRupiah(expense)}</div>
          <span className="stat-foot">Total uang keluar</span>
        </section>
      </div>

      <div className="finance-content-grid">
        <section className="card card-pad finance-transactions-panel">
          <SectionHeading
            title="Transaksi bulan ini"
            caption={`${filteredTransactions.length} dari ${transactions.length} transaksi`}
            action={<button className="text-button" type="button" onClick={onAdd}><Plus size={13} /> Tambah</button>}
          />
          <div className="completion-filters finance-filters" role="group" aria-label="Filter jenis transaksi">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Semua</button>
            <button type="button" className={filter === "income" ? "active" : ""} onClick={() => setFilter("income")}>Pemasukan</button>
            <button type="button" className={filter === "expense" ? "active" : ""} onClick={() => setFilter("expense")}>Pengeluaran</button>
          </div>
          <div className="transaction-list">
            {filteredTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
          </div>
          {filteredTransactions.length === 0 && (
            <EmptyState
              icon={Receipt}
              title={transactions.length === 0 ? "Belum ada transaksi" : "Tidak ada transaksi pada filter ini"}
              description={transactions.length === 0 ? "Catat pemasukan atau pengeluaran pertama untuk mulai memahami arus uangmu." : "Coba pilih jenis transaksi yang lain."}
              action={transactions.length === 0 ? <PrimaryButton onClick={onAdd}><Plus size={14} /> Catat transaksi</PrimaryButton> : undefined}
            />
          )}
        </section>

        <section className="card card-pad finance-budget-panel">
          <SectionHeading title="Anggaran kategori" caption="Batas bulanan yang digunakan saat ini" />
          <div className="finance-spend-summary">
            <div className="finance-spend-heading">
              <div><strong>Distribusi pengeluaran</strong><small>Proporsi dari transaksi bulan ini</small></div>
              <span>{expenseCategories.length} kategori</span>
            </div>
            {categorySpendTotal > 0 ? (
              <div className="finance-spend-content">
                <div
                  className="finance-spend-donut"
                  style={{ background: `conic-gradient(${categoryGradient})` }}
                  role="img"
                  aria-label={`Distribusi pengeluaran bulan ini sebesar ${formatCompactRupiah(categorySpendTotal)} di ${expenseCategories.length} kategori`}
                >
                  <div><strong>{formatCompactRupiah(categorySpendTotal)}</strong><span>Total keluar</span></div>
                </div>
                <div className="finance-spend-legend">
                  {expenseCategories.map((item, index) => (
                    <div className="finance-spend-legend-row" key={item.category}>
                      <span className={`finance-spend-swatch tone-${index % categoryPalette.length}`} />
                      <span className="finance-spend-legend-copy"><strong>{item.category}</strong><small>{formatCompactRupiah(item.spent)}</small></span>
                      <b>{Math.round(item.spent / categorySpendTotal * 100)}%</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="finance-spend-empty"><span><Sprout size={21} /></span><p>Belum ada pengeluaran tercatat bulan ini. Distribusi kategori akan muncul setelah transaksi ditambahkan.</p></div>
            )}
          </div>
          <div className="budget-list">
            {spendByCategory.map((budget) => {
              const ratio = budget.limit > 0 ? budget.spent / budget.limit * 100 : (budget.spent > 0 ? 100 : 0);
              const displayRatio = Math.round(ratio);
              const Icon = budgetIcons[budget.category] ?? CircleDollarSign;
              const state = ratio >= 100 ? "over" : ratio >= 80 ? "warning" : "";
              return (
                <div className="budget-item" key={budget.category}>
                  <div className="budget-head">
                    <span className="budget-category"><Icon size={14} />{budget.category}</span>
                    <strong className={state ? `budget-status ${state}` : "budget-status"}>{displayRatio}%</strong>
                  </div>
                  <div className="budget-values">{formatCompactRupiah(budget.spent)} <span>dari</span> {formatCompactRupiah(budget.limit)}</div>
                  <div className="budget-track" role="progressbar" aria-label={`Anggaran ${budget.category}`} aria-valuenow={Math.min(displayRatio, 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`budget-fill ${state}`} style={{ width: `${Math.min(displayRatio, 100)}%` }} />
                  </div>
                  <div className="budget-hint">{ratio >= 100 ? "Batas anggaran terlampaui" : ratio >= 80 ? "Mendekati batas anggaran" : budget.spent === 0 ? "Belum ada pengeluaran" : "Masih dalam batas anggaran"}</div>
                </div>
              );
            })}
            {spendByCategory.length === 0 && <p className="section-caption">Belum ada kategori anggaran yang tersedia.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
