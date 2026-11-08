"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, LoaderCircle, Plus, Trash2, Wallet, X } from "lucide-react";
import { DEFAULT_TRANSACTION_CATEGORIES } from "@/lib/types";
import type { Budget } from "@/lib/types";
import { IconAction, PrimaryButton } from "@/components/ui/primitives";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  const { confirm } = useConfirm();
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
  // A11y v0.20 (audit 2.4.3): tangkap pemicu saat RENDER PERTAMA — sebelum
  // autoFocus React memindahkan fokus ke dalam modal (penjelasan lengkap di
  // EntryModal). Menangkap di useEffect membuat restore mengenai node terlepas.
  const previousFocusRef = useRef<HTMLElement | null>(
    typeof document === "undefined" || !(document.activeElement instanceof HTMLElement)
      ? null
      : document.activeElement,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Ref tidak pernah berubah setelah render pertama — salin agar cleanup
    // membaca nilai yang sama (pola disarankan react-hooks/exhaustive-deps).
    const restoreFocus = previousFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // React 19 tidak merender prop autoFocus sebagai atribut DOM — fallback:
    // kontrol form pertama, bukan tombol tutup (audit a11y v0.20).
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLElement>("[autofocus]") ??
      dialogRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, [role=combobox]") ??
      dialogRef.current?.querySelector<HTMLElement>(".primary-button, .budget-add-row") ??
      dialogRef.current?.querySelector<HTMLElement>('button:not([aria-label="Tutup dialog"])') ??
      dialogRef.current?.querySelector<HTMLElement>("button");
    const focusTimeout = window.setTimeout(() => firstFocusable?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimeout);
      restoreFocus?.focus();
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
      // Tolak notasi ilmiah dan desimal pada batas — sebelumnya type="number"
      // menerima 1e10 lalu disimpan sebagai 10 miliar rupiah (audit v0.13).
      const limitRaw = String(row.limit).trim();
      if (!/^\d+$/.test(limitRaw)) {
        nextErrors[row.key] = "Batas harus berupa angka bulat, tanpa koma atau huruf.";
        continue;
      }
      const limitValue = Number(limitRaw);
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

    // Konfirmasi destruktif saat semua baris dihapus (audit v0.13): sebelumnya
    // “Simpan anggaran” dengan daftar kosong diam-diam menghapus seluruh batas
    // bulanan tanpa peringatan bertema.
    if (nextBudgets.length === 0 && budgets.length > 0) {
      confirm({
        tone: "danger",
        title: "Hapus semua anggaran?",
        message: "Tidak ada kategori yang tersisa. Semua batas bulanan akan dihapus dari pengaturanmu.",
        note: "Tindakan ini tidak bisa dibatalkan.",
        confirmLabel: "Ya, hapus semua",
        onConfirm: () => {
          setSubmitting(true);
          try {
            onSubmit(nextBudgets);
          } catch {
            setSubmitting(false);
          }
        },
      });
      return;
    }

    setSubmitting(true);
    try {
      onSubmit(nextBudgets);
    } catch {
      setSubmitting(false);
    }
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
                          <span aria-hidden="true">Rp</span>
                          <input
                            className="form-control"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            enterKeyHint="done"
                            placeholder="500000"
                            value={row.limit}
                            aria-invalid={Boolean(errors[row.key]) || undefined}
                            aria-describedby={errors[row.key] ? `budget-error-${row.key}` : undefined}
                            onChange={(event) => updateRow(row.key, { limit: event.target.value })}
                          />
                        </div>
                      </label>
                    </div>
                    <IconAction label={`Hapus anggaran ${categoryValue || "ini"}`} className="budget-editor-remove" onClick={() => removeRow(row.key)}>
                      <Trash2 size={15} />
                    </IconAction>
                    {errors[row.key] && <span className="field-error budget-editor-error" role="alert" id={`budget-error-${row.key}`}>{errors[row.key]}</span>}
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
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle size={15} className="spin-icon" /> : <Check size={15} />} {submitting ? "Menyimpan…" : "Simpan anggaran"}
            </PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}
