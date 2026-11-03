"use client";

import { useState, type ChangeEvent } from "react";
import { Archive, Download, FileUp, LoaderCircle, ShieldCheck, Sprout, Wand2, AlertTriangle } from "lucide-react";
import { PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";
import type { WorkspaceSettings } from "@/lib/module-types";

interface LegacyReport {
  sourceFormat: string;
  sourceKeys: string[];
  habits: { total: number; migrated: number; skippedArchived: number };
  habitCheckins: { total: number; inserted: number };
  dailyLogs: { total: number; toCheckins: number; toWellness: number };
  transactions: { total: number; migrated: number; skippedTransfer: number; skippedInvalid: number };
  fundSources: { total: number; migrated: number };
  weeklyBudgets: { total: number; migrated: number };
  habitGroups: { total: number; migrated: number };
  workRoutines: { total: number; migrated: number };
  workTasks: { total: number; migrated: number };
  workNotes: { total: number; migrated: number };
  goals: { total: number; migrated: number };
  savingsGoals: { total: number; migrated: number };
  recurring: { total: number; migrated: number };
  categoryRules: { total: number; migrated: number };
  settings: { migrated: boolean; userName?: string; theme?: string };
  unmappedCategories: string[];
  notes: string[];
}

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
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [migrationReport, setMigrationReport] = useState<LegacyReport | null>(null);

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
    setMigrationReport(null);
    if (file.size > 20 * 1024 * 1024) {
      setError(true);
      setMessage("Ukuran file melebihi batas 20 MB.");
      event.target.value = "";
      return;
    }
    if (!window.confirm("Backup akan digabung dengan data V2 saat ini. File backup V1 (lama) akan otomatis dimigrasi ke skema V2. Data yang sudah ada tidak dihapus. Record dengan ID/tanggal yang sama dapat diperbarui dari backup. Lanjutkan?")) {
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
      // Jika endpoint auto-route file V1 ke migrasi, tampilkan report migrasi.
      if (payload.mode === "legacy-migration" && payload.report) {
        setMigrationReport(payload.report as LegacyReport);
        setMessage("File backup V1 (lama) terdeteksi & berhasil dimigrasi ke V2. Memuat ulang workspace…");
      } else {
        const restored = payload.restored && typeof payload.restored === "object"
          ? Object.values(payload.restored as Record<string, unknown>).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0)
          : 0;
        setMessage(`Backup berhasil digabung. ${restored.toLocaleString("id-ID")} record diproses. Memuat ulang workspace…`);
      }
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "File backup tidak dapat diproses.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function migrateLegacyBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(false);
    setMessage("");
    setMigrationReport(null);
    if (file.size > 20 * 1024 * 1024) {
      setError(true);
      setMessage("Ukuran file melebihi batas 20 MB.");
      event.target.value = "";
      return;
    }
    if (!window.confirm("Backup V1 (lama) akan ditransformasi & digabung dengan data V2. Field yang tidak ada di V2 diisi default. Lanjutkan migrasi?")) {
      event.target.value = "";
      return;
    }

    setMigrating(true);
    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      const response = await fetch("/api/migrate-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Migrasi gagal.");
      setMigrationReport(payload.report as LegacyReport);
      setMessage("Migrasi dari backup V1 berhasil. Memuat ulang workspace…");
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "File backup lama tidak dapat diproses.");
    } finally {
      setMigrating(false);
      event.target.value = "";
    }
  }

  return <>
    <PageIntro eyebrow="PREFERENSI & DATA" title="Ruang nyaman untuk bertumbuh." subtitle="Atur suasana Rutina dan jaga catatan kebiasaanmu tetap aman." />
    <section className="settings-profile-card">
      <span className="settings-profile-mark"><span>R</span></span>
      <div className="settings-profile-copy"><small>YOUR PERSONAL SPACE</small><strong>Ruang pribadimu</strong><span>Rutina · Grow at your pace</span></div>
      <span className="settings-profile-status"><ShieldCheck size={14} /> Data terlindungi</span>
    </section>
    <div className="settings-preferences-grid">
      <section className="card card-pad settings-preference-card">
        <SectionHeading title="Preferensi tampilan" caption="Pilih suasana yang paling nyaman untukmu." />
        <div className="settings-theme-options" role="group" aria-label="Tema aplikasi">
          <button type="button" className={settings.theme === "system" ? "active" : ""} aria-pressed={settings.theme === "system"} onClick={() => onUpdateSettings((current) => ({ ...current, theme: "system" }))}><span>◐</span><strong>Sistem</strong><small>Ikuti perangkat</small></button>
          <button type="button" className={settings.theme === "light" ? "active" : ""} aria-pressed={settings.theme === "light"} onClick={() => onUpdateSettings((current) => ({ ...current, theme: "light" }))}><span>☀</span><strong>Terang</strong><small>Nuansa hangat</small></button>
          <button type="button" className={settings.theme === "dark" ? "active" : ""} aria-pressed={settings.theme === "dark"} onClick={() => onUpdateSettings((current) => ({ ...current, theme: "dark" }))}><span>☾</span><strong>Gelap</strong><small>Lebih redup</small></button>
        </div>
      </section>
      <section className="card card-pad settings-preference-card">
        <SectionHeading title="Ritme pribadi" caption="Beri ruang untuk beristirahat saat diperlukan." />
        <label className="settings-vacation-toggle">
          <span className="settings-vacation-icon"><Sprout size={18} /></span>
          <span><strong>Mode libur</strong><small>Jeda pencatatan habit tanpa menghapus data.</small></span>
          <input type="checkbox" checked={settings.vacationMode} onChange={(event) => onUpdateSettings((current) => ({ ...current, vacationMode: event.target.checked }))} />
        </label>
        <div className="settings-about-note"><span>“</span><p>Hal besar tumbuh dari langkah kecil. Kembali kapan pun kamu siap.</p></div>
      </section>
    </div>
    <div className="settings-section-heading"><span>DATA & PEMULIHAN</span><strong>Backup workspace</strong></div>
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
        <SectionHeading title="Impor backup" caption="Gabungkan file backup V2, atau upload file backup V1 (lama) — otomatis terdeteksi & dimigrasi ke skema V2." />
        <label className="backup-upload">
          <FileUp size={17} />
          <span>{importing ? "Memulihkan data…" : "Pilih file backup JSON"}</span>
          <input type="file" accept="application/json,.json" disabled={importing} onChange={importBackup} />
        </label>
        <div className="backup-safety-note">
          <ShieldCheck size={16} />
          <p>Impor menggunakan mode gabung. File backup V1 (format lama) otomatis ditransformasi ke V2. Record dengan ID, tanggal, atau kategori yang sama diperbarui; record lainnya tetap dipertahankan.</p>
        </div>
      </section>
    </div>

    <div className="settings-section-heading"><span>MIGRASI V1 → V2</span><strong>Migrasi dari aplikasi lama</strong></div>
    <section className="card card-pad backup-card">
      <div className="backup-icon"><Wand2 size={22} /></div>
      <SectionHeading
        title="Migrasi backup V1 (Rutina lama)"
        caption="Transformasi file backup dari aplikasi Rutina versi lama ke skema V2. Field yang tidak ada di V2 diisi default; kategori transaksi dipetakan ke enum V2."
      />
      <ul className="backup-includes">
        <li>Habit (name→title, emoji→icon, priority/difficulty lowercase, streak dihitung ulang dari habitLogs)</li>
        <li>habitLogs → riwayat check-in (streak historis dipulihkan)</li>
        <li>Transactions (description→title, date→ISO date, kategori dipetakan, transfer dilewati)</li>
        <li>fundSources → finance.wallets, weeklyBudgets → finance.weeklyBudgets</li>
        <li>dailyLogs → checkins + wellness, workRoutines/Tasks/Notes → modul kerja</li>
        <li>habitGroups, appSettings (userName tidak dipertahankan — tidak ada field di V2)</li>
      </ul>
      <label className="backup-upload">
        <Wand2 size={17} />
        <span>{migrating ? "Memigrasi data…" : "Pilih file backup V1 JSON"}</span>
        <input type="file" accept="application/json,.json" disabled={migrating} onChange={migrateLegacyBackup} />
      </label>
      <div className="backup-safety-note">
        <AlertTriangle size={16} />
        <p>Backup V1 punya struktur berbeda dari V2. Banyak field tidak punya padanan langsung dan akan diisi default. Lihat laporan setelah migrasi untuk detail apa yang dikonversi & dilewati.</p>
      </div>
      {migrationReport && (
        <div className="backup-migration-report" role="status">
          <strong>Hasil migrasi:</strong>
          <ul>
            <li>Habit: {migrationReport.habits.migrated}/{migrationReport.habits.total} dimigrasi{migrationReport.habits.skippedArchived ? ` (${migrationReport.habits.skippedArchived} diarsipkan dilewati)` : ""}</li>
            <li>Check-in historis: {migrationReport.habitCheckins.inserted} record</li>
            <li>Transaksi: {migrationReport.transactions.migrated}/{migrationReport.transactions.total} dimigrasi{migrationReport.transactions.skippedTransfer ? `, ${migrationReport.transactions.skippedTransfer} transfer dilewati` : ""}{migrationReport.transactions.skippedInvalid ? `, ${migrationReport.transactions.skippedInvalid} invalid dilewati` : ""}</li>
            <li>Dompet (fundSources): {migrationReport.fundSources.migrated}/{migrationReport.fundSources.total}</li>
            <li>Weekly budgets: {migrationReport.weeklyBudgets.migrated}/{migrationReport.weeklyBudgets.total}</li>
            <li>Daily logs → checkins: {migrationReport.dailyLogs.toCheckins}, wellness: {migrationReport.dailyLogs.toWellness}</li>
            <li>Rutinitas kerja: {migrationReport.workRoutines.migrated}/{migrationReport.workRoutines.total}</li>
            <li>Tugas kerja: {migrationReport.workTasks.migrated}/{migrationReport.workTasks.total}</li>
            <li>Catatan kerja: {migrationReport.workNotes.migrated}/{migrationReport.workNotes.total}</li>
            <li>Habit groups: {migrationReport.habitGroups.migrated}/{migrationReport.habitGroups.total}</li>
            {migrationReport.unmappedCategories.length > 0 && (
              <li>Kategori tidak terpetakan (→ Lainnya): {migrationReport.unmappedCategories.join(", ")}</li>
            )}
            {migrationReport.notes.map((note, i) => <li key={i}>⚠ {note}</li>)}
          </ul>
        </div>
      )}
    </section>
    {message && <p className={`backup-message ${error ? "is-error" : "is-success"}`} role="status">{message}</p>}
  </>;
}
