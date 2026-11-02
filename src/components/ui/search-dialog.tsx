import { ArrowDownLeft, ArrowUpRight, BookOpen, Search, WalletCards, X } from "lucide-react";
import type { Habit, TabId, Transaction } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";

interface SearchDialogProps {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  habits: Habit[];
  transactions: Transaction[];
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
}

export function SearchDialog({
  open,
  query,
  onQueryChange,
  habits,
  transactions,
  onClose,
  onNavigate,
}: SearchDialogProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const matchedHabits = normalizedQuery
    ? habits.filter((habit) => `${habit.title} ${habit.category}`.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    : [];
  const matchedTransactions = normalizedQuery
    ? transactions.filter((transaction) => `${transaction.title} ${transaction.category}`.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    : [];

  if (!open) return null;

  function select(tab: TabId) {
    onNavigate(tab);
    onClose();
  }

  return (
    <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-card search-card" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div className="search-heading">
          <div>
            <div className="eyebrow">TEMUKAN DENGAN CEPAT</div>
            <h2 id="search-title" className="modal-title">Cari di Rutina</h2>
          </div>
          <button className="icon-button" aria-label="Tutup pencarian" onClick={onClose}><X size={17} /></button>
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari habit atau transaksi..."
            aria-label="Kata kunci pencarian"
          />
          <kbd>ESC</kbd>
        </label>
        {!normalizedQuery ? (
          <div className="search-hints">
            <span className="small-label">PINTASAN</span>
            <button onClick={() => select("habits")}><BookOpen size={15} /> Jelajahi habit <span>→</span></button>
            <button onClick={() => select("finance")}><WalletCards size={15} /> Buka keuangan <span>→</span></button>
          </div>
        ) : (
          <div className="search-results">
            {matchedHabits.length > 0 && (
              <div className="search-result-group">
                <span className="small-label">HABIT · {matchedHabits.length}</span>
                {matchedHabits.map((habit) => (
                  <button className="search-result" key={habit.id} onClick={() => select("habits")}>
                    <span className="search-result-icon"><BookOpen size={16} /></span>
                    <span className="search-result-copy"><strong>{habit.title}</strong><small>{habit.category} · {habit.time}</small></span>
                    <span className="search-result-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
            {matchedTransactions.length > 0 && (
              <div className="search-result-group">
                <span className="small-label">TRANSAKSI · {matchedTransactions.length}</span>
                {matchedTransactions.map((transaction) => (
                  <button className="search-result" key={transaction.id} onClick={() => select("finance")}>
                    <span className={`search-result-icon ${transaction.type}`}>
                      {transaction.type === "income" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <span className="search-result-copy"><strong>{transaction.title}</strong><small>{transaction.category} · {formatDate(transaction.date)}</small></span>
                    <span className="search-result-amount">{formatRupiah(transaction.amount)}</span>
                  </button>
                ))}
              </div>
            )}
            {matchedHabits.length === 0 && matchedTransactions.length === 0 && (
              <div className="search-empty"><Search size={22} /><strong>Tidak ditemukan</strong><span>Coba kata kunci atau kategori lain.</span></div>
            )}
          </div>
        )}
        <div className="search-footer"><span>Data pencarian tersimpan secara lokal</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd></span></div>
      </section>
    </div>
  );
}
