"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Search, WalletCards, X } from "lucide-react";
import { FinanceCategoryIcon, HabitArtIcon } from "@/components/ui/category-icons";
import type { KeyboardEvent } from "react";
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
  open, query, onQueryChange, habits, transactions, onClose, onNavigate,
}: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [open]);

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

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    // ESC: tutup dialog sesuai petunjuk <kbd>ESC</kbd> yang ditampilkan.
    // Sebelumnya petunjuk ada tapi tombolnya tidak bekerja (audit v0.13).
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    // Navigasi hasil dengan panah: ↑/↓ berpindah antar hasil (dan kembali
    // ke input dari hasil pertama). Enter pada tombol hasil = klik native.
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const results = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(".search-result") ?? []);
      if (results.length === 0) return;
      event.preventDefault();
      const current = results.indexOf(document.activeElement as HTMLElement);
      if (current === -1) { results[0].focus(); return; }
      if (event.key === "ArrowDown") {
        if (current < results.length - 1) results[current + 1].focus();
      } else if (current > 0) results[current - 1].focus();
      else inputRef.current?.focus();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    if (elements.length === 0) return;
    if (event.shiftKey && document.activeElement === elements[0]) {
      event.preventDefault();
      elements[elements.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) {
      event.preventDefault();
      elements[0].focus();
    }
  }

  return (
    <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="modal-card search-card" role="dialog" aria-modal="true" aria-labelledby="search-title" onKeyDown={handleDialogKeyDown}>
        <div className="search-heading">
          <div>
            <div className="eyebrow">TEMUKAN DENGAN CEPAT</div>
            <h2 id="search-title" className="modal-title">Cari di Rutina</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Tutup pencarian" onClick={onClose}><X size={17} /></button>
        </div>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari kebiasaan atau transaksi…"
            aria-label="Kata kunci pencarian"
          />
          <kbd>ESC</kbd>
        </label>
        {!normalizedQuery ? (
          <div className="search-hints">
            <span className="small-label">PINTASAN</span>
            <button type="button" onClick={() => select("habits")}><BookOpen size={15} /> Jelajahi kebiasaan <span>→</span></button>
            <button type="button" onClick={() => select("finance")}><WalletCards size={15} /> Buka keuangan <span>→</span></button>
          </div>
        ) : (
          <div className="search-results">
            {matchedHabits.length > 0 && (
              <div className="search-result-group">
                <span className="small-label">KEBIASAAN · {matchedHabits.length}</span>
                {matchedHabits.map((habit) => (
                  <button type="button" className="search-result" key={habit.id} onClick={() => select("habits")}>
                    <span className="search-result-icon"><HabitArtIcon icon={habit.icon} size={18} /></span>
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
                  <button type="button" className="search-result" key={transaction.id} onClick={() => select("finance")}>
                    <span className={`search-result-icon ${transaction.type}`}>
                      <FinanceCategoryIcon category={transaction.category} size={18} />
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
        <div className="search-footer"><span>Pencarian menggunakan data workspace</span><span><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></span></div>
      </section>
    </div>
  );
}
