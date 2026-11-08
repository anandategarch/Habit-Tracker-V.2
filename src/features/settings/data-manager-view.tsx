"use client";

/**
 * DataManagerView — pusat kelola & hapus data (v0.18).
 *
 * Sebelumnya tombol hapus tersebar di setiap tab (baris kebiasaan, transaksi,
 * dompet, tujuan, tugas, dst.) sehingga memenuhi UI dan sulit ditemukan.
 * Mulai v0.18 SEMUA aksi hapus item dipindahkan ke Pengaturan — satu halaman
 * yang menyusun setiap kategori data sebagai seksi lipat (collapsed) dengan
 * jumlah item, tombol hapus per item, dan "Hapus semua" per kategori.
 * Tab lain kembali murni untuk mencatat dan melihat.
 */

import { useState, type ReactNode } from "react";
import {
  Activity, ArrowRightLeft, CalendarCheck, CalendarClock, CheckSquare, ChevronRight,
  Droplets, Dumbbell, FileText, Folder, HeartPulse, Image as ImageIcon, Inbox, ListChecks,
  ListFilter, PieChart, PiggyBank, Receipt, Repeat, Target, Trash2, Wallet as WalletGlyph,
} from "lucide-react";
import { useConfirm, useConfirmRemove } from "@/components/ui/confirm-dialog";
import { formatCompactRupiah, formatDate } from "@/lib/format";
import type { Budget, Habit, Transaction } from "@/lib/types";
import type { UpdateWorkspaceModule, WorkspaceModules } from "@/lib/module-types";

type ListUpdate<T> = (update: T[] | ((current: T[]) => T[])) => void;

export interface DataManagerProps {
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
  modules: WorkspaceModules;
  updateModule: UpdateWorkspaceModule;
  updateHabits: ListUpdate<Habit>;
  updateTransactions: ListUpdate<Transaction>;
  updateBudgets: ListUpdate<Budget>;
}

// Label jenis dompet & frekuensi — selaras dengan modules-view (v0.4.1/v0.13).
const WALLET_TYPE_LABELS: Record<string, string> = {
  cash: "Tunai", bank: "Bank", "e-wallet": "E-wallet", other: "Lainnya",
};
const RECURRING_FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan",
};
const ROUTINE_FREQUENCY_LABELS: Record<string, string> = {
  daily: "Harian", weekdays: "Hari kerja", weekly: "Setiap minggu", monthly: "Setiap bulan",
};
const PRIORITY_LABELS: Record<string, string> = { high: "Prioritas tinggi", medium: "Prioritas sedang", low: "Prioritas rendah" };
const TASK_STATUS_LABELS: Record<string, string> = { todo: "To do", doing: "Berjalan", done: "Selesai" };

