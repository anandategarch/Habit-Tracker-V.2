"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Check, LoaderCircle, SlidersHorizontal, X } from "lucide-react";
import { DEFAULT_TRANSACTION_CATEGORIES } from "@/lib/types";
import type { Wallet, HabitGroup } from "@/lib/module-types";
import { todayISO } from "@/lib/format";
import { IconAction, PrimaryButton } from "@/components/ui/primitives";

interface RemoteCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  sortOrder: number;
}

export function EntryModal({ mode, onClose, onSubmit, wallets = [], groups = [] }: {
  mode: "habit" | "transaction";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  wallets?: Wallet[];
  groups?: HabitGroup[];
}) {
  const isHabit = mode === "habit";
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kategori keuangan custom dari Turso (tabel finance_categories).
  // Hanya di-fetch saat mode transaksi (tidak perlu untuk habit). Fallback ke
  // 8 enum bawaan bila fetch gagal — dropdown tetap bisa dipakai.
  const [remoteCategories, setRemoteCategories] = useState<RemoteCategory[]>([]);
  const [txnType, setTxnType] = useState<"expense" | "income">("expense");
  const [advancedHabitSettingsOpen, setAdvancedHabitSettingsOpen] = useState(false);
  const [habitScheduleKind, setHabitScheduleKind] = useState("daily");

  useEffect(() => {
    if (isHabit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/finance-categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { categories?: RemoteCategory[] };
        if (!cancelled && Array.isArray(data.categories)) {
          setRemoteCategories(data.categories);
        }
      } catch {
        // fallback ke default categories (sudah jadi state awal kosong → di-merge di bawah)
      }
    })();
    return () => { cancelled = true; };
  }, [isHabit]);

  const categoryOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (remoteCategories.length === 0) {
      return DEFAULT_TRANSACTION_CATEGORIES.map((name) => ({ value: name, label: name }));
    }
    return remoteCategories
      .filter((cat) => cat.type === txnType)
      .map((cat) => ({
        value: cat.name,
        label: cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name,
      }));
  }, [remoteCategories, txnType]);

  // Default value kategori: pilih opsi pertama yang valid untuk tipe aktif.
  const defaultCategory = categoryOptions[0]?.value ?? "Makanan";

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

  /**
   * Validasi Indonesia + kirim. noValidate mematikan tooltip bahasa Inggris
   * bawaan browser ("Please fill out this field") — kita periksa sendiri dan
   * tampilkan pesan inline di bawah field yang bermasalah.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const title = form.elements.namedItem("title") as (HTMLInputElement | null);
    if (title && !title.value.trim()) {
      setFieldError({ field: "title", message: "Nama wajib diisi." });
      title.focus();
      return;
    }
    if (!isHabit) {
      const amount = form.elements.namedItem("amount") as (HTMLInputElement | null);
      const amountValue = amount ? Number(amount.value) : 0;
      if (!amount || !Number.isFinite(amountValue) || amountValue <= 0) {
        setFieldError({ field: "amount", message: "Nominal harus lebih dari Rp0." });
        amount?.focus();
        return;
      }
    } else {
      const time = form.elements.namedItem("time") as (HTMLInputElement | null);
      if (time && !time.value) {
        setFieldError({ field: "time", message: "Waktu wajib diisi." });
        time.focus();
        return;
      }
    }
    setFieldError(null);
    setSubmitting(true);
    onSubmit(event);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="modal-card entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onKeyDown={handleDialogKeyDown}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{isHabit ? "BANGUN KEBIASAAN" : "CATAT ARUS UANG"}</div>
            <h2 className="modal-title" id="entry-modal-title">{isHabit ? "Tambah kebiasaan" : "Catat transaksi"}</h2>
            <p className="modal-description">{isHabit ? "Tentukan satu hal kecil yang ingin kamu rawat." : "Simpan detail transaksi agar arus uangmu lebih mudah dipahami."}</p>
          </div>
          <IconAction label="Tutup dialog" onClick={onClose}><X size={17} /></IconAction>
        </div>
        <form className="form-grid" noValidate onSubmit={handleSubmit}>
          {isHabit ? (
            <>
              <label className="form-field">
                <span className="form-label">Nama kebiasaan</span>
                <input className="form-control" name="title" placeholder="Contoh: Membaca 10 halaman" required maxLength={60} autoFocus onChange={() => fieldError?.field === "title" && setFieldError(null)} />
                {fieldError?.field === "title" && <span className="field-error" role="alert">{fieldError.message}</span>}
              </label>
              <label className="form-field">
                <span className="form-label">Kategori</span>
                <select className="form-control" name="category" defaultValue="Health">
                  <option value="Health">Kesehatan</option>
                  <option value="Learning">Belajar</option>
                  <option value="Mindfulness">Mindfulness</option>
                  <option value="Personal">Personal</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Jadwal tampil</span>
                <select
                  className="form-control"
                  name="scheduleKind"
                  value={habitScheduleKind}
                  onChange={(event) => {
                    const next = event.target.value;
                    setHabitScheduleKind(next);
                    if (next !== "daily") setAdvancedHabitSettingsOpen(true);
                  }}
                >
                  <option value="daily">Setiap hari</option>
                  <option value="weekly">Hari tertentu setiap minggu</option>
                  <option value="monthly">Tanggal tertentu setiap bulan</option>
                </select>
                <span className="form-hint">Jadwal khusus dapat diatur pada pengaturan lanjutan.</span>
              </label>
              <button
                type="button"
                className="habit-advanced-toggle"
                aria-expanded={advancedHabitSettingsOpen}
                aria-controls="habit-advanced-fields"
                onClick={() => setAdvancedHabitSettingsOpen((open) => !open)}
              >
                <span className="habit-advanced-toggle-copy">
                  <SlidersHorizontal size={15} />
                  <span><strong>Pengaturan lanjutan</strong><small>Jenis, target, prioritas, grup, dan hari aktif</small></span>
                </span>
                <span className="habit-advanced-toggle-state">{advancedHabitSettingsOpen ? "Tutup" : "Opsional"}</span>
              </button>
              {advancedHabitSettingsOpen && (
                <div className="habit-advanced-fields" id="habit-advanced-fields">
                  <label className="form-field"><span className="form-label">Jenis habit</span><select className="form-control" name="kind" defaultValue="normal"><option value="normal">Normal · checklist</option><option value="avoid">Avoid · hindari kebiasaan</option><option value="amount">Amount · target kuantitatif</option></select></label>
                  <div className="form-two-columns"><label className="form-field"><span className="form-label">Target jumlah</span><input className="form-control" type="number" name="targetAmount" min="1" inputMode="numeric" defaultValue="8" /></label><label className="form-field"><span className="form-label">Satuan target</span><input className="form-control" name="unit" maxLength={30} placeholder="gelas, halaman, repetisi" defaultValue="unit" /></label></div>
                  <div className="form-two-columns"><label className="form-field"><span className="form-label">Prioritas</span><select className="form-control" name="priority" defaultValue="medium"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select></label><label className="form-field"><span className="form-label">Kesulitan</span><select className="form-control" name="difficulty" defaultValue="easy"><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></label></div>
                  <label className="form-field"><span className="form-label">Grup kebiasaan (opsional)</span>{groups.length > 0 ? <select className="form-control" name="groupName" defaultValue=""><option value="">Tanpa grup</option>{groups.map((group) => <option value={group.name} key={group.id}>{group.name}</option>)}</select> : <input className="form-control" name="groupName" maxLength={60} placeholder="Buat grup dari halaman Kebiasaan" />}</label>
                  <label className="form-field"><span className="form-label">Hari aktif (untuk jadwal mingguan)</span><input className="form-control" name="scheduleDays" inputMode="numeric" pattern="[0-9,\\s]*" placeholder="1, 3, 5 · Senin, Rabu, Jumat" onChange={() => fieldError?.field === "scheduleDays" && setFieldError(null)} /><span className="form-hint">Nomor hari: 0 Minggu, 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu.</span></label>
                  <label className="form-field"><span className="form-label">Tanggal aktif (untuk jadwal bulanan)</span><input className="form-control" name="scheduleDates" inputMode="numeric" pattern="[0-9,\\s]*" placeholder="1, 15, 28" /><span className="form-hint">Tanggal 1 sampai 31. Tanggal yang tidak tersedia di suatu bulan dilewati.</span></label>
                </div>
              )}
              <div className="form-two-columns">
                <label className="form-field">
                  <span className="form-label">Waktu</span>
                  <input className="form-control" type="time" name="time" defaultValue="07:00" required onChange={() => fieldError?.field === "time" && setFieldError(null)} />
                  {fieldError?.field === "time" && <span className="field-error" role="alert">{fieldError.message}</span>}
                </label>
                <label className="form-field">
                  <span className="form-label">Durasi (menit)</span>
                  <input className="form-control" type="number" name="duration" min="1" max="600" inputMode="numeric" defaultValue="15" required />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <span className="form-label">Jenis transaksi</span>
                <div className="transaction-type-control">
                  <label><input type="radio" name="type" value="expense" defaultChecked onChange={(e) => { if (e.target.checked) setTxnType("expense"); }} /><span><X size={14} /> Pengeluaran</span></label>
                  <label><input type="radio" name="type" value="income" onChange={(e) => { if (e.target.checked) setTxnType("income"); }} /><span><Check size={14} /> Pemasukan</span></label>
                </div>
              </div>
              <label className="form-field">
                <span className="form-label">Nama transaksi</span>
                <input className="form-control" name="title" placeholder="Contoh: Belanja bulanan" maxLength={60} required autoFocus onChange={() => fieldError?.field === "title" && setFieldError(null)} />
                {fieldError?.field === "title" && <span className="field-error" role="alert">{fieldError.message}</span>}
              </label>
              <label className="form-field">
                <span className="form-label">Nominal (Rupiah)</span>
                <div className="amount-field"><span>Rp</span><input className="form-control" type="number" name="amount" min="1" step="1" inputMode="numeric" placeholder="150000" required onChange={() => fieldError?.field === "amount" && setFieldError(null)} /></div>
                {fieldError?.field === "amount" && <span className="field-error" role="alert">{fieldError.message}</span>}
              </label>
              <div className="form-two-columns">
                <label className="form-field">
                  <span className="form-label">Kategori</span>
                  <select key={`${defaultCategory}-${txnType}`} className="form-control" name="category" defaultValue={defaultCategory}>
                    {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Tanggal</span>
                  <input className="form-control" type="date" name="date" defaultValue={todayISO()} required />
                </label>
              </div>
              {wallets.length > 0 && <label className="form-field"><span className="form-label">Sumber dana</span><select className="form-control" name="walletId" defaultValue=""><option value="">Tidak ditentukan</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>}
              <label className="form-field"><span className="form-label">Tag (opsional, pisahkan dengan koma)</span><input className="form-control" name="tags" maxLength={160} placeholder="kebutuhan, rutin, keluarga" /></label>
            </>
          )}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Batal</button>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? <LoaderCircle size={15} className="spin-icon" /> : <Check size={15} />} {submitting ? "Menyimpan…" : "Simpan"}</PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}
