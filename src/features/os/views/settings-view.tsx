"use client";

import { useMemo, useRef, useState } from "react";
import type { OsData } from "@/features/os/view-props";
import { todayISO } from "@/lib/format";
import { ConfirmDialog, SectionHead } from "@/features/os/widgets";
import {
  AlertIcon, CloudIcon, CloudOffIcon, DownloadIcon, InfoIcon, RefreshIcon, TrashIcon, UploadIcon,
} from "@/features/os/os-icons";
import type { Budget, Habit, Transaction } from "@/lib/types";
import { toast } from "sonner";

export function SettingsView({ data, actions }: { data: OsData; actions: { updateHabits: (u: (c: Habit[]) => Habit[]) => void; updateTransactions: (u: (c: Transaction[]) => Transaction[]) => void; updateBudgets: (u: (c: Budget[]) => Budget[]) => void } }) {
  const { habits, transactions, budgets, journal, syncStatus, refresh } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const checkinDays = useMemo(() => new Set(Object.values(journal).flat()).size, [journal]);

  const syncMeta = {
    local: { label: "Mode lokal", desc: "Data tersimpan di perangkat ini. Sinkronisasi cloud aktif saat database terhubung.", Icon: CloudOffIcon, tone: "text-dim" },
    syncing: { label: "Menyinkronkan", desc: "Sedang mengirim perubahan terbaru…", Icon: RefreshIcon, tone: "text-accent" },
    synced: { label: "Tersinkron", desc: "Semua perubahan tersimpan di database cloud.", Icon: CloudIcon, tone: "text-accent" },
    error: { label: "Sinkronisasi tertunda", desc: "Perubahan tersimpan lokal dan akan dikirim ulang otomatis.", Icon: AlertIcon, tone: "text-amber" },
  }[syncStatus];

  function exportJson() {
    const payload = {
      app: "rutina-os",
      version: 1,
      exportedAt: new Date().toISOString(),
      habits,
      transactions,
      budgets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rutina-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup diunduh");
  }

  function importJson(file: File) {
    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as { habits?: unknown; transactions?: unknown; budgets?: unknown };
        if (!Array.isArray(parsed.habits) || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets)) {
          throw new Error("bad shape");
        }
        actions.updateHabits(() => parsed.habits as Habit[]);
        actions.updateTransactions(() => parsed.transactions as Transaction[]);
        actions.updateBudgets(() => parsed.budgets as Budget[]);
        toast.success(`Import selesai — ${(parsed.habits as Habit[]).length} kebiasaan, ${(parsed.transactions as Transaction[]).length} transaksi`);
      } catch {
        toast.error("File tidak valid. Gunakan hasil export Rutina.");
      }
    });
  }

  function resetAll() {
    try {
      window.localStorage.removeItem("rutina.v3.workspace");
      window.localStorage.removeItem("rutina.os.history.v1");
    } catch {
      /* ignore */
    }
    actions.updateHabits(() => []);
    actions.updateTransactions(() => []);
    actions.updateBudgets(() => []);
    toast.success("Semua data dihapus");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* data summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Kebiasaan", value: habits.length },
          { label: "Transaksi", value: transactions.length },
          { label: "Anggaran", value: budgets.length },
          { label: "Hari tercatat", value: checkinDays },
        ].map((s) => (
          <div key={s.label} className="os-card flex flex-col gap-1 p-4">
            <span className="os-micro">{s.label}</span>
            <span className="num text-[22px] font-semibold text-ink">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* sync */}
        <section className="os-card p-5" aria-label="Status sinkronisasi">
          <SectionHead title="Sinkronisasi" />
          <div className="flex items-start gap-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel2 ${syncMeta.tone}`}>
              <syncMeta.Icon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{syncMeta.label}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{syncMeta.desc}</p>
              <button type="button" className="os-btn mt-3 !h-9" onClick={() => { refresh(); toast("Memeriksa sinkronisasi…"); }}>
                <RefreshIcon size={14} />
                Periksa ulang
              </button>
            </div>
          </div>
        </section>

        {/* backup */}
        <section className="os-card p-5" aria-label="Backup data">
          <SectionHead title="Backup data" />
          <p className="text-[12.5px] leading-relaxed text-dim">
            Unduh seluruh data sebagai file JSON, atau pulihkan dari backup sebelumnya. Import akan menggantikan data saat ini.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button type="button" className="os-btn" onClick={exportJson}>
              <DownloadIcon size={15} />
              Export JSON
            </button>
            <button type="button" className="os-btn" onClick={() => fileRef.current?.click()}>
              <UploadIcon size={15} />
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Pilih file backup JSON"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJson(file);
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* danger */}
        <section className="os-card border-[#3a2424] p-5" aria-label="Zona bahaya">
          <SectionHead title="Zona bahaya" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-ink">Hapus semua data</p>
              <p className="mt-0.5 text-[12px] text-dim">Menghapus kebiasaan, transaksi, anggaran, dan riwayat check-in dari perangkat ini.</p>
            </div>
            <button type="button" className="os-btn os-btn-danger" onClick={() => setConfirmReset(true)}>
              <TrashIcon size={15} />
              Hapus
            </button>
          </div>
        </section>

        {/* about */}
        <section className="os-card p-5" aria-label="Tentang aplikasi">
          <SectionHead title="Tentang" />
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel2 text-accent">
              <InfoIcon size={20} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">Rutina OS</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                Konsol operasional pribadi untuk kebiasaan dan keuangan. Semua perhitungan dilakukan di perangkat; data bisa disinkronkan ke database cloud.
              </p>
              <p className="num mt-2 text-[11px] text-faint">v1.0 · design: dark precision</p>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Hapus semua data?"
        description="Tindakan ini tidak bisa dibatalkan. Pastikan sudah export backup bila data masih dibutuhkan."
        confirmLabel="Ya, hapus semua"
        onConfirm={resetAll}
      />
    </div>
  );
}
