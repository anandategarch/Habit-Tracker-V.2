"use client";

import { useState, type ChangeEvent } from "react";
import { Archive, Download, FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";

function dateStamp(): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function BackupView() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

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
    if (!window.confirm("Backup akan digabung dengan data V2 saat ini. Data yang sudah ada tidak dihapus. Record dengan ID/tanggal yang sama dapat diperbarui dari backup. Lanjutkan?")) {
      event.target.value = "";
      return;
    }

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
      event.target.value = "";
    }
  }

  return <>
    <PageIntro eyebrow="PREFERENSI & DATA" title="Lindungi data yang sudah kamu bangun." subtitle="Buat file backup atau gabungkan backup V2 dari perangkat lain ke workspace ini." />
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
          <FileUp size={17} />
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
