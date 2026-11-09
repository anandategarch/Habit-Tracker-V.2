"use client";

import { useMemo, useState } from "react";
import type { Budget, Transaction } from "@/lib/types";
import type { OsActions, OsData } from "@/features/os/view-props";
import { formatCompactRupiah, formatDate, formatRupiah } from "@/lib/format";
import { summarizeBudgets } from "@/lib/finance";
import { lastDays } from "@/features/os/use-history";
import { FinanceCategoryIco } from "@/features/os/os-icons";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/features/os/os-icons";
import { Bars, ConfirmDialog, Donut, EmptyState, ProgressBar, SectionHead, StatTile, ViewHero } from "@/features/os/widgets";
import { OsIllustration } from "@/features/os/os-illustrations";

const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FinanceView({ data, actions }: { data: OsData; actions: OsActions }) {
  const { transactions, budgets, today } = data;
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [pendingBudgetDelete, setPendingBudgetDelete] = useState<Budget | null>(null);

  const monthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(month)), [transactions, month]);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const isCurrentMonth = month === currentMonth;

  /* expense by category (month) */
  const categoryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value);
  }, [monthTx]);

  /* daily expense — last 14 days ending today */
  const dailyBars = useMemo(() => {
    const days = lastDays(today, 14);
    const byDate = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
    return days.map((date) => ({
      label: String(Number(date.slice(8, 10))),
      value: byDate.get(date) ?? 0,
      hint: `${formatDate(date, { weekday: "long" })} — ${byDate.get(date) ? formatRupiah(byDate.get(date)!) : "Rp 0"}`,
      highlight: date === today,
    }));
  }, [transactions, today]);

  /* ledger */
  const filteredTx = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => (q === "" ? true : t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)))
      .filter((t) => (typeFilter === "all" ? true : t.type === typeFilter))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, query, typeFilter]);

  const grouped = useMemo(() => {
    const groups: Array<{ date: string; items: Transaction[]; net: number }> = [];
    for (const t of filteredTx) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) {
        last.items.push(t);
        last.net += t.type === "income" ? t.amount : -t.amount;
      } else {
        groups.push({ date: t.date, items: [t], net: t.type === "income" ? t.amount : -t.amount });
      }
    }
    return groups;
  }, [filteredTx]);

  const budgetRows = useMemo(
    () => summarizeBudgets(monthTx, budgets).sort((a, b) => b.spent / Math.max(b.limit, 1) - a.spent / Math.max(a.limit, 1)),
    [monthTx, budgets],
  );
  const [year, monthNum] = month.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`;

  function handleDelete() {
    if (!pendingDelete) return;
    actions.updateTransactions((current) => current.filter((t) => t.id !== pendingDelete.id));
  }

  function handleBudgetDelete() {
    if (!pendingBudgetDelete) return;
    actions.updateBudgets((current) => current.filter((b) => b.category !== pendingBudgetDelete.category));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* hero: ilustrasi + fakta bulan */}
      <ViewHero
        art={<OsIllustration variant="finance" size={76} />}
        eyebrow={`Keuangan · ${monthLabel}`}
        title={income - expense >= 0 ? `Surplus ${formatRupiah(income - expense)}` : `Defisit ${formatRupiah(expense - income)}`}
        sub={`Masuk ${formatCompactRupiah(income)} · Keluar ${formatCompactRupiah(expense)} · ${monthTx.length} transaksi`}
        action={
          <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newTransaction}>
            <PlusIcon size={15} />
            Transaksi
          </button>
        }
      />

      {/* month navigator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="os-btn !h-9 !w-9 !px-0"
            aria-label="Bulan sebelumnya"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
          >
            <ChevronLeftIcon size={15} />
          </button>
          <span className="num min-w-[130px] text-center text-[14.5px] font-semibold text-ink">{monthLabel}</span>
          <button
            type="button"
            className="os-btn !h-9 !w-9 !px-0"
            aria-label="Bulan berikutnya"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRightIcon size={15} />
          </button>
        </div>
        <span className="num hidden text-[12px] text-dim sm:block">{monthTx.length} transaksi bulan ini</span>
      </div>

      {/* summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Pemasukan" value={formatRupiah(income)} sub={`${monthTx.filter((t) => t.type === "income").length} transaksi`} tone="accent" />
        <StatTile label="Pengeluaran" value={formatRupiah(expense)} sub={`${monthTx.filter((t) => t.type === "expense").length} transaksi`} tone="crimson" />
        <StatTile
          label="Selisih"
          value={formatRupiah(income - expense)}
          sub={income - expense >= 0 ? "Surplus" : "Defisit"}
          tone={income - expense >= 0 ? "accent" : "crimson"}
        />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="os-card p-4 sm:p-5 xl:col-span-7" aria-label="Pengeluaran harian">
          <SectionHead title="Pengeluaran harian" right={<span className="num text-[12px] text-dim">14 hari terakhir</span>} />
          {dailyBars.every((b) => b.value === 0) ? (
            <EmptyState art={<OsIllustration variant="finance" size={104} />} title="Belum ada pengeluaran" hint="Catat transaksi pertama untuk melihat grafik harian." />
          ) : (
            <Bars data={dailyBars} tone="crimson" label="Grafik pengeluaran harian 14 hari terakhir" />
          )}
        </section>

        <section className="os-card p-4 sm:p-5 xl:col-span-5" aria-label="Pengeluaran per kategori">
          <SectionHead title="Per kategori" right={<span className="num text-[12px] text-dim">{monthLabel}</span>} />
          {categoryRows.length === 0 ? (
            <EmptyState art={<OsIllustration variant="receipt" size={104} />} title="Belum ada data" hint="Kategori muncul setelah ada pengeluaran bulan ini." />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <Donut slices={categoryRows.slice(0, 8).map((row) => ({ label: row.category, value: row.value }))} label="Porsi pengeluaran per kategori bulan ini" size={140} />
              <ul className="flex w-full min-w-0 flex-1 flex-col gap-2">
                {categoryRows.slice(0, 5).map((row, i) => (
                  <li key={row.category} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: ["#37d99a", "#f2b64c", "#ec8b5f", "#f37272", "#a3e635"][i % 5] }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-[12.5px] font-medium text-ink">{row.category}</span>
                    </span>
                    <span className="num shrink-0 text-[12px] text-dim">
                      {formatCompactRupiah(row.value)} · {Math.round((row.value / Math.max(expense, 1)) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* budgets */}
      <section className="os-card" aria-label="Anggaran bulanan">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-[13.5px] font-semibold text-ink">Anggaran bulanan</h2>
          <button type="button" className="os-btn !h-8 !px-3 !text-[12px]" onClick={actions.newBudget}>
            <PlusIcon size={14} />
            Anggaran
          </button>
        </div>
        {budgetRows.length === 0 ? (
          <EmptyState
            art={<OsIllustration variant="budget" size={104} />}
            title="Belum ada anggaran"
            hint="Tetapkan batas belanja bulanan per kategori agar pengeluaran terkendali."
            action={
              <button type="button" className="os-btn os-btn-primary !h-9" onClick={actions.newBudget}>
                <PlusIcon size={15} />
                Atur anggaran
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 px-4 py-4 sm:px-5 lg:grid-cols-2">
            {budgetRows.map((row) => {
              const pct = row.limit > 0 ? Math.round((row.spent / row.limit) * 100) : 0;
              return (
                <li key={row.category} className="border-b border-line py-3.5 last:border-b-0 lg:[&:nth-last-child(2)]:border-b-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#232c25] bg-[#121712] text-dim">
                        <FinanceCategoryIco category={row.category} size={15} />
                      </span>
                      <span className="truncate text-[13px] font-semibold text-ink">{row.category}</span>
                      <span
                        className={`num shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${pct > 100 ? "bg-[#f372721f] text-crimson" : pct > 80 ? "bg-[#f2b64c1a] text-amber" : "bg-[#37d99a14] text-accent"}`}
                      >
                        {pct}%
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="num text-[11.5px] text-dim">
                        {formatCompactRupiah(row.spent)} / {formatCompactRupiah(row.limit)}
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:text-ink"
                        aria-label={`Ubah anggaran ${row.category}`}
                        title="Ubah"
                        onClick={() => actions.editBudget(row)}
                      >
                        <PencilIcon size={14} />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:text-crimson"
                        aria-label={`Hapus anggaran ${row.category}`}
                        title="Hapus"
                        onClick={() => setPendingBudgetDelete(row)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </span>
                  </div>
                  <ProgressBar value={row.spent} max={row.limit} label={`Anggaran ${row.category}`} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ledger */}
      <section className="os-card" aria-label="Daftar transaksi">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13.5px] font-semibold text-ink">Semua transaksi</h2>
            <span className="num text-[12px] text-dim">{filteredTx.length} catatan</span>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
                <SearchIcon size={14} />
              </span>
              <input
                className="os-input !h-9 !pl-9 !text-[13px]"
                placeholder="Cari transaksi…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Cari transaksi"
              />
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Filter jenis">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "income", label: "Masuk" },
                  { id: "expense", label: "Keluar" },
                ] as const
              ).map((f) => (
                <button key={f.id} type="button" className="os-chip !h-9" aria-pressed={typeFilter === f.id} onClick={() => setTypeFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            art={<OsIllustration variant={query || typeFilter !== "all" ? "search" : "receipt"} size={104} />}
            title={query || typeFilter !== "all" ? "Tidak ada yang cocok" : "Belum ada transaksi"}
            hint={query || typeFilter !== "all" ? "Coba ubah kata kunci atau filter." : "Catat pemasukan dan pengeluaran pertama."}
          />
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-[#10140f] px-4 py-2 sm:px-5">
                  <span className="text-[11.5px] font-semibold text-dim">{formatDate(group.date, { weekday: "long", year: "numeric" })}</span>
                  <span className={`num text-[11.5px] font-semibold ${group.net >= 0 ? "text-accent" : "text-crimson"}`}>
                    {group.net >= 0 ? "+" : "−"}
                    {formatCompactRupiah(Math.abs(group.net))}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {group.items.map((tx) => (
                    <li key={tx.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#10150f] sm:px-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#232c25] bg-[#121712] text-dim">
                        <FinanceCategoryIco category={tx.category} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{tx.title}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-faint">{tx.category}</p>
                      </div>
                      <span className={`num shrink-0 text-[13.5px] font-semibold ${tx.type === "income" ? "text-accent" : "text-crimson"}`}>
                        {tx.type === "income" ? "+" : "−"}
                        {formatRupiah(tx.amount)}
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:text-ink"
                          aria-label={`Ubah ${tx.title}`}
                          title="Ubah"
                          onClick={() => actions.editTransaction(tx)}
                        >
                          <PencilIcon size={14} />
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-faint transition-colors hover:text-crimson"
                          aria-label={`Hapus ${tx.title}`}
                          title="Hapus"
                          onClick={() => setPendingDelete(tx)}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Hapus transaksi?"
        description={`"${pendingDelete?.title ?? ""}" (${formatRupiah(pendingDelete?.amount ?? 0)}) akan dihapus permanen.`}
        confirmLabel="Ya, hapus"
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={pendingBudgetDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBudgetDelete(null);
        }}
        title="Hapus anggaran?"
        description={`Anggaran untuk kategori ${pendingBudgetDelete?.category ?? ""} akan dihapus.`}
        confirmLabel="Ya, hapus"
        onConfirm={handleBudgetDelete}
      />
    </div>
  );
}
