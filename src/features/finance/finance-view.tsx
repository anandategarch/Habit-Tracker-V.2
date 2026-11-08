"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  Plus,
  Receipt,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import type { Budget, Transaction, TransactionCategory } from "@/lib/types";
import { formatCompactRupiah, formatRupiah, todayISO } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { budgetNarrative, categoryEmoji, financeAnomaly, financeStory } from "@/lib/storytelling";
import { RichText } from "@/components/ui/rich-text";
import { useCountUp } from "@/components/ui/celebrate";
import { EmptyState, PageIntro, PrimaryButton, SectionHeading, TransactionRow } from "@/components/ui/primitives";
import { FinanceCategoryIcon } from "@/components/ui/category-icons";

const categoryPaletteLength = 8;
type TransactionFilter = "all" | "income" | "expense";

// v0.18: prop onDelete dihapus — aksi hapus transaksi dipindahkan ke
// Pengaturan → Kelola & hapus data, agar daftar keuangan tetap ringkas.
export function FinanceView({ transactions, budgets, income, expense, onAdd, onEditBudgets }: {
  transactions: Transaction[];
  budgets: Budget[];
  income: number;
  expense: number;
  onAdd: () => void;
  onEditBudgets: () => void;
}) {
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const todayKey = todayISO();
  const currentMonthKey = todayKey.slice(0, 7);
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey),
    [transactions, monthKey],
  );
  const periodSummary = useMemo(() => ({
    income: monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0),
    expense: monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0),
  }), [monthTransactions]);
  const displayedIncome = monthKey === currentMonthKey ? income : periodSummary.income;
  const displayedExpense = monthKey === currentMonthKey ? expense : periodSummary.expense;
  const net = displayedIncome - displayedExpense;

  // Pengeluaran bulan sebelumnya — bahan kalimat tren ("turun 12% …").
  const previousMonthExpense = useMemo(() => {
    const [year, month] = monthKey.split("-").map(Number);
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
    return transactions
      .filter((transaction) => transaction.type === "expense" && transaction.date.slice(0, 7) === previousKey)
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [transactions, monthKey]);
  // Distribusi kategori bulan sebelumnya — bahan detektor anomali (financeAnomaly).
  const previousMonthCategories = useMemo(() => {
    const [year, month] = monthKey.split("-").map(Number);
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
    const totals = new Map<TransactionCategory, number>();
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense" || transaction.date.slice(0, 7) !== previousKey) return;
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
    });
    return [...totals.entries()].map(([category, spent]) => ({ category, spent }));
  }, [transactions, monthKey]);
  // Angka roll-up (Fase 1): rupiah "menghitung naik" saat masuk tab keuangan.
  const animatedNet = useCountUp(net, 900, 160);
  const animatedIncome = useCountUp(displayedIncome, 860, 240);
  const animatedExpense = useCountUp(displayedExpense, 860, 320);

  function changeMonth(offset: number) {
    const [year, month] = monthKey.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    const nextKey = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    if (nextKey <= currentMonthKey) {
      setMonthKey(nextKey);
      setShowAllTransactions(false);
    }
  }

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
  }).format(new Date(monthKey + "-01T12:00:00+07:00"));
  // Tiga keadaan: net = 0 sebelumnya salah menyatakan "pemasukan lebih besar"
  // padahal keduanya sama (audit v0.4.1).
  const cashflowMessage = net > 0
    ? "Pemasukan pada periode ini masih lebih besar dari pengeluaran."
    : net < 0
      ? "Pengeluaran pada periode ini lebih besar dari pemasukan."
      : "Pemasukan dan pengeluaran pada periode ini seimbang.";
  const comparisonScale = Math.max(displayedIncome, displayedExpense, 1);
  const incomeComparisonWidth = displayedIncome / comparisonScale * 100;
  const expenseComparisonWidth = displayedExpense / comparisonScale * 100;
  const expenseRatio = displayedIncome > 0
    ? Math.round(displayedExpense / displayedIncome * 100)
    : null;
  const comparisonInsight = monthTransactions.length === 0
    ? "Belum ada transaksi pada periode ini. Catat pemasukan atau pengeluaran untuk mulai melihat perbandingannya."
    : displayedIncome > 0 && displayedExpense > displayedIncome
      ? `Pengeluaran melampaui pemasukan sebesar ${formatCompactRupiah(displayedExpense - displayedIncome)}.`
      : displayedIncome > 0
        ? `Pengeluaran menggunakan ${expenseRatio}% dari total pemasukan.`
        : displayedExpense > 0
          ? "Belum ada pemasukan tercatat untuk dibandingkan dengan pengeluaran."
          : cashflowMessage;

  // Banner cerita keuangan (v0.12): satu kalimat insight berkode warna + chip
  // fakta cepat — menggantikan tumpukan angka sebagai pesan pertama layar.
  const topCategoryShare = expenseCategories.length > 0 && categorySpendTotal > 0
    ? { category: expenseCategories[0].category, share: expenseCategories[0].spent / categorySpendTotal * 100 }
    : null;
  // Alarm anomali: kategori yang melonjak vs bulan sebelumnya (naik ≥1,5×).
  const anomaly = useMemo(
    () => financeAnomaly({ current: expenseCategories, previous: previousMonthCategories }),
    [expenseCategories, previousMonthCategories],
  );
  const moneyStory = financeStory({
    income: displayedIncome,
    expense: displayedExpense,
    prevExpense: previousMonthExpense,
    budgets: spendByCategory.map((budget) => ({ category: budget.category, spent: budget.spent, limit: budget.limit })),
    topCategory: topCategoryShare,
    hasTransactions: monthTransactions.length > 0,
    anomaly,
  });

  return (
    <>
      <PageIntro
        icon="finance"
        title="Keuangan"
        action={<PrimaryButton onClick={onAdd}><Plus size={15} /> Catat transaksi</PrimaryButton>}
      />

      <div className="finance-period-control">
        <div className="finance-period-copy">
          <span className="finance-period-label">PERIODE LAPORAN</span>
          <strong aria-live="polite">{monthLabel}</strong>
        </div>
        <div className="finance-period-actions">
          <button
            type="button"
            className="finance-month-step"
            aria-label="Lihat bulan sebelumnya"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <label className="finance-month-input-wrap">
            <CalendarDays size={14} aria-hidden="true" />
            <span className="sr-only">Pilih bulan laporan</span>
            <input
              className="finance-month-input"
              type="month"
              value={monthKey}
              max={currentMonthKey}
              aria-label="Pilih bulan laporan"
              onChange={(event) => {
                if (!event.target.value || event.target.value > currentMonthKey) return;
                setMonthKey(event.target.value);
                setShowAllTransactions(false);
              }}
            />
          </label>
          <button
            type="button"
            className="finance-month-step"
            aria-label="Lihat bulan berikutnya"
            onClick={() => changeMonth(1)}
            disabled={monthKey >= currentMonthKey}
          >
            <ChevronRight size={16} />
          </button>
          {monthKey !== currentMonthKey && (
            <button
              type="button"
              className="finance-current-month"
              onClick={() => {
                setMonthKey(currentMonthKey);
                setShowAllTransactions(false);
              }}
            >
              <CalendarDays size={13} aria-hidden="true" /> Bulan ini
            </button>
          )}
        </div>
      </div>

      <section className="finance-story-banner" data-tone={moneyStory.tone} role="status" aria-live="polite" aria-label="Ringkasan cerita keuangan bulan ini">
        <span className="finance-story-emoji" aria-hidden="true">{moneyStory.emoji}</span>
        <div className="finance-story-copy">
          <h2 className="finance-story-headline"><RichText text={moneyStory.headline} /></h2>
          {moneyStory.chips.length > 0 && (
            <div className="finance-story-chips">
              {moneyStory.chips.map((chip) => (
                <span className="finance-story-chip" key={chip}><RichText text={chip} /></span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="finance-overview" aria-label={`Ringkasan keuangan ${monthLabel}`}>
        <div className="card finance-balance">
          <span className="small-label">ARUS KAS BERSIH</span>
          <div className="metric-value">{formatRupiah(animatedNet)}</div>
          <span className="finance-balance-note">{cashflowMessage}</span>
          <div className="finance-balance-period"><CalendarDays size={13} /> {monthLabel}</div>
        </div>
        <section className="card finance-metric">
          <span className="finance-metric-label">
            <span className="finance-metric-icon income"><ArrowDownLeft size={15} /></span>
            PEMASUKAN
          </span>
          <div className="metric-value metric-positive">{formatCompactRupiah(animatedIncome)}</div>
          <span className="stat-foot">Total pemasukan dalam periode ini</span>
        </section>
        <section className="card finance-metric">
          <span className="finance-metric-label">
            <span className="finance-metric-icon expense"><ArrowUpRight size={15} /></span>
            PENGELUARAN
          </span>
          <div className="metric-value metric-negative">{formatCompactRupiah(animatedExpense)}</div>
          <span className="stat-foot">Total pengeluaran dalam periode ini</span>
        </section>
      </section>

      <section className="card card-pad finance-compare-card" aria-labelledby="finance-cashflow-title">
        <div className="finance-compare-header">
          <div>
            <span className="finance-section-kicker">ARUS UANG</span>
            <h2 className="section-title" id="finance-cashflow-title">Pemasukan vs pengeluaran</h2>
            <p className="section-caption">Perbandingan total pada {monthLabel}</p>
          </div>
        </div>

        <div className="finance-compare-items">
          <div className="finance-compare-item income">
            <div className="finance-compare-label">
              <span className="finance-compare-icon income" aria-hidden="true"><ArrowDownLeft size={16} /></span>
              <span>Pemasukan</span>
            </div>
            <strong className="finance-compare-value">{formatCompactRupiah(displayedIncome)}</strong>
            <div className="finance-compare-track" aria-hidden="true">
              <span style={{ width: `${incomeComparisonWidth}%` }} />
            </div>
          </div>
          <div className="finance-compare-item expense">
            <div className="finance-compare-label">
              <span className="finance-compare-icon expense" aria-hidden="true"><ArrowUpRight size={16} /></span>
              <span>Pengeluaran</span>
            </div>
            <strong className="finance-compare-value">{formatCompactRupiah(displayedExpense)}</strong>
            <div className="finance-compare-track" aria-hidden="true">
              <span style={{ width: `${expenseComparisonWidth}%` }} />
            </div>
          </div>
        </div>

        <div className={`finance-compare-insight ${net > 0 ? "is-positive" : net < 0 ? "is-negative" : "is-neutral"}`} role="status" aria-live="polite">
          <span className="finance-compare-insight-mark" aria-hidden="true"><Wallet size={16} /></span>
          <p>{comparisonInsight}</p>
        </div>
      </section>

      <div className="finance-analysis-grid">
        <section className="card card-pad finance-category-panel">
          <SectionHeading
            title="Ke mana uang pergi?"
            caption="Distribusi pengeluaran menurut kategori pada periode terpilih"
          />
          <div className="finance-category-total">
            <span>Total pengeluaran tercatat</span>
            <strong>{formatCompactRupiah(categorySpendTotal)}</strong>
            <small>{expenseCategories.length} kategori</small>
          </div>
          {visibleExpenseCategories.length > 0 ? (
            <>
              {topCategoryShare && (
                <p className="finance-category-takeaway">
                  <RichText text={`${categoryEmoji(topCategoryShare.category)} **${topCategoryShare.category}** jadi pos terbesar — ${Math.round(topCategoryShare.share)}% dari pengeluaranmu`} />
                </p>
              )}
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
            </>
          ) : (
            <div className="finance-panel-empty">
              <Receipt size={20} />
              <p>Belum ada pengeluaran tercatat bulan ini. Kategori akan muncul setelah transaksi ditambahkan.</p>
            </div>
          )}
        </section>

        <section className="card card-pad finance-budget-panel">
          <SectionHeading
            title="Kontrol anggaran"
            caption="Pantau realisasi terhadap batas bulanan"
            action={
              <button className="text-button" type="button" onClick={onEditBudgets}>
                <SlidersHorizontal size={13} /> Atur
              </button>
            }
          />
          {monthKey !== currentMonthKey && (
            <p className="finance-budget-period-note">
              Perbandingan periode lampau memakai batas anggaran yang dikonfigurasi saat ini.
              Riwayat perubahan batas per bulan belum tersedia.
            </p>
          )}
          {spendByCategory.length > 0 ? (
            <div className="budget-list">
              {spendByCategory.map((budget) => {
                const hasLimit = budget.limit > 0;
                const ratio = hasLimit ? budget.spent / budget.limit * 100 : 0;
                const displayRatio = Math.round(ratio);
                const state = !hasLimit
                  ? "no-limit"
                  : budget.spent > budget.limit
                    ? "over"
                    : ratio >= 80
                      ? "warning"
                      : "";
                const detail = budgetNarrative(budget.spent, hasLimit ? budget.limit : 0);
                return (
                  <div className="budget-item" key={budget.category}>
                    <div className="budget-head">
                      <span className="budget-category"><FinanceCategoryIcon category={budget.category} size={16} />{budget.category}</span>
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
                    <div className={`budget-hint ${state}`}><RichText text={detail} /></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="finance-panel-empty budget-empty-with-action">
              <CircleDollarSign size={20} />
              <p>Belum ada kategori anggaran yang tersedia.</p>
              <PrimaryButton onClick={onEditBudgets}>
                <SlidersHorizontal size={14} /> Atur anggaran
              </PrimaryButton>
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
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => { setFilter("all"); setShowAllTransactions(false); }}><CircleDollarSign size={13} aria-hidden="true" /> Semua</button>
          <button type="button" className={filter === "income" ? "active" : ""} onClick={() => { setFilter("income"); setShowAllTransactions(false); }}><ArrowDownLeft size={13} aria-hidden="true" /> Pemasukan</button>
          <button type="button" className={filter === "expense" ? "active" : ""} onClick={() => { setFilter("expense"); setShowAllTransactions(false); }}><ArrowUpRight size={13} aria-hidden="true" /> Pengeluaran</button>
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