function ManageSection({ id, icon: Icon, title, caption, count, open, onToggle, children }: {
  id: string; icon: typeof Target; title: string; caption: string; count: number;
  open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <section className="card manage-section" id={id} aria-label={title}>
      <button type="button" className="manage-heading" aria-expanded={open} aria-controls={`${id}-list`} onClick={onToggle}>
        <span className="manage-heading-icon" aria-hidden="true"><Icon size={17} /></span>
        <span className="manage-heading-copy"><strong>{title}</strong><small>{caption}</small></span>
        <span className="manage-count">{count}</span>
        <ChevronRight size={16} className={`manage-chevron${open ? " is-open" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="manage-body" id={`${id}-list`}>{children}</div>}
    </section>
  );
}

function ManageRow({ name, meta, onDelete, label, photo }: {
  name: string; meta?: string; onDelete: () => void; label: string; photo?: string;
}) {
  return (
    <div className="manage-row">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL JPEG hasil kompresi klien; optimasi next/image tidak berlaku untuk data URL */}
      {photo && <img className="manage-photo" src={photo} alt="" width={40} height={40} />}
      <div className="manage-row-copy">
        <strong>{name}</strong>
        {meta && <small>{meta}</small>}
      </div>
      <button type="button" className="manage-delete" aria-label={label} title={label} onClick={onDelete}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function DataManagerView({
  habits, transactions, budgets, modules, updateModule, updateHabits, updateTransactions, updateBudgets,
}: DataManagerProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const confirmRemove = useConfirmRemove();
  const { confirm } = useConfirm();
  const toggle = (id: string) => setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  /** Konfirmasi "Hapus semua" per kategori — pesan menyebut jumlah pasti. */
  const confirmClearAll = (kind: string, count: number, onClear: () => void, note?: string) => {
    confirm({
      tone: "danger",
      title: `Hapus semua ${kind}?`,
      message: `${count.toLocaleString("id-ID")} ${kind} akan dihapus sekaligus dari workspace.`,
      note: note ?? "Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, hapus semua",
      onConfirm: onClear,
    });
  };

  const finance = modules.finance;
  const walletName = (walletId: string) => finance.wallets.find((wallet) => wallet.id === walletId)?.name || "Dompet dihapus";

  // ── Definisi seksi: hanya yang punya data yang dirender ──
  const sections: Array<{
    groupId: string; id: string; icon: typeof Target; title: string; caption: string;
    count: number; rows: ReactNode; footer?: ReactNode;
  }> = [];

  if (habits.length > 0) sections.push({
    groupId: "habits", id: "manage-habits", icon: ListChecks, title: "Kebiasaan",
    caption: "Streak, progres jumlah, dan riwayat mingguan ikut terhapus",
    count: habits.length,
    rows: habits.map((habit) => (
      <ManageRow
        key={habit.id}
        name={habit.title}
        meta={`${habit.streak} hari streak · ${habit.category}`}
        label={`Hapus kebiasaan ${habit.title}`}
        onDelete={() => confirmRemove(`kebiasaan "${habit.title}"`, () => updateHabits((current) => current.filter((item) => item.id !== habit.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("kebiasaan", habits.length, () => updateHabits(() => []), "Streak, progres jumlah, dan riwayat mingguan semua kebiasaan akan hilang.")}>
        <Trash2 size={14} /> Hapus semua kebiasaan
      </button>
    ),
  });

  if (modules.habitGroups.length > 0) sections.push({
    groupId: "habits", id: "manage-groups", icon: Folder, title: "Grup kebiasaan",
    caption: "Kebiasaan di dalam grup tetap aman, hanya label grupnya yang hilang",
    count: modules.habitGroups.length,
    rows: modules.habitGroups.map((group) => (
      <ManageRow
        key={group.id}
        name={group.name}
        meta={`${habits.filter((habit) => habit.groupName === group.name).length} kebiasaan`}
        label={`Hapus grup ${group.name}`}
        onDelete={() => confirmRemove(`grup "${group.name}"`, () => {
          updateModule("habitGroups", (current) => current.filter((item) => item.id !== group.id));
          updateHabits((current) => current.map((habit) => habit.groupName === group.name ? { ...habit, groupName: "" } : habit));
        })}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("grup kebiasaan", modules.habitGroups.length, () => {
        const names = new Set(modules.habitGroups.map((group) => group.name));
        updateModule("habitGroups", () => []);
        updateHabits((current) => current.map((habit) => habit.groupName && names.has(habit.groupName) ? { ...habit, groupName: "" } : habit));
      })}>
        <Trash2 size={14} /> Hapus semua grup
      </button>
    ),
  });

  if (transactions.length > 0) sections.push({
    groupId: "finance", id: "manage-transactions", icon: Receipt, title: "Transaksi",
    caption: "Ringkasan bulanan dan insight dihitung ulang",
    count: transactions.length,
    rows: transactions.slice(0, 120).map((transaction) => (
      <ManageRow
        key={transaction.id}
        name={transaction.title}
        meta={`${transaction.category} · ${formatDate(transaction.date)} · ${transaction.type === "income" ? "+" : "−"}${formatCompactRupiah(transaction.amount)}`}
        label={`Hapus transaksi ${transaction.title}`}
        onDelete={() => confirmRemove(`transaksi "${transaction.title}"`, () => updateTransactions((current) => current.filter((item) => item.id !== transaction.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("transaksi", transactions.length, () => updateTransactions(() => []), "Ringkasan bulanan dan insight akan dihitung ulang dari nol.")}>
        <Trash2 size={14} /> Hapus semua transaksi
      </button>
    ),
  });

  if (budgets.length > 0) sections.push({
    groupId: "finance", id: "manage-budgets", icon: PieChart, title: "Budget bulanan",
    caption: "Batas pengeluaran per kategori tiap bulan",
    count: budgets.length,
    rows: budgets.map((budget) => (
      <ManageRow
        key={budget.category}
        name={budget.category}
        meta={`Batas ${formatCompactRupiah(budget.limit)} per bulan`}
        label={`Hapus budget ${budget.category}`}
        onDelete={() => confirmRemove(`budget "${budget.category}"`, () => updateBudgets((current) => current.filter((item) => item.category !== budget.category)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("budget bulanan", budgets.length, () => updateBudgets(() => []))}>
        <Trash2 size={14} /> Hapus semua budget bulanan
      </button>
    ),
  });

  if (finance.wallets.length > 0) sections.push({
    groupId: "finance", id: "manage-wallets", icon: WalletGlyph, title: "Dompet",
    caption: "Transaksi dan riwayat transfer tidak ikut terhapus",
    count: finance.wallets.length,
    rows: finance.wallets.map((wallet) => (
      <ManageRow
        key={wallet.id}
        name={wallet.name}
        meta={`${WALLET_TYPE_LABELS[wallet.type] ?? wallet.type} · saldo awal ${formatCompactRupiah(wallet.openingBalance)}`}
        label={`Hapus dompet ${wallet.name}`}
        onDelete={() => confirmRemove(`dompet "${wallet.name}"`, () => updateModule("finance", (current) => ({ ...current, wallets: current.wallets.filter((item) => item.id !== wallet.id) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("dompet", finance.wallets.length, () => updateModule("finance", (current) => ({ ...current, wallets: [] })))}>
        <Trash2 size={14} /> Hapus semua dompet
      </button>
    ),
  });

  if (finance.transfers.length > 0) sections.push({
    groupId: "finance", id: "manage-transfers", icon: ArrowRightLeft, title: "Transfer antar dompet",
    caption: "Riwayat pindahan dana antar dompet",
    count: finance.transfers.length,
    rows: finance.transfers.map((transfer) => (
      <ManageRow
        key={transfer.id}
        name={`${walletName(transfer.fromWalletId)} → ${walletName(transfer.toWalletId)}`}
        meta={`${formatDate(transfer.date)} · ${formatCompactRupiah(transfer.amount)}${transfer.note ? ` · ${transfer.note}` : ""}`}
        label="Hapus transfer ini"
        onDelete={() => confirmRemove("transfer ini", () => updateModule("finance", (current) => ({ ...current, transfers: current.transfers.filter((item) => item.id !== transfer.id) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("transfer", finance.transfers.length, () => updateModule("finance", (current) => ({ ...current, transfers: [] })))}>
        <Trash2 size={14} /> Hapus semua transfer
      </button>
    ),
  });

  if (finance.recurring.length > 0) sections.push({
    groupId: "finance", id: "manage-recurring", icon: Repeat, title: "Transaksi berulang",
    caption: "Jadwal otomatis berhenti; transaksi yang sudah tercatat tetap aman",
    count: finance.recurring.length,
    rows: finance.recurring.map((item) => (
      <ManageRow
        key={item.id}
        name={item.title}
        meta={`${item.category} · ${RECURRING_FREQUENCY_LABELS[item.frequency] ?? item.frequency} · berikutnya ${formatDate(item.nextDate)} · ${formatCompactRupiah(item.amount)}`}
        label={`Hapus transaksi berulang ${item.title}`}
        onDelete={() => confirmRemove(`transaksi berulang "${item.title}"`, () => updateModule("finance", (current) => ({ ...current, recurring: current.recurring.filter((entry) => entry.id !== item.id) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("transaksi berulang", finance.recurring.length, () => updateModule("finance", (current) => ({ ...current, recurring: [] })))}>
        <Trash2 size={14} /> Hapus semua jadwal
      </button>
    ),
  });

  if (finance.savingsGoals.length > 0) sections.push({
    groupId: "finance", id: "manage-savings", icon: PiggyBank, title: "Target tabungan",
    caption: "Progres tabungan yang sudah terkumpul ikut terhapus",
    count: finance.savingsGoals.length,
    rows: finance.savingsGoals.map((goal) => (
      <ManageRow
        key={goal.id}
        name={goal.title}
        meta={`${formatCompactRupiah(goal.savedAmount)} dari ${formatCompactRupiah(goal.targetAmount)}${goal.dueDate ? ` · tenggat ${formatDate(goal.dueDate)}` : ""}`}
        label={`Hapus target ${goal.title}`}
        onDelete={() => confirmRemove(`target tabungan "${goal.title}"`, () => updateModule("finance", (current) => ({ ...current, savingsGoals: current.savingsGoals.filter((item) => item.id !== goal.id) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("target tabungan", finance.savingsGoals.length, () => updateModule("finance", (current) => ({ ...current, savingsGoals: [] })))}>
        <Trash2 size={14} /> Hapus semua target
      </button>
    ),
  });

  if (finance.categoryRules.length > 0) sections.push({
    groupId: "finance", id: "manage-rules", icon: ListFilter, title: "Aturan kategori",
    caption: "Transaksi berikutnya tidak lagi dikategorikan otomatis",
    count: finance.categoryRules.length,
    rows: finance.categoryRules.map((rule) => (
      <ManageRow
        key={rule.id}
        name={rule.keyword}
        meta={`Setiap transaksi berisi kata ini → ${rule.category}`}
        label={`Hapus aturan ${rule.keyword}`}
        onDelete={() => confirmRemove(`aturan "${rule.keyword}"`, () => updateModule("finance", (current) => ({ ...current, categoryRules: current.categoryRules.filter((item) => item.id !== rule.id) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("aturan kategori", finance.categoryRules.length, () => updateModule("finance", (current) => ({ ...current, categoryRules: [] })))}>
        <Trash2 size={14} /> Hapus semua aturan
      </button>
    ),
  });

  if (finance.weeklyBudgets.length > 0) sections.push({
    groupId: "finance", id: "manage-weekly", icon: CalendarClock, title: "Budget mingguan",
    caption: "Batas pengeluaran 7 hari per kategori",
    count: finance.weeklyBudgets.length,
    rows: finance.weeklyBudgets.map((budget) => (
      <ManageRow
        key={budget.category}
        name={budget.category}
        meta={`Batas ${formatCompactRupiah(budget.limit)} per 7 hari`}
        label={`Hapus budget mingguan ${budget.category}`}
        onDelete={() => confirmRemove(`budget mingguan "${budget.category}"`, () => updateModule("finance", (current) => ({ ...current, weeklyBudgets: current.weeklyBudgets.filter((item) => item.category !== budget.category) })))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("budget mingguan", finance.weeklyBudgets.length, () => updateModule("finance", (current) => ({ ...current, weeklyBudgets: [] })))}>
        <Trash2 size={14} /> Hapus semua budget mingguan
      </button>
    ),
  });

  if (modules.goals.length > 0) sections.push({
    groupId: "work", id: "manage-goals", icon: Target, title: "Tujuan",
    caption: "Milestone dan progres tujuan ikut terhapus",
    count: modules.goals.length,
    rows: modules.goals.map((goal) => (
      <ManageRow
        key={goal.id}
        name={goal.title}
        meta={`${goal.category} · ${goal.milestones.filter((step) => step.completed).length}/${goal.milestones.length} milestone${goal.completed ? " · selesai" : ""}`}
        label={`Hapus tujuan ${goal.title}`}
        onDelete={() => confirmRemove(`tujuan "${goal.title}"`, () => updateModule("goals", (items) => items.filter((item) => item.id !== goal.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("tujuan", modules.goals.length, () => updateModule("goals", () => []), "Semua milestone dan progres akan hilang.")}>
        <Trash2 size={14} /> Hapus semua tujuan
      </button>
    ),
  });

  if (modules.tasks.length > 0) sections.push({
    groupId: "work", id: "manage-tasks", icon: CheckSquare, title: "Tugas",
    caption: "Tugas di task board ruang kerja",
    count: modules.tasks.length,
    rows: modules.tasks.map((task) => (
      <ManageRow
        key={task.id}
        name={task.title}
        meta={`${PRIORITY_LABELS[task.priority] ?? task.priority} · ${TASK_STATUS_LABELS[task.status] ?? task.status}${task.dueDate ? ` · tenggat ${formatDate(task.dueDate)}` : ""}`}
        label={`Hapus tugas ${task.title}`}
        onDelete={() => confirmRemove(`tugas "${task.title}"`, () => updateModule("tasks", (items) => items.filter((item) => item.id !== task.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("tugas", modules.tasks.length, () => updateModule("tasks", () => []))}>
        <Trash2 size={14} /> Hapus semua tugas
      </button>
    ),
  });

  if (modules.notes.length > 0) sections.push({
    groupId: "work", id: "manage-notes", icon: FileText, title: "Catatan",
    caption: "Catatan kerja beserta seluruh isinya",
    count: modules.notes.length,
    rows: modules.notes.map((note) => (
      <ManageRow
        key={note.id}
        name={note.title}
        meta={`Diperbarui ${new Date(note.updatedAt).toLocaleDateString("id-ID")}${note.tags.length ? ` · ${note.tags.join(", ")}` : ""}`}
        label={`Hapus catatan ${note.title}`}
        onDelete={() => confirmRemove(`catatan "${note.title}"`, () => updateModule("notes", (items) => items.filter((item) => item.id !== note.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("catatan", modules.notes.length, () => updateModule("notes", () => []))}>
        <Trash2 size={14} /> Hapus semua catatan
      </button>
    ),
  });

  if (modules.routines.length > 0) sections.push({
    groupId: "work", id: "manage-routines", icon: CalendarCheck, title: "Rutinitas kerja",
    caption: "Pekerjaan berulang yang ingin dijaga",
    count: modules.routines.length,
    rows: modules.routines.map((item) => (
      <ManageRow
        key={item.id}
        name={item.title}
        meta={ROUTINE_FREQUENCY_LABELS[item.frequency] ?? item.frequency}
        label={`Hapus rutinitas ${item.title}`}
        onDelete={() => confirmRemove(`rutinitas "${item.title}"`, () => updateModule("routines", (items) => items.filter((entry) => entry.id !== item.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("rutinitas kerja", modules.routines.length, () => updateModule("routines", () => []))}>
        <Trash2 size={14} /> Hapus semua rutinitas
      </button>
    ),
  });

  if (modules.programs.length > 0) sections.push({
    groupId: "health", id: "manage-programs", icon: Dumbbell, title: "Program latihan",
    caption: "Split latihan mingguan tersimpan",
    count: modules.programs.length,
    rows: modules.programs.map((program) => (
      <ManageRow
        key={program.id}
        name={program.title}
        meta={`${program.days}${program.active ? " · aktif" : ""}`}
        label={`Hapus program ${program.title}`}
        onDelete={() => confirmRemove(`program "${program.title}"`, () => updateModule("programs", (items) => items.filter((item) => item.id !== program.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("program latihan", modules.programs.length, () => updateModule("programs", () => []))}>
        <Trash2 size={14} /> Hapus semua program
      </button>
    ),
  });

  if (modules.workouts.length > 0) sections.push({
    groupId: "health", id: "manage-workouts", icon: Activity, title: "Sesi latihan",
    caption: "Riwayat setiap sesi yang pernah dicatat",
    count: modules.workouts.length,
    rows: modules.workouts.map((session) => (
      <ManageRow
        key={session.id}
        name={session.title}
        meta={`${formatDate(session.date)} · ${session.durationMinutes} menit · ${session.exercises.length} gerakan`}
        label={`Hapus sesi latihan ${session.title}`}
        onDelete={() => confirmRemove(`sesi latihan "${session.title}"`, () => updateModule("workouts", (items) => items.filter((item) => item.id !== session.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("sesi latihan", modules.workouts.length, () => updateModule("workouts", () => []))}>
        <Trash2 size={14} /> Hapus semua sesi
      </button>
    ),
  });

  if (modules.progressPhotos.length > 0) sections.push({
    groupId: "health", id: "manage-photos", icon: ImageIcon, title: "Foto progres",
    caption: "Foto yang dikompresi dan disimpan di perangkat",
    count: modules.progressPhotos.length,
    rows: modules.progressPhotos.map((photo) => (
      <ManageRow
        key={photo.id}
        name={formatDate(photo.date)}
        meta="Foto progres latihan"
        photo={photo.imageData}
        label={`Hapus foto progres ${formatDate(photo.date)}`}
        onDelete={() => confirmRemove("foto progres ini", () => updateModule("progressPhotos", (items) => items.filter((item) => item.id !== photo.id)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("foto progres", modules.progressPhotos.length, () => updateModule("progressPhotos", () => []))}>
        <Trash2 size={14} /> Hapus semua foto
      </button>
    ),
  });

  if (modules.checkins.length > 0) sections.push({
    groupId: "health", id: "manage-checkins", icon: HeartPulse, title: "Check-in harian",
    caption: "Catatan mood, energi, tidur, dan jurnal",
    count: modules.checkins.length,
    rows: modules.checkins.map((item) => (
      <ManageRow
        key={item.date}
        name={formatDate(item.date)}
        meta={`Mood ${item.mood}/5 · energi ${item.energy}/5 · tidur ${item.sleepHours} jam`}
        label={`Hapus check-in ${formatDate(item.date)}`}
        onDelete={() => confirmRemove(`check-in "${formatDate(item.date)}"`, () => updateModule("checkins", (items) => items.filter((entry) => entry.date !== item.date)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("check-in", modules.checkins.length, () => updateModule("checkins", () => []), "Riwayat mood, energi, tidur, dan jurnal akan hilang dari insight.")}>
        <Trash2 size={14} /> Hapus semua check-in
      </button>
    ),
  });

  if (modules.wellness.length > 0) sections.push({
    groupId: "health", id: "manage-wellness", icon: Droplets, title: "Catatan wellness",
    caption: "Data hidrasi, protein, berat badan, dan catatan harian",
    count: modules.wellness.length,
    rows: modules.wellness.map((item) => (
      <ManageRow
        key={item.date}
        name={formatDate(item.date)}
        meta={`${item.waterMl.toLocaleString("id-ID")} ml air · ${item.proteinGrams} g protein${item.weightKg ? ` · ${item.weightKg} kg` : ""}`}
        label={`Hapus catatan wellness ${formatDate(item.date)}`}
        onDelete={() => confirmRemove(`catatan wellness "${formatDate(item.date)}"`, () => updateModule("wellness", (items) => items.filter((entry) => entry.date !== item.date)))}
      />
    )),
    footer: (
      <button type="button" className="manage-clear-all" onClick={() => confirmClearAll("catatan wellness", modules.wellness.length, () => updateModule("wellness", () => []))}>
        <Trash2 size={14} /> Hapus semua catatan
      </button>
    ),
  });

  const groupLabels: Record<string, string> = {
    habits: "Kebiasaan & grup",
    finance: "Keuangan",
    work: "Tujuan & ruang kerja",
    health: "Kesehatan & latihan",
  };
  const totalItems = sections.reduce((sum, section) => sum + section.count, 0);
  const visibleGroups = ["habits", "finance", "work", "health"].filter((groupId) => sections.some((section) => section.groupId === groupId));

  return (
    <div className="data-manager" id="settings-data">
      <div className="settings-section-heading" id="settings-data-heading">
        <span>KELOLA &amp; HAPUS DATA</span>
        <strong>Semua kategori, satu tempat</strong>
      </div>
      <p className="manage-lead">
        Setiap tombol hapus kini hidup di sini — bukan lagi di tab kebiasaan, keuangan, atau ruang kerja.
        Buka kategori untuk melihat isinya, hapus satu per satu, atau bersihkan sekaligus.
      </p>

      {sections.length === 0 ? (
        <div className="card card-pad manage-empty">
          <span className="manage-empty-icon"><Inbox size={22} /></span>
          <strong>Belum ada data untuk dikelola</strong>
          <p>Belum ada data tersimpan. Tambahkan kebiasaan atau transaksi terlebih dahulu.</p>
        </div>
      ) : (
        <>
          <p className="manage-summary" role="status">
            {sections.length} kategori berisi data · {totalItems.toLocaleString("id-ID")} item bisa dikelola
            {transactions.length > 120 ? " · 120 transaksi terbaru ditampilkan" : ""}
          </p>
          {visibleGroups.map((groupId) => (
            <div className="manage-group" key={groupId}>
              <span className="manage-group-label">{groupLabels[groupId]}</span>
              <div className="manage-group-sections">
                {sections.filter((section) => section.groupId === groupId).map((section) => (
                  <ManageSection
                    key={section.id}
                    id={section.id}
                    icon={section.icon}
                    title={section.title}
                    caption={section.caption}
                    count={section.count}
                    open={Boolean(openSections[section.id])}
                    onToggle={() => toggle(section.id)}
                  >
                    <div className="manage-list">
                      {section.rows}
                    </div>
                    {section.footer}
                  </ManageSection>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
