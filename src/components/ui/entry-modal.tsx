"use client";

import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import type { TransactionCategory } from "@/lib/types";
import type { Wallet } from "@/lib/module-types";
import { todayISO } from "@/lib/format";
import { IconAction, PrimaryButton } from "@/components/ui/primitives";

const categories: TransactionCategory[] = [
  "Gaji", "Freelance", "Makanan", "Transportasi", "Tagihan", "Lifestyle", "Kesehatan", "Lainnya",
];

export function EntryModal({ mode, onClose, onSubmit, wallets = [] }: {
  mode: "habit" | "transaction";
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  wallets?: Wallet[];
}) {
  const isHabit = mode === "habit";
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

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
        <form className="form-grid" onSubmit={onSubmit}>
          {isHabit ? (
            <>
              <label className="form-field">
                <span className="form-label">Nama kebiasaan</span>
                <input className="form-control" name="title" placeholder="Contoh: Membaca 10 halaman" required maxLength={60} autoFocus />
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
              <label className="form-field"><span className="form-label">Jenis habit</span><select className="form-control" name="kind" defaultValue="normal"><option value="normal">Normal · checklist</option><option value="avoid">Avoid · hindari kebiasaan</option><option value="amount">Amount · target kuantitatif</option></select></label>
              <div className="form-two-columns"><label className="form-field"><span className="form-label">Target jumlah</span><input className="form-control" type="number" name="targetAmount" min="1" defaultValue="8" /></label><label className="form-field"><span className="form-label">Satuan target</span><input className="form-control" name="unit" maxLength={30} placeholder="gelas, halaman, repetisi" defaultValue="unit" /></label></div>
              <div className="form-two-columns"><label className="form-field"><span className="form-label">Prioritas</span><select className="form-control" name="priority" defaultValue="medium"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select></label><label className="form-field"><span className="form-label">Kesulitan</span><select className="form-control" name="difficulty" defaultValue="easy"><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></label></div>
              <label className="form-field"><span className="form-label">Grup kebiasaan (opsional)</span><input className="form-control" name="groupName" maxLength={60} placeholder="Rutinitas pagi, kesehatan, belajar" /></label>
              <label className="form-field"><span className="form-label">Jadwal tampil</span><select className="form-control" name="scheduleKind" defaultValue="daily"><option value="daily">Setiap hari</option><option value="weekly">Hari tertentu setiap minggu</option><option value="monthly">Tanggal tertentu setiap bulan</option></select></label>
              <label className="form-field"><span className="form-label">Hari aktif (untuk jadwal mingguan)</span><input className="form-control" name="scheduleDays" placeholder="1, 3, 5 · Senin, Rabu, Jumat" /><span className="form-hint">Nomor hari: 0 Minggu, 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu.</span></label>
              <label className="form-field"><span className="form-label">Tanggal aktif (untuk jadwal bulanan)</span><input className="form-control" name="scheduleDates" placeholder="1, 15, 28" /><span className="form-hint">Tanggal 1 sampai 31. Tanggal yang tidak tersedia di suatu bulan dilewati.</span></label>
              <div className="form-two-columns">
                <label className="form-field">
                  <span className="form-label">Waktu</span>
                  <input className="form-control" type="time" name="time" defaultValue="07:00" required />
                </label>
                <label className="form-field">
                  <span className="form-label">Durasi (menit)</span>
                  <input className="form-control" type="number" name="duration" min="1" max="600" defaultValue="15" required />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <span className="form-label">Jenis transaksi</span>
                <div className="transaction-type-control">
                  <label><input type="radio" name="type" value="expense" defaultChecked /><span><X size={14} /> Pengeluaran</span></label>
                  <label><input type="radio" name="type" value="income" /><span><Check size={14} /> Pemasukan</span></label>
                </div>
              </div>
              <label className="form-field">
                <span className="form-label">Nama transaksi</span>
                <input className="form-control" name="title" placeholder="Contoh: Belanja bulanan" maxLength={60} required autoFocus />
              </label>
              <label className="form-field">
                <span className="form-label">Nominal (Rupiah)</span>
                <div className="amount-field"><span>Rp</span><input className="form-control" type="number" name="amount" min="1" step="1" inputMode="numeric" placeholder="150000" required /></div>
              </label>
              <div className="form-two-columns">
                <label className="form-field">
                  <span className="form-label">Kategori</span>
                  <select className="form-control" name="category" defaultValue="Makanan">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
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
            <button type="button" className="secondary-button" onClick={onClose}>Batal</button>
            <PrimaryButton type="submit"><Check size={15} /> Simpan</PrimaryButton>
          </div>
        </form>
      </section>
    </div>
  );
}
