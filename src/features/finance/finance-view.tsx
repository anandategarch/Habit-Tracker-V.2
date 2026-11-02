"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CircleDollarSign, Coffee, Heart, Plus, Receipt } from "lucide-react";
import type { Budget, Transaction } from "@/lib/types";
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
  const filteredTransactions = useMemo(
    () => [...transactions]
      .filter((transaction) => filter === "all" || transaction.type === filter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, filter],
  );
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());

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

        <section className="card card-pad">
          <SectionHeading title="Anggaran kategori" caption="Batas bulanan yang digunakan saat ini" />
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
