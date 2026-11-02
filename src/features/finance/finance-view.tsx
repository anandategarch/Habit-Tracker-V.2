import { Activity, ArrowDownLeft, ArrowUpRight, CircleDollarSign, Coffee, Heart, Plus } from "lucide-react";
import type { Budget, Transaction } from "@/lib/types";
import { formatCompactRupiah, formatRupiah } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { PageIntro, PrimaryButton, SectionHeading, TransactionRow } from "@/components/ui/primitives";

const budgetIcons: Record<string, typeof Coffee> = {
  Makanan: Coffee,
  Transportasi: Activity,
  Tagihan: CircleDollarSign,
  Lifestyle: Heart,
};

export function FinanceView({ transactions, budgets, income, expense, onAdd }: {
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
