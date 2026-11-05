"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, LoaderCircle, Plus, Trash2, Wallet, X } from "lucide-react";
import { DEFAULT_TRANSACTION_CATEGORIES } from "@/lib/types";
import type { Budget } from "@/lib/types";
import { IconAction, PrimaryButton } from "@/components/ui/primitives";
import { ThemedSelect } from "@/components/ui/themed-select";

const CUSTOM_CATEGORY_VALUE = "__custom__";

interface BudgetRowState {
  key: string;
  category: string;
  limit: string;
  custom: boolean;
}

let rowKeySeed = 0;
function nextRowKey(): string {
  rowKeySeed += 1;
  return `budget-row-${rowKeySeed}`;
}

function toRowState(budget: Budget): BudgetRowState {
  const known = DEFAULT_TRANSACTION_CATEGORIES.includes(budget.category);
  return {
    key: nextRowKey(),
    category: known ? budget.category : CUSTOM_CATEGORY_VALUE,
    limit: budget.limit > 0 ? String(budget.limit) : "",
    custom: !known,
  };
}

/**
 * Modal "Atur anggaran" — satu-satunya jalur untuk menambah atau mengubah
 * batas belanja bulanan per kategori. Mengikuti pola EntryModal (fokus trap,
 * Escape, kunci scroll, validasi inline berbahasa Indonesia) dan hanya memakai
 * kelas form yang sudah ada agar konsisten dengan pedoman UI.
 */
export function BudgetModal({ budgets, onClose, onSubmit }: {
  budgets: Budget[];
  onClose: () => void;
  onSubmit: (budgets: Budget[]) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [rows, setRows] = useState<BudgetRowState[]>(() => budgets.map(toRowState));
  const [customText, setCustomText] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const budget of budgets) {
      if (!DEFAULT_TRANSACTION_CATEGORIES.includes(budget.category)) {
        const row = toRowState(budget);
        initial[row.key] = budget.category;
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>("[autofocus]") ?? dialogRef.current?.querySelector<HTMLElement>("input, select, button");
    const focusTimeout = window.setTimeout(() => firstFocusable?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimeout);
      previousFocus?.focus();
    };
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function addRow(): void {
    const used = new Set(rows.filter((row) => row.category !== CUSTOM_CATEGORY_VALUE).map((row) => row.category));
    const freeCategory = DEFAULT_TRANSACTION_CATEGORIES.find((category) => !used.has(category));
    setRows((current) => [
      ...current,
      {
        key: nextRowKey(),
        category: freeCategory ?? CUSTOM_CATEGORY_VALUE,
        limit: "",
        custom: !freeCategory,
      },
    ]);
  }

  function removeRow(key: string): void {
    setRows((current) => current.filter((row) => row.key !== key));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateRow(key: string, patch: Partial<BudgetRowState>): void {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function categoryOfRow(row: BudgetRowState): string {
    return row.category === CUSTOM_CATEGORY_VALUE
      ? (customText[row.key] ?? "").trim()
      : row.category;
  }

  function handleSubmit(): void {
    if (submitting) return;
    const nextErrors: Record<string, string> = {};
    const seen = new Set<string>();
    const nextBudgets: Budget[] = [];

    for (const row of rows) {
      const category = categoryOfRow(row);
      const limitValue = Number(row.limit);
      if (!category) {
        nextErrors[row.key] = "Kategori wajib diisi.";
        continue;
      }
      if (seen.has(category)) {
        nextErrors[row.key] = "Kategori ini sudah dipakai.";
        continue;
      }
      if (!Number.isFinite(limitValue) || !Number.isSafeInteger(limitValue) || limitValue <= 0) {
        nextErrors[row.key] = "Batas harus berupa rupiah bulat lebih dari Rp0.";
        continue;
      }
      seen.add(category);
      nextBudgets.push({ category, limit: limitValue });
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    onSubmit(nextBudgets);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="modal-card entry-modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title" onKeyDown={handleDialogKeyDown}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">KONTROL ANGGARAN</div>
            <h2 className="modal-title" id="budget-modal-title">Atur anggaran</h2>
            <p className="modal-description">Tentukan batas belanja bulanan untuk tiap kategori yang ingin kamu pantau.</p>
          </div>
          <IconAction label="Tutup dialog" onClick={onClose}><X size={17} /></IconAction>
        </div>
        <form className="form-grid" noValidate onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
          {rows.length === 0 ? (
            <div className="budget-editor-empty">
              <Wallet size={20} />
              <p>Belum ada kategori anggaran. Tambahkan satu untuk mulai memantau batas belanjamu.</p>
            </div>
          ) : (
            <div className="budget-editor-rows">
              {rows.map((row) => {
                const options = DEFAULT_TRANSACTION_CATEGORIES.filter(
                  (category) => category === row.category || !rows.some((other) => other.category === category),
                );
                const categoryValue = categoryOfRow(row);
                return (
                  <div className="budget-editor-row" key={row.key}>
                    <div className="budget-editor-fields">
                      <label className="form-field">
                        <span className="form-label">Kategori</span>
                        <ThemedSelect
                          className="form-control"
                          value={row.category}
                          autoFocus={row.limit === "" && row.key === rows[rows.length - 1]?.key && rows.length > budgets.length}
                          onChange={(value) => updateRow(row.key, {
                            category: value,
                            custom: value === CUSTOM_CATEGORY_VALUE,
                          })}
                        >
                          {options.map((category) => (
                            <option value={category} key={category}>{category}</option>
                          ))}
                          <option value={CUSTOM_CATEGORY_VALUE}>Kategori lain…</option>
                        </ThemedSelect>
                        {row.custom && (
                          <input
                            className="form-control"
                            placeholder="Tulis nama kategori"
                            maxLength={60}
                            value={customText[row.key] ?? ""}
                            onChange={(event) => setCustomText((current) => ({ ...current, [row.key]: event.target.value }))}
                            aria-label="Nama kategori kustom"
                          />
                        )}
                      </label>
                      <label className="form-field">
                        <span className="form-label">Batas bulanan</span>
                        <div className="amount-field">
                          <span>Rp</span>
                          <input
                            className="form-control"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            placeholder="500000"
                            value={row.limit}
                            onChange={(event) => updateRow(row.key, { limit: event.target.value })}
                          />
                        </div>
                      </label>
                    </div>
                    <IconAction label={`Hapus anggaran ${categoryValue || "ini"}`} className="budget-editor-remove" onClick={() => removeRow(row.key)}>
                      <Trash2 size={15} />
                    </IconAction>
                    {errors[row.key] && <span className="field-error budget-editor-error" role="alert">{errors[row.key]}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" className="budget-add-row" onClick={addRow}>
            <Plus size={15} /> Tambah kategori
          </button>
          <p className="form-hint">Anggaran berlaku untuk bulan berjalan dan bulan-bulan berikutnya. Kamu bisa mengubahnya kapan saja.</p>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Batal</button>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle size={15} className="spin-icon" /> : <Check size={15} />} {submitting ? "Menyimpan…" : "Simpan anggaran"}
            </PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}
