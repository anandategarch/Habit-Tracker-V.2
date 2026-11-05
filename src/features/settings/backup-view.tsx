"use client";

import { useState, type ChangeEvent } from "react";
import { Archive, Bell, ChevronRight, Database, Download, FileUp, Info, LoaderCircle, Settings2, ShieldCheck, Sprout, Trash2 } from "lucide-react";
import { PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { BotanicalIllustrationBackdrop } from "@/components/ui/botanical-illustration";
import type { WorkspaceSettings } from "@/lib/module-types";
import { APP_VERSION_LABEL } from "@/lib/version";

function dateStamp(): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function BackupView({ settings, onUpdateSettings }: {
  settings: WorkspaceSettings;
  onUpdateSettings: (update: (current: WorkspaceSettings) => WorkspaceSettings) => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const { confirm } = useConfirm();

  async function exportBackup() {
    setExporting(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Backup tidak dapat dibuat.");
      }
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rutina-v2-backup-${dateStamp()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Backup berhasil dibuat dan diunduh.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Gagal membuat backup.");
    } finally {
      setExporting(false);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(false);
    setMessage("");
    if (file.size > 20 * 1024 * 1024) {
      setError(true);
      setMessage("Ukuran file melebihi batas 20 MB.");
      event.target.value = "";
      return;
    }
    // Reset input segera agar file yang sama bisa dipilih ulang setelah batal;
    // referensi File tetap dipakai bila pengguna mengonfirmasi.
    event.target.value = "";
    confirm({
      tone: "leaf",
      title: "Gabungkan backup?",
      subject: file.name,
      message: "Data backup akan digabung dengan data yang ada sekarang. Data lama tidak dihapus.",
      note: "Record dengan ID atau tanggal yang sama dapat diperbarui dari backup.",
      confirmLabel: "Gabungkan",
      onConfirm: () => { void performImport(file); },
    });
  }

  async function performImport(file: File) {
    setImporting(true);
    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Pemulihan backup gagal.");
      const restored = payload.restored && typeof payload.restored === "object"
        ? Object.values(payload.restored as Record<string, unknown>).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
        : 0;
      setMessage(`Backup berhasil digabung. ${restored.toLocaleString("id-ID")} record diproses. Memuat ulang workspace…`);
      window.location.reload();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "File backup tidak dapat diproses.");
    } finally {
      setImporting(false);
    }
  }

  return <>
    <PageIntro eyebrow="PREFERENSI & DATA" title="Ruang nyaman untuk bertumbuh." subtitle="Atur suasana Rutina dan jaga catatan kebiasaanmu tetap aman." />
    <section className="settings-profile-card">
      <BotanicalIllustrationBackdrop variant="settings" />
      <span className="settings-profile-mark">
        {/* eslint-disable-next-line @next/next/no-img-element -- ilustrasi avatar statis untuk ukuran profil kecil */}
        <img src="/illustrations/avatar.png" alt="Ilustrasi profil Rutina" width={52} height={52} />
      </span>
      <div className="settings-profile-copy"><small>YOUR PERSONAL SPACE</small><strong>Ruang pribadimu</strong><span>Rutina · Grow at your pace</span></div>
      <span className="settings-profile-status" aria-label={`Versi ${APP_VERSION_LABEL}`}><ShieldCheck size={14} /> {APP_VERSION_LABEL}</span>
    </section>

    <nav className="settings-menu-card" aria-label="Navigasi pengaturan">
      <a href="#settings-preferences"><span className="settings-menu-icon"><Settings2 size={17} /></span><span><strong>Preferensi aplikasi</strong><small>Mode libur dan ritme pribadi</small></span><ChevronRight size={17} /></a>
      <a href="#settings-notifications"><span className="settings-menu-icon"><Bell size={17} /></span><span><strong>Notifikasi</strong><small>Pengingat habit yang belum selesai</small></span><ChevronRight size={17} /></a>
      <a href="#settings-backup"><span className="settings-menu-icon"><Database size={17} /></span><span><strong>Data &amp; Backup</strong><small>Ekspor dan pulihkan workspace</small></span><ChevronRight size={17} /></a>
      {/* v0.18: seluruh tombol hapus terpusat di sini — kategori manapun yang
          ingin dihapus pengguna tinggal buka Pengaturan lalu bagian ini. */}
      <a href="#settings-data"><span className="settings-menu-icon"><Trash2 size={17} /></span><span><strong>Kelola &amp; hapus data</strong><small>Kebiasaan, transaksi, dompet, dan lainnya</small></span><ChevronRight size={17} /></a>
      <a href="#settings-about"><span className="settings-menu-icon"><Info size={17} /></span><span><strong>Tentang Rutina</strong><small>Identitas dan filosofi aplikasi</small></span><ChevronRight size={17} /></a>
    </nav>

    <div className="settings-preferences-grid">
      <section className="card card-pad settings-preference-card" id="settings-preferences">
        <SectionHeading title="Ritme pribadi" caption="Beri ruang untuk beristirahat saat diperlukan." />
        <label className="settings-vacation-toggle">
          <span className="settings-vacation-icon"><Sprout size={18} /></span>
          <span><strong>Mode libur</strong><small>Jeda pencatatan habit tanpa menghapus data.</small></span>
          <input type="checkbox" checked={settings.vacationMode} onChange={(event) => onUpdateSettings((current) => ({ ...current, vacationMode: event.target.checked }))} />
        </label>
        <div className="settings-about-note"><span>“</span><p>Hal besar tumbuh dari langkah kecil. Kembali kapan pun kamu siap.</p></div>
      </section>
    </div>
    <section className="card card-pad settings-info-card" id="settings-notifications">
      <div className="settings-info-icon"><Bell size={18} /></div>
      <div><SectionHeading title="Notifikasi kebiasaan" caption="Jumlah habit yang belum selesai ditampilkan pada badge ikon bel di header. Buka ikon tersebut untuk melihat daftar kebiasaan hari ini." /></div>
    </section>

    <section className="card card-pad settings-info-card" id="settings-about">
      <div className="settings-info-icon"><Sprout size={18} /></div>
      <div><SectionHeading title="Tentang Rutina" caption="Ruang pribadi untuk membangun kebiasaan baik, menjaga keseimbangan, dan bertumbuh lewat langkah kecil setiap hari." /><span className="settings-about-tagline">Grow at your pace · Small steps, meaningful growth.</span></div>
    </section>

    <div className="settings-section-heading" id="settings-backup"><span>DATA & PEMULIHAN</span><strong>Backup workspace</strong></div>
    <div className="module-two-col">
      <section className="card card-pad backup-card">
        <div className="backup-icon"><Archive size={22} /></div>
        <SectionHeading title="Ekspor backup" caption="Unduh seluruh data workspace dalam file JSON." />
        <ul className="backup-includes">
          <li>Habit, jadwal, prioritas, grup, streak, dan transaksi</li>
          <li>Goals, milestone, check-in, jurnal, tugas, dan rutinitas</li>
          <li>Wellness, workout, program, serta foto progres</li>
          <li>Dompet, transfer, recurring, tabungan, aturan kategori, dan budget</li>
        </ul>
        <PrimaryButton onClick={exportBackup} disabled={exporting}>
          {exporting ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
          {exporting ? "Membuat backup…" : "Unduh backup JSON"}
        </PrimaryButton>
      </section>

      <section className="card card-pad backup-card">
        <div className="backup-icon"><FileUp size={22} /></div>
        <SectionHeading title="Impor backup" caption="Gabungkan file backup V2 tanpa menghapus record lain yang sudah ada." />
        <label className="backup-upload">
          {importing ? <LoaderCircle size={17} className="spin" /> : <FileUp size={17} />}
          <span>{importing ? "Memulihkan data…" : "Pilih file backup JSON"}</span>
          <input type="file" accept="application/json,.json" disabled={importing} onChange={importBackup} />
        </label>
        <div className="backup-safety-note">
          <ShieldCheck size={16} />
          <p>Impor menggunakan mode gabung. Record dengan ID, tanggal, atau kategori yang sama diperbarui; record lainnya tetap dipertahankan. Buat backup sebelum mengimpor file besar.</p>
        </div>
      </section>
    </div>
    {message && <p className={`backup-message ${error ? "is-error" : "is-success"}`} role="status">{message}</p>}
  </>;
}
