"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { BackupView } from "@/features/settings/backup-view";
import { Activity, ArrowRight, ArrowRightLeft, Banknote, CalendarClock, Check, CircleDollarSign, Drumstick, Droplets, Flag, Gauge, ImagePlus, Landmark, ListFilter, Milestone as MilestoneIcon, PiggyBank, Plus, Repeat, Scale, Sprout, Target, Timer, Trash2, TrendingDown, TrendingUp, Wallet as WalletGlyph, X } from "lucide-react";
import { PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";
import { useConfirm, useConfirmRemove } from "@/components/ui/confirm-dialog";
import { ThemedSelect } from "@/components/ui/themed-select";
import { BotanicalIllustrationBackdrop, type BotanicalIllustrationVariant } from "@/components/ui/botanical-illustration";
import { formatCompactRupiah, formatDate, todayISO } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import type {
  CategoryRule, DailyCheckin, FinanceExtras, Goal, Milestone, MoneyTransfer,
  ProgressPhoto, RecurringTransaction, SavingsGoal, TaskStatus, Wallet,
  WellnessEntry, WorkNote, WorkRoutine, WorkTask, WorkspaceModules,
  UpdateWorkspaceModule, WorkoutProgram, WorkoutSession,
} from "@/lib/module-types";

const today = () => todayISO();
const id = () => crypto.randomUUID();
const field = "form-control";
const secondary = "secondary-button module-small-button";
const remove = <T extends { id: string }>(items: T[], key: string) => items.filter((item) => item.id !== key);
// Label jenis dompet dalam bahasa Indonesia (sebelumnya mentah: "cash",
// "bank" — menempel tanpa pemisah pada nama dompet; audit v0.4.1).
const WALLET_TYPE_LABELS: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  "e-wallet": "E-wallet",
  other: "Lainnya",
};
// Pemetaan enum frekuensi rutinitas kerja ke label tampilan bahasa Indonesia
// (audit v0.13 — sebelumnya nilai langsung ditampilkan mentah).
const ROUTINE_FREQUENCY_LABELS: Record<string, string> = {
  daily: "Harian",
  weekdays: "Hari kerja",
  weekly: "Setiap minggu",
  monthly: "Setiap bulan",
};
// Konfirmasi aksi destruktif (hapus tujuan/tugas/dompet/dll) kini memakai
// useConfirmRemove() dari src/components/ui/confirm-dialog.tsx — dialog
// tematik botanical menggantikan window.confirm bawaan browser yang tampil
// polos dari domain deployment.
// Shift a YYYY-MM-DD string by N days using UTC arithmetic so date windows
// (weekly budgets, etc.) always match the Asia/Jakarta-based todayISO().
function shiftISODate(ymd: string, days: number): string {
  const value = new Date(`${ymd}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span className="form-label">{label}</span>{children}</label>;
}
function Panel({ title, caption, children, artwork }: { title: string; caption?: string; children: ReactNode; artwork?: BotanicalIllustrationVariant }) {
  return <section className={`card card-pad${artwork ? " module-art-card" : ""}`}>
    {artwork && <BotanicalIllustrationBackdrop variant={artwork} />}
    <SectionHeading title={title} caption={caption} />
    <div className="module-card-body">{children}</div>
  </section>;
}
function Intro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <PageIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />;
}
// PEDOMAN UI: kartu statistik memakai tile ikon pastel 40px di kiri nilai
// (pola "stat pill" pedoman) — bukan kartu teks polos.
function Metric({ label, value, foot, icon: Icon, tone = "leaf" }: { label: string; value: string; foot: string; icon?: typeof Target; tone?: "leaf" | "amber" | "peach" }) {
  return <div className={`stat-card module-metric tone-${tone}`}>
    {Icon ? <span className="stat-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.9} /></span> : null}
    <div className="small-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className="stat-foot">{foot}</div>
  </div>;
}
function NoData({ children }: { children: string }) {
  return <div className="module-empty"><Sprout size={20} /><p>{children}</p></div>;
}

export function ModulesView({ tab, modules, updateModule }: {
  tab: "goals" | "checkin" | "work" | "wellness" | "training" | "tree" | "settings";
  modules: WorkspaceModules; updateModule: UpdateWorkspaceModule;
}) {
  if (tab === "goals") return <GoalsView modules={modules} updateModule={updateModule} />;
  if (tab === "checkin") return <CheckinView modules={modules} updateModule={updateModule} />;
  if (tab === "work") return <WorkView modules={modules} updateModule={updateModule} />;
  if (tab === "wellness") {
    // Remount only when the tracked *date* changes (first entry of the day or
    // midnight rollover). Keying on the whole entry re-mounted the view on every
    // water-button tap and silently discarded unsaved protein/weight/note input.
    const wellnessToday = modules.wellness.find((item) => item.date === today()) ?? null;
    return <WellnessView key={wellnessToday?.date ?? "empty"} modules={modules} updateModule={updateModule} />;
  }
  if (tab === "training") return <TrainingView modules={modules} updateModule={updateModule} />;
  if (tab === "settings") return <BackupView settings={modules.settings} onUpdateSettings={(update) => updateModule("settings", update)} />;
  return <TreeView modules={modules} />;
}

function GoalsView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const [createOpen, setCreateOpen] = useState(false);
  const confirmRemove = useConfirmRemove();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const milestones: Milestone[] = String(data.get("milestones") || "").split("\n").map((value) => value.trim()).filter(Boolean).map((value) => ({ id: id(), title: value, completed: false }));
    const goal: Goal = {
      id: id(), title, description: String(data.get("description") || ""),
      category: String(data.get("category") || "Personal"), dueDate: String(data.get("dueDate") || ""),
      milestones, completed: false, createdAt: today(),
    };
    updateModule("goals", (items) => [goal, ...items]);
    event.currentTarget.reset();
    setCreateOpen(false);
  }
  const active = modules.goals.filter((goal) => !goal.completed).length;
  const completed = modules.goals.length - active;
  const steps = modules.goals.reduce((sum, goal) => sum + goal.milestones.length, 0);
  const doneSteps = modules.goals.reduce((sum, goal) => sum + goal.milestones.filter((step) => step.completed).length, 0);
  return <>
    <PageIntro eyebrow="GOALS & MILESTONES" title="Ubah niat menjadi progres." subtitle="Pecah tujuan besar menjadi langkah yang bisa diselesaikan satu per satu." action={<PrimaryButton onClick={() => setCreateOpen((value) => !value)}><Plus size={15} /> {createOpen ? "Tutup form" : "Tujuan baru"}</PrimaryButton>} />
    <div className="module-metrics"><Metric label="TUJUAN AKTIF" value={String(active)} foot="Masih berjalan" icon={Target} tone="leaf" /><Metric label="TUJUAN SELESAI" value={String(completed)} foot="Sudah dicapai" icon={Flag} tone="leaf" /><Metric label="MILESTONES" value={doneSteps + "/" + steps} foot="Langkah diselesaikan" icon={MilestoneIcon} tone="amber" /></div>
    {createOpen && <section className="card card-pad goal-create-panel" id="goal-create-panel">
      <SectionHeading title="Tujuan baru" caption="Tuliskan hasil yang ingin dicapai dan milestone-nya." />
      <form className="form-grid" noValidate onSubmit={submit}>
        <Field label="Nama tujuan"><input className={field} name="title" maxLength={100} required placeholder="Contoh: Menyelesaikan sertifikasi" /></Field>
        <Field label="Deskripsi"><textarea className={field} name="description" rows={2} maxLength={500} placeholder="Mengapa tujuan ini penting?" /></Field>
        <div className="form-two-columns">
          <Field label="Kategori"><ThemedSelect className={field} name="category"><option value="Personal">Personal</option><option value="Health">Kesehatan</option><option value="Learning">Belajar</option><option value="Finance">Keuangan</option><option value="Career">Karier</option></ThemedSelect></Field>
          <Field label="Tenggat"><input className={field} name="dueDate" type="date" min={today()} /></Field>
        </div>
        <Field label="Milestones (satu per baris)"><textarea className={field} name="milestones" rows={3} maxLength={1000} placeholder={"Riset langkah pertama\nSelesaikan bagian awal\nEvaluasi hasil"} /></Field>
        <div className="module-button-row"><PrimaryButton type="submit"><Plus size={15} /> Simpan tujuan</PrimaryButton><button type="button" className={secondary} onClick={() => setCreateOpen(false)}>Batal</button></div>
      </form>
    </section>}
    <section className="card card-pad goal-list-panel">
      <BotanicalIllustrationBackdrop variant="goals" />
      <SectionHeading title="Tujuanmu" caption={modules.goals.length + " tujuan tersimpan · " + doneSteps + " dari " + steps + " milestone selesai"} />
      {modules.goals.length ? <div className="module-list goal-list">{modules.goals.map((goal) => {
        const done = goal.milestones.filter((step) => step.completed).length;
        const progress = goal.completed ? 100 : goal.milestones.length ? Math.round(done / goal.milestones.length * 100) : 0;
        return <article className={"module-item goal-card" + (goal.completed ? " is-complete" : "")} key={goal.id}>
          <div className="module-item-top goal-card-top">
            <span className="goal-card-icon"><Target size={20} /></span>
            <div className="goal-card-copy"><span className="module-tag">{goal.category}</span><h3>{goal.title}</h3><p>{goal.description || "Tidak ada deskripsi."}</p></div>
            <button className="module-icon-action danger" type="button" onClick={() => confirmRemove(`tujuan "${goal.title}"`, () => updateModule("goals", (items) => remove(items, goal.id)))} aria-label={"Hapus tujuan " + goal.title}><Trash2 size={15} /></button>
          </div>
          {goal.dueDate && <small className="module-muted goal-due-date">Tenggat {formatDate(goal.dueDate)}</small>}
          <div className="goal-progress-heading"><span>PROGRES TUJUAN</span><strong>{progress}%</strong></div>
          <div className="module-progress-track" role="progressbar" aria-label={"Progres tujuan " + goal.title} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + "%" }} /></div>
          <div className="module-inline-meta"><small>{done}/{goal.milestones.length} milestone</small><button type="button" className={secondary} onClick={() => updateModule("goals", (items) => items.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))}>{goal.completed ? "Buka kembali" : "Tandai selesai"}</button></div>
          {goal.milestones.length > 0 ? <div className="goal-milestones"><span className="goal-milestones-label">LANGKAH BERIKUTNYA</span>{goal.milestones.map((step) => <label className="module-check-row" key={step.id}><input type="checkbox" aria-label={step.title} checked={step.completed} onChange={(event) => updateModule("goals", (items) => items.map((item) => item.id === goal.id ? { ...item, milestones: item.milestones.map((part) => part.id === step.id ? { ...part, completed: event.target.checked } : part) } : item))} /><span className={step.completed ? "is-done" : ""}>{step.title}</span></label>)}</div> : <p className="goal-no-milestones">Belum ada milestone. Kamu tetap bisa menandai tujuan ini selesai kapan pun.</p>}
        </article>;
      })}</div> : <div className="goal-empty-state"><NoData>Belum ada tujuan. Mulai dengan satu hasil yang ingin kamu capai.</NoData><PrimaryButton onClick={() => setCreateOpen(true)}><Plus size={14} /> Buat tujuan pertama</PrimaryButton></div>}
    </section>
  </>;
}

function CheckinView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const date = today();
  const current = modules.checkins.find((item) => item.date === date);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const record: DailyCheckin = { date, mood: Number(form.get("mood") || 3), energy: Number(form.get("energy") || 3), sleepHours: Number(form.get("sleep") || 7), notes: String(form.get("notes") || "").trim() };
    updateModule("checkins", (items) => [record, ...items.filter((item) => item.date !== date)].sort((a, b) => b.date.localeCompare(a.date)));
    // Umpan balik langsung: sebelumnya hanya subjudul berubah diam-diam
    // (audit v0.4.1) — pengguna tak yakin tombolnya bekerja.
    try {
      window.dispatchEvent(new CustomEvent("rutina:toast", { detail: { message: current ? "Check-in hari ini diperbarui." : "Check-in hari ini tersimpan." } }));
    } catch { /* lingkungan non-DOM */ }
  }
  return <>
    <Intro eyebrow="DAILY CHECK-IN & JOURNAL" title="Periksa keadaan dirimu." subtitle="Catat suasana hati, energi, tidur, dan hal yang ingin kamu ingat hari ini." />
    <div className="module-two-col">
      <Panel title="Check-in hari ini" caption={current ? "Perbarui catatanmu bila diperlukan." : "Tidak perlu sempurna. Catat apa adanya."} artwork="checkin">
        <form className="form-grid" noValidate onSubmit={submit}>
          <div className="form-two-columns">
            <Field label="Mood (1–5)"><ThemedSelect className={field} name="mood" defaultValue={String(current?.mood ?? 3)}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} · {["","Sangat berat","Kurang baik","Biasa","Baik","Sangat baik"][n]}</option>)}</ThemedSelect></Field>
            <Field label="Energi (1–5)"><ThemedSelect className={field} name="energy" defaultValue={String(current?.energy ?? 3)}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} · {["","Sangat rendah","Rendah","Cukup","Tinggi","Sangat tinggi"][n]}</option>)}</ThemedSelect></Field>
          </div>
          <Field label="Durasi tidur (jam)"><input className={field} name="sleep" type="number" min="0" max="24" step=".5" inputMode="decimal" defaultValue={current?.sleepHours ?? 7} /></Field>
          <Field label="Jurnal singkat"><textarea className={field} name="notes" rows={6} maxLength={2000} defaultValue={current?.notes ?? ""} placeholder="Apa yang berjalan baik? Apa yang terasa berat?" /></Field>
          <PrimaryButton type="submit"><Check size={15} /> Simpan check-in</PrimaryButton>
        </form>
      </Panel>
      <Panel title="Riwayat check-in" caption={`${modules.checkins.length} hari tercatat`}>
        {modules.checkins.length ? <div className="module-list">{modules.checkins.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 45).map((item) => <article className="module-item" key={item.date}><div className="module-item-top"><strong>{formatDate(item.date)}</strong><span className="module-tag">Mood {item.mood}/5 · Energi {item.energy}/5</span></div><p className="module-muted">Tidur {item.sleepHours} jam</p>{item.notes && <p>{item.notes}</p>}</article>)}</div> : <NoData>Riwayat check-in muncul setelah catatan pertama disimpan.</NoData>}
      </Panel>
    </div>
  </>;
}

function WorkView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const [section, setSection] = useState<"tasks" | "notes" | "routines">("tasks");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const confirmRemove = useConfirmRemove();
  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); if (!title) return;
    const item: WorkTask = { id: id(), title, description: String(data.get("description") || ""), priority: String(data.get("priority") || "medium") as WorkTask["priority"], status: "todo", dueDate: String(data.get("dueDate") || ""), createdAt: today() };
    updateModule("tasks", (items) => [item, ...items]); event.currentTarget.reset();
  }
  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const body = String(data.get("body") || "").trim(); if (!title || !body) return;
    const item: WorkNote = { id: id(), title, body, tags: String(data.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean), updatedAt: new Date().toISOString() };
    updateModule("notes", (items) => [item, ...items]); event.currentTarget.reset();
  }
  function addRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); if (!title) return;
    const item: WorkRoutine = { id: id(), title, description: String(data.get("description") || ""), frequency: String(data.get("frequency") || "daily"), lastDone: "" };
    updateModule("routines", (items) => [item, ...items]); event.currentTarget.reset();
  }
  const taskList = modules.tasks.filter((item) => status === "all" || item.status === status);
  return <>
    <Intro eyebrow="PERSONAL WORKSPACE" title="Ruang untuk menyelesaikan sesuatu." subtitle="Kelola tugas, rutinitas kerja, dan catatan dalam satu tempat." />
    <div className="module-tabs"><button className={section === "tasks" ? "active" : ""} onClick={() => setSection("tasks")}>Task board <span>{modules.tasks.length}</span></button><button className={section === "notes" ? "active" : ""} onClick={() => setSection("notes")}>Catatan <span>{modules.notes.length}</span></button><button className={section === "routines" ? "active" : ""} onClick={() => setSection("routines")}>Rutinitas <span>{modules.routines.length}</span></button></div>
    {section === "tasks" && <div className="module-two-col">
      <Panel title="Tugas baru" caption="Simpan tindakan yang jelas dan bisa diselesaikan" artwork="work"><form className="form-grid" noValidate onSubmit={addTask}><Field label="Nama tugas"><input className={field} name="title" required maxLength={120} placeholder="Apa yang perlu diselesaikan?" /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} maxLength={1000} /></Field><div className="form-two-columns"><Field label="Prioritas"><ThemedSelect className={field} name="priority"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></ThemedSelect></Field><Field label="Tenggat"><input className={field} name="dueDate" type="date" min={today()} /></Field></div><PrimaryButton type="submit"><Plus size={15} /> Tambah tugas</PrimaryButton></form></Panel>
      <Panel title="Task board" caption={`${modules.tasks.filter((task) => task.status === "done").length} dari ${modules.tasks.length} tugas selesai`}><div className="module-tabs compact">{(["all", "todo", "doing", "done"] as const).map((value) => <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value === "all" ? "Semua" : value === "todo" ? "To do" : value === "doing" ? "Berjalan" : "Selesai"}</button>)}</div>{taskList.length ? <div className="module-list">{taskList.map((task) => <article className="module-item" key={task.id}><div className="module-item-top"><div><span className={`module-priority ${task.priority}`}>{task.priority === "high" ? "Tinggi" : task.priority === "medium" ? "Sedang" : "Rendah"}</span><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}</div><button className="module-icon-action danger" onClick={() => confirmRemove(`tugas "${task.title}"`, () => updateModule("tasks", (items) => remove(items, task.id)))} aria-label={`Hapus tugas ${task.title}`}><Trash2 size={15} /></button></div><div className="module-inline-meta"><small>{task.dueDate ? formatDate(task.dueDate) : "Tanpa tenggat"}</small><ThemedSelect className="module-status-select" value={task.status} onChange={(value) => updateModule("tasks", (items) => items.map((item) => item.id === task.id ? { ...item, status: value as TaskStatus } : item))}><option value="todo">To do</option><option value="doing">Berjalan</option><option value="done">Selesai</option></ThemedSelect></div></article>)}</div> : <NoData>Tidak ada tugas pada filter ini.</NoData>}</Panel>
    </div>}
    {section === "notes" && <div className="module-two-col"><Panel title="Catatan baru" caption="Simpan ide, referensi, atau ringkasan" artwork="work"><form className="form-grid" noValidate onSubmit={addNote}><Field label="Judul"><input className={field} name="title" required maxLength={100} /></Field><Field label="Isi"><textarea className={field} name="body" rows={6} required maxLength={5000} /></Field><Field label="Tag (pisahkan dengan koma)"><input className={field} name="tags" maxLength={200} placeholder="kerja, ide, referensi" /></Field><PrimaryButton type="submit"><Plus size={15} /> Simpan catatan</PrimaryButton></form></Panel><Panel title="Catatan tersimpan" caption={`${modules.notes.length} catatan`}>{modules.notes.length ? <div className="module-list">{modules.notes.map((note) => <article className="module-item" key={note.id}><div className="module-item-top"><h3>{note.title}</h3><button className="module-icon-action danger" onClick={() => confirmRemove(`catatan "${note.title}"`, () => updateModule("notes", (items) => remove(items, note.id)))} aria-label={`Hapus catatan ${note.title}`}><Trash2 size={15} /></button></div><p>{note.body}</p><div className="module-chip-row">{note.tags.map((tag) => <span className="module-tag" key={tag}>{tag}</span>)}</div><small className="module-muted">Diperbarui {new Date(note.updatedAt).toLocaleDateString("id-ID")}</small></article>)}</div> : <NoData>Belum ada catatan.</NoData>}</Panel></div>}
    {section === "routines" && <div className="module-two-col"><Panel title="Rutinitas baru" caption="Pekerjaan berulang yang ingin dijaga" artwork="work"><form className="form-grid" noValidate onSubmit={addRoutine}><Field label="Nama rutinitas"><input className={field} name="title" required maxLength={100} /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} maxLength={500} /></Field><Field label="Frekuensi"><ThemedSelect className={field} name="frequency"><option value="daily">Harian</option><option value="weekdays">Hari kerja</option><option value="weekly">Setiap minggu</option><option value="monthly">Setiap bulan</option></ThemedSelect></Field><PrimaryButton type="submit"><Plus size={15} /> Tambah rutinitas</PrimaryButton></form></Panel><Panel title="Rutinitas tersimpan">{modules.routines.length ? <div className="module-list">{modules.routines.map((item) => <article className="module-item" key={item.id}><div className="module-item-top"><div><h3>{item.title}</h3><p>{item.description}</p><small className="module-muted">{ROUTINE_FREQUENCY_LABELS[item.frequency] ?? item.frequency}</small></div><button className="module-icon-action danger" onClick={() => confirmRemove(`rutinitas "${item.title}"`, () => updateModule("routines", (items) => remove(items, item.id)))} aria-label={`Hapus rutinitas ${item.title}`}><Trash2 size={15} /></button></div><button className={secondary} onClick={() => updateModule("routines", (items) => items.map((routine) => routine.id === item.id ? { ...routine, lastDone: today() } : routine))}>Tandai dilakukan hari ini {item.lastDone === today() ? "✓" : ""}</button></article>)}</div> : <NoData>Belum ada rutinitas kerja.</NoData>}</Panel></div>}
  </>;
}

function WellnessView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const current = modules.wellness.find((item) => item.date === today()) ?? { date: today(), waterMl: 0, proteinGrams: 0, weightKg: null, note: "" };
  const [weight, setWeight] = useState(current.weightKg?.toString() ?? "");
  const [protein, setProtein] = useState(String(current.proteinGrams));
  const [note, setNote] = useState(current.note);
  function save() {
    const next: WellnessEntry = { ...current, weightKg: weight ? Number(weight) : current.weightKg, proteinGrams: Math.max(0, Number(protein) || 0), note };
    updateModule("wellness", (items) => [next, ...items.filter((item) => item.date !== today())].sort((a, b) => b.date.localeCompare(a.date)));
  }
  const weights = modules.wellness.filter((item) => item.weightKg !== null).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  return <>
    <Intro eyebrow="WELLNESS TRACKER" title="Rawat kebutuhan dasarmu." subtitle="Pantau hidrasi, protein, dan perubahan berat badan tanpa menebak-nebak." />
    <div className="module-metrics"><Metric label="AIR HARI INI" value={`${current.waterMl.toLocaleString("id-ID")} ml`} foot="Target awal 2.000 ml" icon={Droplets} tone="leaf" /><Metric label="PROTEIN" value={`${current.proteinGrams} g`} foot={`${Math.round(current.proteinGrams)} gram tercatat`} icon={Drumstick} tone="amber" /><Metric label="BERAT TERAKHIR" value={current.weightKg ? `${current.weightKg} kg` : "—"} foot="Catatan hari ini" icon={Scale} tone="peach" /></div>
    <div className="module-two-col"><Panel title="Hidrasi" caption="Tambah setiap kali minum air" artwork="wellness"><div className="wellness-water-ring"><div><strong>{current.waterMl.toLocaleString("id-ID")}</strong><small>ml hari ini</small></div></div><div className="module-button-row">{[150, 250, 350, 500].map((amount) => <button className={secondary} key={amount} onClick={() => updateModule("wellness", (items) => { const base = items.find((item) => item.date === today()) ?? current; return [{ ...base, waterMl: base.waterMl + amount }, ...items.filter((item) => item.date !== today())]; })}>+{amount} ml</button>)}<button className={secondary} onClick={() => updateModule("wellness", (items) => items.map((item) => item.date === today() ? { ...item, waterMl: Math.max(0, item.waterMl - 250) } : item))}>−250 ml</button></div><div className="module-progress-track"><span style={{ width: `${Math.min(100, current.waterMl / 2000 * 100)}%` }} /></div></Panel><Panel title="Nutrisi & berat badan" caption="Masukkan catatan tubuh hari ini"><div className="form-grid"><Field label="Protein (gram)"><input className={field} type="number" min="0" max="1000" inputMode="numeric" value={protein} onChange={(event) => setProtein(event.target.value)} /></Field><Field label="Berat badan (kg)"><input className={field} type="number" min="1" max="500" step=".1" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Contoh: 65.5" /></Field><Field label="Catatan"><textarea className={field} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></Field><PrimaryButton onClick={save}><Check size={15} /> Simpan data wellness</PrimaryButton></div>{weights.length > 0 && <div className="module-list">{weights.map((item) => <div className="module-inline-meta" key={item.date}><small>{formatDate(item.date)}</small><strong>{item.weightKg} kg</strong></div>)}</div>}</Panel></div>
  </>;
}

function TrainingView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const [seconds, setSeconds] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const confirmRemove = useConfirmRemove();
  const { confirm } = useConfirm();
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRemaining((value) => {
      if (value <= 1) { window.clearInterval(timer); setRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function addWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const exercise = String(data.get("exercise") || "").trim(); if (!exercise) return;
    const session: WorkoutSession = {
      id: id(), date: String(data.get("date") || today()), title: String(data.get("title") || "Sesi latihan"),
      durationMinutes: Math.max(0, Number(data.get("duration")) || 0), cardioMinutes: Math.max(0, Number(data.get("cardio")) || 0),
      notes: String(data.get("notes") || ""),
      exercises: [{ id: id(), name: exercise, sets: Math.max(1, Number(data.get("sets")) || 1), reps: Math.max(1, Number(data.get("reps")) || 1), weightKg: Math.max(0, Number(data.get("weight")) || 0) }],
    };
    updateModule("workouts", (items) => [session, ...items]); event.currentTarget.reset();
  }
  function addProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); if (!title) return;
    const program: WorkoutProgram = { id: id(), title, days: String(data.get("days") || "Senin, Rabu, Jumat"), description: String(data.get("description") || ""), active: true };
    updateModule("programs", (items) => [program, ...items.map((item) => ({ ...item, active: false }))]); event.currentTarget.reset();
  }
  async function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) {
      confirm({ tone: "amber", title: "Pilih file gambar", message: "File yang dipilih bukan gambar. Coba pilih foto dengan format JPG, PNG, atau WebP.", hideCancel: true, confirmLabel: "Mengerti", onConfirm: () => {} });
      event.target.value = "";
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      confirm({ tone: "amber", title: "Foto terlalu besar", message: "Ukuran foto maksimal 12 MB sebelum dikompresi. Perkecil dulu ukuran fotonya, ya.", hideCancel: true, confirmLabel: "Mengerti", onConfirm: () => {} });
      event.target.value = "";
      return;
    }
    setPhotoBusy(true);
    try {
      const imageData = await compressPhoto(file);
      if (imageData.length > 280_000) throw new Error("Ukuran foto masih terlalu besar setelah kompresi.");
      const photo: ProgressPhoto = { id: id(), date: today(), label: "Foto progres", note: "", imageData };
      updateModule("progressPhotos", (items) => [photo, ...items].slice(0, 5));
    } catch (error) {
      confirm({ tone: "amber", title: "Foto belum tersimpan", message: error instanceof Error ? error.message : "Gagal memproses foto.", hideCancel: true, confirmLabel: "Mengerti", onConfirm: () => {} });
    } finally { setPhotoBusy(false); event.target.value = ""; }
  }
  const totalMinutes = modules.workouts.reduce((sum, item) => sum + item.durationMinutes + item.cardioMinutes, 0);
  const readiness = modules.checkins.find((item) => item.date === today());
  return <>
    <Intro eyebrow="WORKOUT & TRAINING" title="Latihan dengan progres yang tercatat." subtitle="Simpan program, sesi latihan, kardio, foto progres, dan waktu istirahat. Fitur peta otot tidak disertakan." />
    <div className="module-metrics"><Metric label="SESI LATIHAN" value={String(modules.workouts.length)} foot="Seluruh riwayat" icon={Activity} tone="leaf" /><Metric label="TOTAL DURASI" value={`${totalMinutes} mnt`} foot="Latihan dan kardio" icon={Timer} tone="amber" /><Metric label="KESIAPAN HARI INI" value={readiness ? `${Math.round((readiness.mood + readiness.energy) / 10 * 100)}%` : "—"} foot={readiness ? "Dari mood dan energi" : "Isi daily check-in dahulu"} icon={Gauge} tone="peach" /></div>
    <div className="module-two-col"><Panel title="Catat sesi latihan" caption="Log gerakan, set, repetisi, beban, dan kardio" artwork="training"><form className="form-grid" noValidate onSubmit={addWorkout}><Field label="Nama sesi"><input className={field} name="title" defaultValue="Full body" maxLength={80} /></Field><div className="form-two-columns"><Field label="Tanggal"><input className={field} name="date" type="date" max={today()} defaultValue={today()} /></Field><Field label="Durasi latihan (menit)"><input className={field} name="duration" type="number" min="0" inputMode="numeric" defaultValue="45" /></Field></div><Field label="Nama gerakan"><input className={field} name="exercise" required maxLength={80} placeholder="Contoh: Push-up" /></Field><div className="form-three-columns"><Field label="Set"><input className={field} name="sets" type="number" min="1" inputMode="numeric" defaultValue="3" /></Field><Field label="Repetisi"><input className={field} name="reps" type="number" min="1" inputMode="numeric" defaultValue="10" /></Field><Field label="Beban (kg)"><input className={field} name="weight" type="number" min="0" step=".5" inputMode="decimal" defaultValue="0" /></Field></div><Field label="Kardio (menit)"><input className={field} name="cardio" type="number" min="0" inputMode="numeric" defaultValue="0" /></Field><Field label="Catatan"><textarea className={field} name="notes" rows={2} maxLength={1000} /></Field><PrimaryButton type="submit"><Plus size={15} /> Simpan latihan</PrimaryButton></form></Panel><Panel title="Program latihan" caption="Simpan split latihan mingguan"><form className="form-grid" noValidate onSubmit={addProgram}><Field label="Nama program"><input className={field} name="title" required maxLength={80} placeholder="Contoh: Strength 3 hari" /></Field><Field label="Hari latihan"><input className={field} name="days" maxLength={120} placeholder="Senin, Rabu, Jumat" /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} maxLength={500} /></Field><PrimaryButton type="submit"><Plus size={15} /> Buat program</PrimaryButton></form>{modules.programs.map((program) => <article className="module-item" key={program.id}><div className="module-item-top"><div><h3>{program.title} {program.active && <span className="module-tag">Aktif</span>}</h3><p>{program.days} · {program.description}</p></div><button className="module-icon-action danger" onClick={() => confirmRemove(`program "${program.title}"`, () => updateModule("programs", (items) => remove(items, program.id)))} aria-label={`Hapus program ${program.title}`}><Trash2 size={14} /></button></div><button className={secondary} onClick={() => updateModule("programs", (items) => items.map((item) => ({ ...item, active: item.id === program.id })))}>Jadikan aktif</button></article>)}</Panel></div>
    <div className="module-two-col"><Panel title="Riwayat latihan" caption="Setiap sesi yang kamu catat">{modules.workouts.length ? <div className="module-list">{modules.workouts.slice(0, 30).map((session) => <article className="module-item" key={session.id}><div className="module-item-top"><div><small className="module-muted">{formatDate(session.date)}</small><h3>{session.title}</h3><p>{session.durationMinutes} menit latihan · {session.cardioMinutes} menit kardio</p></div><button className="module-icon-action danger" onClick={() => confirmRemove("sesi latihan ini", () => updateModule("workouts", (items) => remove(items, session.id)))} aria-label="Hapus sesi"><Trash2 size={14} /></button></div>{session.exercises.map((exercise) => <p className="module-muted" key={exercise.id}>{exercise.name} · {exercise.sets} × {exercise.reps} · {exercise.weightKg} kg</p>)}{session.notes && <p>{session.notes}</p>}</article>)}</div> : <NoData>Belum ada sesi latihan.</NoData>}</Panel><Panel title="Rest timer" caption="Atur waktu jeda antar set"><div className="rest-timer"><strong>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong><div className="module-button-row">{[30, 60, 90, 120, 180].map((value) => <button className={seconds === value ? "primary-button module-small-button" : secondary} key={value} onClick={() => { setSeconds(value); setRemaining(value); setRunning(false); }}>{value}s</button>)}</div><div className="module-button-row"><button className="primary-button module-small-button" disabled={remaining === 0} onClick={() => setRunning((value) => !value)}>{running ? "Pause" : remaining === 0 ? "Selesai" : "Mulai"}</button><button className={secondary} onClick={() => { setRunning(false); setRemaining(seconds); }}>Reset</button></div></div></Panel></div>
    <Panel title="Foto progres" caption="Foto dikompresi sebelum disimpan; maksimal 5 foto aktif"><label className="module-upload"><ImagePlus size={20} /><span>{photoBusy ? "Mengompresi foto…" : "Tambah foto progres"}</span><input type="file" accept="image/*" disabled={photoBusy} onChange={addPhoto} /></label>{modules.progressPhotos.length > 0 && <div className="module-photo-grid">{/* eslint-disable @next/next/no-img-element -- data URL JPEG hasil kompresi klien; optimasi next/image tidak berlaku untuk data URL */}{modules.progressPhotos.map((photo) => <figure key={photo.id}><img src={photo.imageData} alt={`Foto progres ${photo.date}`} /><figcaption>{formatDate(photo.date)}<button onClick={() => confirmRemove("foto progres ini", () => updateModule("progressPhotos", (items) => remove(items, photo.id)))} aria-label="Hapus foto"><X size={13} /></button></figcaption></figure>)}{/* eslint-enable @next/next/no-img-element */}</div>}</Panel>
  </>;
}

interface GrowthSummary {
  today: string;
  weekStart: string;
  totalXp: number;
  weeklyXp: number;
  level: number;
  levelProgress: number;
  currentStreak: number;
  completedGoals: number;
  scheduledToday: number;
  completedToday: number;
  vacationMode: boolean;
  stage: { id: string; label: string; threshold: number; next: number | null; artwork: string; tagline: string; index: number; xpToNext: number | null; progress: number };
  artwork: string;
  wisdom: string;
  worstHabit: { id: string; name: string; rate: number } | null;
  totalLogs: number;
}

function TreeView({ modules }: { modules: WorkspaceModules }) {
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/growth", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Growth data unavailable");
        return response.json() as Promise<GrowthSummary>;
      })
      .then((data) => {
        if (!cancelled) setGrowth(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, []);

  const lifetimeStageConfig = growth
    ? growth.level >= 7
      ? { name: "Pohon Dewasa", artwork: "/tree/pohon-dewasa.svg", tagline: "Konsistensi telah berakar menjadi sistem yang bisa kamu andalkan." }
      : growth.level >= 4
        ? { name: "Pohon Muda", artwork: "/tree/pohon-muda.svg", tagline: "Rutinitasmu mulai berakar dan memberi bentuk pada hari-hari." }
        : growth.level >= 2
          ? { name: "Tunas", artwork: "/tree/tunas.svg", tagline: "Langkah kecilmu mulai terlihat sebagai pertumbuhan yang nyata." }
          : { name: "Benih", artwork: "/tree/benih.svg", tagline: "Setiap perjalanan tumbuh dari satu keputusan sederhana." }
    : null;
  const lifetimeStage = lifetimeStageConfig?.name ?? "—";
  const goalsCount = modules.goals.filter((goal) => goal.completed).length;
  const stageArt = lifetimeStageConfig?.artwork ?? "/tree/benih.svg";

  return (
    <div className="tree-page">
      <Intro eyebrow="GROWTH JOURNEY" title="Pohon Rutina-mu terus tumbuh." subtitle="Rawat proses kecilmu setiap hari. Lihat kebiasaan baik berubah menjadi pertumbuhan yang nyata." />
      {growth ? <>
        <section className="tree-journey-hero">
          <BotanicalIllustrationBackdrop variant="tree" />
          <div className="tree-journey-copy">
            <span className="tree-journey-kicker">YOUR LITTLE GROWTH STORY</span>
            <h2>Rawat pohonmu,<br />rayakan setiap<br />langkah kecil.</h2>
            <p>{lifetimeStageConfig?.tagline ?? growth.stage.tagline}</p>
            <div className="tree-level-lockup">
              <span className="tree-level-badge">LEVEL {growth.level}</span>
              <span className="tree-level-name">Pohon Produktivitas</span>
            </div>
            <div className="tree-level-progress-copy">
              <strong>{growth.totalXp.toLocaleString("id-ID")} XP</strong>
              <span>Menuju level {growth.level + 1}</span>
            </div>
            <div className="tree-level-progress" role="progressbar" aria-label="Progres level seumur hidup" aria-valuenow={Math.round(growth.levelProgress)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: String(growth.levelProgress) + "%" }} />
            </div>
            <small className="tree-level-footnote">Progres seumur hidup · tidak pernah direset</small>
            <a className="tree-detail-cta" href="#tree-growth-details">Lihat Detail <ArrowRight size={13} /></a>
          </div>
          <div className="tree-journey-art" role="img" aria-label={"Ilustrasi pohon tahap " + lifetimeStage}>
            <span className="tree-art-orbit tree-art-orbit-one" />
            <span className="tree-art-orbit tree-art-orbit-two" />
            <span className="tree-art-badge"><Sprout size={13} /> {lifetimeStage}</span>
            <Image className="tree-main-art" src={stageArt} alt={"Pohon Rutina tahap " + lifetimeStage} width={480} height={480} priority />
            <span className="tree-art-ground" />
            <span className="tree-art-level-stamp">LV. {growth.level}</span>
          </div>
          <div className="tree-weekly-ribbon">
            <span className="tree-weekly-ribbon-icon"><Sprout size={16} /></span>
            <span><small>MUSIM MINGGU INI</small><strong>{growth.stage.label} · {growth.weeklyXp.toLocaleString("id-ID")} XP</strong></span>
            <span className="tree-weekly-ribbon-meta">{growth.stage.xpToNext === null ? "Tahap tertinggi" : growth.stage.xpToNext.toLocaleString("id-ID") + " XP lagi"}</span>
          </div>
        </section>

        <div className="tree-season-stats">
          <div><span className="small-label">LEVEL SEUMUR HIDUP</span><strong>{growth.level}</strong><small>{growth.totalXp.toLocaleString("id-ID")} total XP</small></div>
          <div><span className="small-label">STREAK TERPANJANG</span><strong>{growth.currentStreak} hari</strong><small>{growth.currentStreak >= 7 ? "Pohon sedang berbunga" : "Konsistensi sedang dibangun"}</small></div>
          <div><span className="small-label">BUAH EMAS</span><strong>{goalsCount}</strong><small>Tujuan yang telah selesai</small></div>
        </div>

        <div className="module-two-col tree-detail-grid" id="tree-growth-details">
          <Panel title="Penyiraman hari ini" caption="Setiap habit yang selesai membantu pertumbuhan hari ini">
            <div className="tree-watering-count"><strong>{growth.completedToday}/{growth.scheduledToday}</strong><span>habit terjadwal selesai</span></div>
            <div className="module-progress-track"><span style={{ width: String(growth.scheduledToday ? growth.completedToday / growth.scheduledToday * 100 : 0) + "%" }} /></div>
            <p className="module-muted">{growth.vacationMode ? "Mode libur aktif: pencatatan habit dijeda." : growth.scheduledToday === 0 ? "Tidak ada habit yang terjadwal hari ini." : growth.completedToday >= growth.scheduledToday ? "Semua habit hari ini telah selesai. Pohonmu mendapat siraman penuh." : (growth.scheduledToday - growth.completedToday) + " habit lagi untuk menyelesaikan penyiraman hari ini."}</p>
          </Panel>
          <Panel title="Kebijaksanaan pohon" caption="Pengingat harian dari perjalanan yang terus bertumbuh">
            <div className="tree-wisdom-quote"><span aria-hidden="true">“</span><p>{growth.wisdom}</p></div>
            {growth.worstHabit && <div className="tree-care-note"><strong>Perlu dirawat: {growth.worstHabit.name}</strong><p>Catatan penyelesaian 30 hari terakhir: {Math.round(growth.worstHabit.rate)}%.</p></div>}
          </Panel>
        </div>

        <Panel title="Jalan pertumbuhan seumur hidup" caption="Setiap tahap menyimpan jejak konsistensi yang sudah kamu bangun">
          <div className="tree-lifetime-path">
            {[
              { name: "Benih", level: "Level 1", min: 1, art: "/tree/benih.svg" },
              { name: "Tunas", level: "Level 2–3", min: 2, art: "/tree/tunas.svg" },
              { name: "Pohon Muda", level: "Level 4–6", min: 4, art: "/tree/pohon-muda.svg" },
              { name: "Pohon Dewasa", level: "Level 7+", min: 7, art: "/tree/pohon-dewasa.svg" },
            ].map((item) => {
              const achieved = growth.level >= item.min;
              const current = lifetimeStage === item.name;
              return <div className={"tree-lifetime-stage " + (current ? "current" : achieved ? "achieved" : "locked")} key={item.name}>
                <Image src={item.art} alt="" width={100} height={100} />
                <strong>{item.name}</strong><small>{item.level}</small>
                <span>{current ? "Tahap saat ini" : achieved ? "Tercapai" : "Belum tercapai"}</span>
              </div>;
            })}
          </div>
        </Panel>
      </> : <section className="card card-pad tree-loading-state">
        <div className="tree-loading-mark"><Sprout size={30} /></div>
        <strong>{error ? "Data pertumbuhan belum tersedia" : "Menghitung pertumbuhan pohon…"}</strong>
        <p>{error ? "Data pertumbuhan belum tersedia. Periksa koneksi lalu muat ulang untuk melihat XP, level, serta riwayat pohon." : "Menghitung catatan habit yang tersimpan."}</p>
      </section>}
    </div>
  );
}

export function FinanceExtrasPanel({ modules, updateModule, transactions, onAddTransactions }: {
  modules: WorkspaceModules; updateModule: UpdateWorkspaceModule; transactions: Transaction[];
  onAddTransactions: (items: Transaction[]) => void;
}) {
  const [tab, setTab] = useState<"wallets" | "transfers" | "recurring" | "savings" | "rules" | "split" | "weekly">("wallets");
  const confirmRemove = useConfirmRemove();
  const { confirm } = useConfirm();
  const finance = modules.finance;
  const update = (fn: (current: FinanceExtras) => FinanceExtras) => updateModule("finance", fn);
  const month = today().slice(0, 7);
  const monthExpenses = transactions.filter((item) => item.type === "expense" && item.date.slice(0, 7) === month).reduce((sum, item) => sum + item.amount, 0);
  const day = Number(today().slice(8, 10));
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const projection = day ? Math.round(monthExpenses / day * days) : 0;
  const walletBalanceAt = useCallback((wallet: Wallet, cutoff: string) => {
    const selected = transactions.filter((item) => item.walletId === wallet.id && item.date <= cutoff);
    const income = selected.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = selected.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const sent = finance.transfers.filter((item) => item.fromWalletId === wallet.id && item.date <= cutoff).reduce((sum, item) => sum + item.amount, 0);
    const received = finance.transfers.filter((item) => item.toWalletId === wallet.id && item.date <= cutoff).reduce((sum, item) => sum + item.amount, 0);
    return wallet.openingBalance + income - expense - sent + received;
  }, [transactions, finance.transfers]);
  const walletBalance = (wallet: Wallet) => walletBalanceAt(wallet, today());
  function addWallet(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); if (!name) return; const item: Wallet = { id: id(), name, type: String(data.get("type") || "cash") as Wallet["type"], openingBalance: Math.max(0, Number(data.get("balance")) || 0) }; update((current) => ({ ...current, wallets: [...current.wallets, item] })); event.currentTarget.reset(); }
  function addTransfer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const fromWalletId = String(data.get("from") || ""); const toWalletId = String(data.get("to") || ""); const amount = Math.round(Number(data.get("amount"))); if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) return; const item: MoneyTransfer = { id: id(), fromWalletId, toWalletId, amount, date: String(data.get("date") || today()), note: String(data.get("note") || "") }; update((current) => ({ ...current, transfers: [item, ...current.transfers] })); event.currentTarget.reset(); }
  function addRecurring(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const amount = Math.round(Number(data.get("amount"))); if (!title || amount <= 0) return; const item: RecurringTransaction = { id: id(), title, amount, type: String(data.get("type") || "expense") as RecurringTransaction["type"], category: String(data.get("category") || "Tagihan"), frequency: String(data.get("frequency") || "monthly") as RecurringTransaction["frequency"], nextDate: String(data.get("nextDate") || today()), active: true }; update((current) => ({ ...current, recurring: [item, ...current.recurring] })); event.currentTarget.reset(); }
  function addSavings(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const targetAmount = Math.round(Number(data.get("target"))); const savedAmount = Math.max(0, Number(data.get("saved")) || 0); if (!title || targetAmount <= 0) return; // Peringatan saat sudah terkumpul melebihi target (audit v0.13): sebelumnya
    // form diam-diam menerima saved > target lalu bar progres menunjukkan
    // 100% penuh, menyembunyikan kelebihan tabungan.
    if (savedAmount > targetAmount) {
      confirm({
        tone: "amber",
        title: "Tabungan melebihi target",
        subject: title,
        message: `Nominal terkumpul (${formatCompactRupiah(savedAmount)}) lebih besar dari target (${formatCompactRupiah(targetAmount)}). Bar progres akan menunjukkan 100% meski kelebihan tidak terlihat. Simpan saja?`,
        confirmLabel: "Ya, simpan",
        onConfirm: () => {
          const item: SavingsGoal = { id: id(), title, targetAmount, savedAmount, dueDate: String(data.get("dueDate") || "") };
          update((current) => ({ ...current, savingsGoals: [item, ...current.savingsGoals] }));
          event.currentTarget.reset();
        },
      });
      return;
    }
    const item: SavingsGoal = { id: id(), title, targetAmount, savedAmount, dueDate: String(data.get("dueDate") || "") }; update((current) => ({ ...current, savingsGoals: [item, ...current.savingsGoals] })); event.currentTarget.reset(); }
  function addRule(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const keyword = String(data.get("keyword") || "").trim(); if (!keyword) return; const item: CategoryRule = { id: id(), keyword, category: String(data.get("category") || "Lainnya") }; update((current) => ({ ...current, categoryRules: [item, ...current.categoryRules] })); event.currentTarget.reset(); }
  function addWeekly(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const category = String(data.get("category") || "Makanan"); const limit = Math.round(Number(data.get("limit"))); if (limit < 0) return; update((current) => ({ ...current, weeklyBudgets: [...current.weeklyBudgets.filter((item) => item.category !== category), { category, limit }] })); event.currentTarget.reset(); }
  function splitTransaction(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const total = Math.round(Number(data.get("total"))); const first = Math.round(Number(data.get("firstAmount"))); const second = Math.round(Number(data.get("secondAmount"))); if (!title || total <= 0 || first <= 0 || second <= 0 || first + second !== total) { confirm({ tone: "amber", title: "Nominal belum seimbang", message: "Jumlah kedua bagian harus sama dengan total transaksi. Periksa lagi nominalnya, ya.", hideCancel: true, confirmLabel: "Mengerti", onConfirm: () => {} }); return; } const group = id(); const date = String(data.get("date") || today()); const items: Transaction[] = [{ id: id(), title: `${title} (1/2)`, category: String(data.get("firstCategory") || "Makanan") as Transaction["category"], type: "expense", amount: first, date, splitGroupId: group }, { id: id(), title: `${title} (2/2)`, category: String(data.get("secondCategory") || "Lainnya") as Transaction["category"], type: "expense", amount: second, date, splitGroupId: group }]; onAddTransactions(items); event.currentTarget.reset(); }
  const categorySpend = useMemo(() => {
    const result = new Map<string, number>();
    for (const item of transactions.filter((transaction) => transaction.type === "expense" && transaction.date.slice(0, 7) === month)) result.set(item.category, (result.get(item.category) ?? 0) + item.amount);
    return [...result.entries()].sort((a, b) => b[1] - a[1]);
  }, [transactions, month]);
  const netWorthHistory = useMemo(() => {
    const [year, monthNumber] = today().split("-").map(Number);
    return Array.from({ length: 6 }, (_, index) => {
      const offset = 5 - index;
      const monthStartDate = new Date(Date.UTC(year, monthNumber - 1 - offset, 1));
      const monthEndDate = new Date(Date.UTC(year, monthNumber - offset, 0));
      const monthStart = `${monthStartDate.getUTCFullYear()}-${String(monthStartDate.getUTCMonth()+1).padStart(2,"0")}-01`;
      const monthEnd = offset === 0 ? today() : monthEndDate.toISOString().slice(0, 10);
      const amount = finance.wallets.reduce((sum, wallet) => sum + walletBalanceAt(wallet, monthEnd), 0);
      return { month: monthStart, monthEnd, amount };
    });
  }, [finance.wallets, walletBalanceAt]);
  const heatmapDays = useMemo(() => {
    const values: Array<{ date: string; amount: number }> = [];
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
    const partsToISO = (date: Date) => {
      const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
      return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const base = new Date();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date(base);
      date.setDate(date.getDate() - offset);
      const iso = partsToISO(date);
      const amount = transactions.filter((item) => item.type === "expense" && item.date === iso).reduce((sum, item) => sum + item.amount, 0);
      values.push({ date: iso, amount });
    }
    return values;
  }, [transactions]);
  const maxDailySpend = Math.max(1, ...heatmapDays.map((item) => item.amount));
  const todaysTransactions = transactions.filter((item) => item.date === today());
  const todayIncome = todaysTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const todayExpense = todaysTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const weeklyExpense = heatmapDays.slice(-7).reduce((sum, item) => sum + item.amount, 0);
  // ── Turunan presentasi untuk redesain PEDOMAN UI (v2) ──
  const totalWalletBalance = finance.wallets.reduce((sum, wallet) => sum + walletBalance(wallet), 0);
  const totalSaved = finance.savingsGoals.reduce((sum, goal) => sum + goal.savedAmount, 0);
  const savingsTargetTotal = finance.savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const savingsProgress = savingsTargetTotal ? Math.round(totalSaved / savingsTargetTotal * 100) : 0;
  const currentNetWorth = netWorthHistory.length ? netWorthHistory[netWorthHistory.length - 1].amount : 0;
  const previousNetWorth = netWorthHistory.length > 1 ? netWorthHistory[netWorthHistory.length - 2].amount : 0;
  const netWorthDelta = previousNetWorth > 0 ? Math.round((currentNetWorth - previousNetWorth) / previousNetWorth * 100) : null;
  const walletTile = (type: Wallet["type"]) => type === "cash" ? "is-peach" : type === "bank" ? "is-leaf" : type === "e-wallet" ? "is-amber" : "is-cream";
  const walletIcon = (type: Wallet["type"]) => type === "cash" ? <Banknote size={19} /> : type === "bank" ? <Landmark size={19} /> : type === "e-wallet" ? <WalletGlyph size={19} /> : <CircleDollarSign size={19} />;

  return <section className="finx" aria-label="Keuangan lanjutan">
    <div className="finx-hero">
      <span className="finx-hero-blob a" aria-hidden="true" />
      <span className="finx-hero-blob b" aria-hidden="true" />
      <svg className="finx-hero-art" viewBox="0 0 96 96" aria-hidden="true" fill="none">
        <rect x="14" y="40" width="68" height="34" rx="12" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.55)" strokeWidth="2.4" />
        <path d="M14 54h30a6 6 0 0 0 6-6v-2" stroke="rgba(255,255,255,.55)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M82 57h8" stroke="rgba(255,255,255,.55)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M50 40V27" stroke="rgba(255,255,255,.75)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M50 31c-8-2-12-7-12-13 8 0 12 5 12 13z" fill="#EAF3E2" />
        <path d="M50 28c8-3 11-8 11-14-8 0-11 5-11 14z" fill="#CDE3C4" />
      </svg>
      <div className="finx-hero-copy">
        <small>TOTAL SALDO SEMUA DOMPET</small>
        <strong>{formatCompactRupiah(totalWalletBalance)}</strong>
        <div className="finx-hero-meta">{finance.wallets.length} dompet aktif · diperbarui hari ini</div>
        {netWorthDelta !== null && Math.abs(netWorthDelta) >= 1 && <div className={`finx-trend ${netWorthDelta >= 0 ? "up" : "down"}`}>{netWorthDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{netWorthDelta >= 0 ? "+" : ""}{netWorthDelta}% vs bulan lalu</div>}
      </div>
    </div>

    <div className="finx-stats">
      <div className="finx-stat">
        <span className="finx-stat-icon is-amber" aria-hidden="true"><TrendingUp size={20} /></span>
        <div className="finx-stat-copy"><small>PROYEKSI PENGELUARAN</small><strong>{formatCompactRupiah(projection)}</strong><span>Estimasi akhir bulan</span></div>
      </div>
      <div className="finx-stat">
        <span className="finx-stat-icon is-peach" aria-hidden="true"><PiggyBank size={20} /></span>
        <div className="finx-stat-copy"><small>TABUNGAN TERKUMPUL</small><strong>{formatCompactRupiah(totalSaved)}</strong><span>{finance.savingsGoals.length} target · {savingsProgress}% tercapai</span></div>
      </div>
      <div className="finx-stat">
        <span className="finx-stat-icon is-leaf" aria-hidden="true"><WalletGlyph size={20} /></span>
        <div className="finx-stat-copy"><small>PENGELUARAN 7 HARI</small><strong>{formatCompactRupiah(weeklyExpense)}</strong><span>Minggu berjalan</span></div>
      </div>
    </div>

    <div className="finx-tabs" role="tablist" aria-label="Fitur keuangan lanjutan">
      {([{ id: "wallets", label: "Dompet" }, { id: "transfers", label: "Transfer" }, { id: "recurring", label: "Berulang" }, { id: "savings", label: "Tabungan" }, { id: "rules", label: "Aturan" }, { id: "split", label: "Split" }, { id: "weekly", label: "Budget mingguan" }] as const).map((item) => (
        <button key={item.id} type="button" role="tab" className={`finx-tab ${tab === item.id ? "active" : ""}`} aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
      ))}
    </div>

    {tab === "wallets" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addWallet}>
        <div className="finx-card-title"><strong>Buat dompet baru</strong><small>Sumber dana untuk saldo dan transfer</small></div>
        <Field label="Nama dompet"><input className={field} name="name" required placeholder="Tunai, BCA, GoPay" /></Field>
        <Field label="Jenis"><ThemedSelect className={field} name="type"><option value="cash">Tunai</option><option value="bank">Bank</option><option value="e-wallet">E-wallet</option><option value="other">Lainnya</option></ThemedSelect></Field>
        <Field label="Saldo awal (Rp)"><input className={field} name="balance" type="number" min="0" step="1" inputMode="numeric" defaultValue="0" /></Field>
        <PrimaryButton type="submit"><Plus size={15} /> Tambah dompet</PrimaryButton>
      </form>
      <div className="finx-list-card finx-wallet-list-card">
        <div className="finx-card-title"><strong>Dompet kamu</strong><small>{finance.wallets.length} dompet</small></div>
        {finance.wallets.length ? <div className="finx-rows finx-wallet-rows">{finance.wallets.map((wallet) => { const balance = walletBalance(wallet); return (
          <article className="finx-row finx-wallet-row" key={wallet.id}>
            <span className={`finx-row-icon ${walletTile(wallet.type)}`} aria-hidden="true">{walletIcon(wallet.type)}</span>
            <div className="finx-row-copy"><strong>{wallet.name}</strong><small>{WALLET_TYPE_LABELS[wallet.type] ?? wallet.type}</small></div>
            <div className="finx-row-side">
              <strong className={`finx-row-value ${balance < 0 ? "is-negative" : ""}`}>{formatCompactRupiah(balance)}</strong>
              <button className="finx-delete" onClick={() => confirmRemove(`dompet "${wallet.name}"`, () => update((current) => ({ ...current, wallets: remove(current.wallets, wallet.id) })))} aria-label={`Hapus ${wallet.name}`}><Trash2 size={15} /></button>
            </div>
          </article>); })}</div> : <NoData>Tambahkan dompet untuk mencatat saldo dan transfer antar sumber dana.</NoData>}
      </div>
    </div>}

    {tab === "transfers" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addTransfer}>
        <div className="finx-card-title"><strong>Catat transfer</strong><small>Pindahkan dana antar dompet</small></div>
        <Field label="Dari"><ThemedSelect className={field} name="from">{finance.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</ThemedSelect></Field>
        <Field label="Ke"><ThemedSelect className={field} name="to">{finance.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</ThemedSelect></Field>
        <Field label="Nominal (Rp)"><input className={field} name="amount" type="number" min="1" step="1" inputMode="numeric" required /></Field>
        <Field label="Tanggal"><input className={field} name="date" type="date" max={today()} defaultValue={today()} /></Field>
        <Field label="Catatan"><input className={field} name="note" maxLength={120} /></Field>
        <PrimaryButton type="submit" disabled={finance.wallets.length < 2}><ArrowRightLeft size={15} /> Simpan transfer</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Riwayat transfer</strong><small>{finance.transfers.length} transfer tersimpan</small></div>
        {finance.transfers.length ? <div className="finx-rows">{finance.transfers.map((item) => (
          <article className="finx-row" key={item.id}>
            <span className="finx-row-icon is-leaf" aria-hidden="true"><ArrowRightLeft size={19} /></span>
            <div className="finx-row-copy"><strong>{finance.wallets.find((wallet) => wallet.id === item.fromWalletId)?.name || "Dompet dihapus"} → {finance.wallets.find((wallet) => wallet.id === item.toWalletId)?.name || "Dompet dihapus"}</strong><small>{formatDate(item.date)}{item.note ? ` · ${item.note}` : ""}</small></div>
            <div className="finx-row-side">
              <strong className="finx-row-value">{formatCompactRupiah(item.amount)}</strong>
              <button className="finx-delete" onClick={() => confirmRemove("transfer ini", () => update((current) => ({ ...current, transfers: remove(current.transfers, item.id) })))} aria-label="Hapus transfer"><Trash2 size={15} /></button>
            </div>
          </article>))}</div> : <NoData>Belum ada transfer tersimpan.</NoData>}
      </div>
    </div>}

    {tab === "recurring" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addRecurring}>
        <div className="finx-card-title"><strong>Jadwalkan transaksi berulang</strong><small>Tagihan dan gaji otomatis tercatat</small></div>
        <Field label="Nama transaksi berulang"><input className={field} name="title" required maxLength={100} /></Field>
        <div className="form-two-columns"><Field label="Jenis"><ThemedSelect className={field} name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></ThemedSelect></Field><Field label="Kategori"><ThemedSelect className={field} name="category"><option value="Tagihan">Tagihan</option><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Lifestyle">Lifestyle</option><option value="Kesehatan">Kesehatan</option><option value="Gaji">Gaji</option><option value="Freelance">Freelance</option><option value="Lainnya">Lainnya</option></ThemedSelect></Field></div>
        <Field label="Nominal (Rp)"><input className={field} name="amount" type="number" min="1" step="1" inputMode="numeric" required /></Field>
        <div className="form-two-columns"><Field label="Frekuensi"><ThemedSelect className={field} name="frequency"><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option></ThemedSelect></Field><Field label="Tanggal berikutnya"><input className={field} name="nextDate" type="date" min={today()} defaultValue={today()} /></Field></div>
        <PrimaryButton type="submit"><Plus size={15} /> Jadwalkan transaksi</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Transaksi berulang</strong><small>{finance.recurring.length} jadwal tersimpan</small></div>
        {finance.recurring.length ? <div className="finx-rows">{finance.recurring.map((item) => (
          <article className="finx-row" key={item.id}>
            <span className="finx-row-icon is-peach" aria-hidden="true"><Repeat size={19} /></span>
            <div className="finx-row-copy"><strong>{item.title}</strong><small>{item.category} · {item.frequency === "weekly" ? "Mingguan" : item.frequency === "yearly" ? "Tahunan" : "Bulanan"} · {formatDate(item.nextDate)}</small></div>
            <div className="finx-row-side">
              <span className={`finx-badge ${item.active ? (item.nextDate <= today() ? "due" : "up") : "paused"}`}>{item.active ? (item.nextDate <= today() ? "Jatuh tempo" : "Aktif") : "Dijeda"}</span>
              <strong className="finx-row-value">{formatCompactRupiah(item.amount)}</strong>
              <div className="finx-row-buttons">
                <button className={secondary} disabled={!item.active || item.nextDate > today()} onClick={() => {
                  onAddTransactions([{ id: id(), title: item.title, category: item.category as Transaction["category"], type: item.type, amount: item.amount, date: item.nextDate }]);
                  const next = new Date(`${item.nextDate}T00:00:00Z`);
                  if (item.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
                  else if (item.frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
                  else next.setUTCFullYear(next.getUTCFullYear() + 1);
                  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,"0")}-${String(next.getUTCDate()).padStart(2,"0")}`;
                  update((current) => ({ ...current, recurring: current.recurring.map((entry) => entry.id === item.id ? { ...entry, nextDate } : entry) }));
                }}>Catat transaksi</button>
                <button className={secondary} onClick={() => update((current) => ({ ...current, recurring: current.recurring.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry) }))}>{item.active ? "Jeda" : "Aktifkan"}</button>
                <button className="finx-delete" onClick={() => confirmRemove(`transaksi berulang "${item.title}"`, () => update((current) => ({ ...current, recurring: remove(current.recurring, item.id) })))} aria-label={`Hapus ${item.title}`}><Trash2 size={15} /></button>
              </div>
            </div>
          </article>))}</div> : <NoData>Belum ada transaksi berulang tersimpan.</NoData>}
      </div>
    </div>}

    {tab === "savings" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addSavings}>
        <div className="finx-card-title"><strong>Buat target tabungan</strong><small>Menabung tumbuh sedikit demi sedikit</small></div>
        <Field label="Nama tujuan tabungan"><input className={field} name="title" required maxLength={100} /></Field>
        <div className="form-two-columns"><Field label="Target (Rp)"><input className={field} name="target" type="number" min="1" step="1" inputMode="numeric" required /></Field><Field label="Sudah terkumpul (Rp)"><input className={field} name="saved" type="number" min="0" step="1" inputMode="numeric" defaultValue="0" /></Field></div>
        <Field label="Tenggat"><input className={field} name="dueDate" type="date" min={today()} /></Field>
        <PrimaryButton type="submit"><Plus size={15} /> Buat target</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Target tabungan</strong><small>{finance.savingsGoals.length} target · {savingsProgress}% terkumpul</small></div>
        {finance.savingsGoals.length ? <div className="finx-rows">{finance.savingsGoals.map((goal) => { const progress = Math.min(100, goal.savedAmount / goal.targetAmount * 100); return (
          <article className="finx-row" key={goal.id}>
            <span className="finx-row-icon is-leaf" aria-hidden="true"><Target size={19} /></span>
            <div className="finx-row-copy">
              <strong>{goal.title}</strong>
              <small>{formatCompactRupiah(goal.savedAmount)} / {formatCompactRupiah(goal.targetAmount)}{goal.dueDate ? ` · tenggat ${formatDate(goal.dueDate)}` : ""}</small>
              <div className="finx-bar"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="finx-row-side">
              <span className="finx-badge up">{Math.round(progress)}%</span>
              <div className="finx-row-buttons">
                <button className={secondary} onClick={() => confirm({ tone: "leaf", title: "Tambah dana", subject: goal.title, message: `Sudah terkumpul ${formatCompactRupiah(goal.savedAmount)} dari ${formatCompactRupiah(goal.targetAmount)}. Masukkan nominal yang ingin ditambahkan.`, confirmLabel: "Simpan", prompt: { label: "Nominal tambahan", placeholder: "50000", inputMode: "numeric", prefix: "Rp" }, validate: (value) => { const amount = Number((value || "").replace(/[^\d]/g, "")); return Number.isFinite(amount) && amount > 0 ? undefined : "Nominal harus berupa angka lebih dari Rp0."; }, onConfirm: (value) => { const amount = Number((value || "").replace(/[^\d]/g, "")); if (amount > 0) update((current) => ({ ...current, savingsGoals: current.savingsGoals.map((item) => item.id === goal.id ? { ...item, savedAmount: item.savedAmount + Math.round(amount) } : item) })); } })}>Tambah dana</button>
                <button className="finx-delete" onClick={() => confirmRemove(`target tabungan "${goal.title}"`, () => update((current) => ({ ...current, savingsGoals: remove(current.savingsGoals, goal.id) })))} aria-label={`Hapus target ${goal.title}`}><Trash2 size={15} /></button>
              </div>
            </div>
          </article>); })}</div> : <NoData>Belum ada target tabungan tersimpan.</NoData>}
      </div>
    </div>}

    {tab === "rules" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addRule}>
        <div className="finx-card-title"><strong>Aturan kategori otomatis</strong><small>Kata kunci transaksi dipetakan ke kategori</small></div>
        <Field label="Kata kunci transaksi"><input className={field} name="keyword" required maxLength={60} placeholder="Contoh: Starbucks" /></Field>
        <Field label="Kategori otomatis"><ThemedSelect className={field} name="category"><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Tagihan">Tagihan</option><option value="Lifestyle">Lifestyle</option><option value="Kesehatan">Kesehatan</option><option value="Gaji">Gaji</option><option value="Freelance">Freelance</option><option value="Lainnya">Lainnya</option></ThemedSelect></Field>
        <PrimaryButton type="submit"><Plus size={15} /> Tambah aturan</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Aturan aktif</strong><small>{finance.categoryRules.length} aturan tersimpan</small></div>
        {finance.categoryRules.length ? <div className="finx-rows">{finance.categoryRules.map((rule) => (
          <article className="finx-row" key={rule.id}>
            <span className="finx-row-icon is-cream" aria-hidden="true"><ListFilter size={19} /></span>
            <div className="finx-row-copy"><strong>{rule.keyword}</strong><small>Setiap transaksi berisi kata ini → <b>{rule.category}</b></small></div>
            <div className="finx-row-side">
              <button className="finx-delete" onClick={() => confirmRemove(`aturan "${rule.keyword}"`, () => update((current) => ({ ...current, categoryRules: remove(current.categoryRules, rule.id) })))} aria-label={`Hapus aturan ${rule.keyword}`}><Trash2 size={15} /></button>
            </div>
          </article>))}</div> : <NoData>Belum ada aturan kategori tersimpan.</NoData>}
      </div>
    </div>}

    {tab === "split" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={splitTransaction}>
        <div className="finx-card-title"><strong>Pisahkan transaksi</strong><small>Satu belanja, dua kategori</small></div>
        <Field label="Nama transaksi"><input className={field} name="title" required maxLength={100} placeholder="Belanja bersama" /></Field>
        <Field label="Total nominal (Rp)"><input className={field} name="total" type="number" min="1" step="1" inputMode="numeric" required /></Field>
        <Field label="Tanggal"><input className={field} name="date" type="date" max={today()} defaultValue={today()} /></Field>
        <div className="form-two-columns"><Field label="Bagian 1 · kategori"><ThemedSelect className={field} name="firstCategory"><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Tagihan">Tagihan</option><option value="Lifestyle">Lifestyle</option><option value="Lainnya">Lainnya</option></ThemedSelect></Field><Field label="Bagian 1 · nominal"><input className={field} name="firstAmount" type="number" min="1" step="1" inputMode="numeric" required /></Field></div>
        <div className="form-two-columns"><Field label="Bagian 2 · kategori"><ThemedSelect className={field} name="secondCategory"><option value="Lifestyle">Lifestyle</option><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Tagihan">Tagihan</option><option value="Lainnya">Lainnya</option></ThemedSelect></Field><Field label="Bagian 2 · nominal"><input className={field} name="secondAmount" type="number" min="1" step="1" inputMode="numeric" required /></Field></div>
        <PrimaryButton type="submit"><Plus size={15} /> Simpan transaksi split</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Cara kerja split</strong><small>Dua baris, satu ID split</small></div>
        <div className="finx-rows">
          <div className="finx-legend-row"><i className="finx-legend-dot is-income" /><span>Bagian 1 masuk kategori pertama</span></div>
          <div className="finx-legend-row"><i className="finx-legend-dot is-expense" /><span>Bagian 2 masuk kategori kedua</span></div>
        </div>
        <p className="finx-note">Transaksi akan dibuat sebagai dua baris pengeluaran yang terhubung oleh satu ID split. Total kedua bagian harus sama dengan total transaksi.</p>
      </div>
    </div>}

    {tab === "weekly" && <div className="finx-panel">
      <form className="finx-form-card" noValidate onSubmit={addWeekly}>
        <div className="finx-card-title"><strong>Budget mingguan</strong><small>Batas 7 hari per kategori</small></div>
        <Field label="Kategori"><ThemedSelect className={field} name="category"><option value="Makanan">Makanan</option><option value="Transportasi">Transportasi</option><option value="Tagihan">Tagihan</option><option value="Lifestyle">Lifestyle</option><option value="Kesehatan">Kesehatan</option><option value="Lainnya">Lainnya</option></ThemedSelect></Field>
        <Field label="Batas 7 hari (Rp)"><input className={field} name="limit" type="number" min="0" step="1" inputMode="numeric" required /></Field>
        <PrimaryButton type="submit"><Plus size={15} /> Simpan budget mingguan</PrimaryButton>
      </form>
      <div className="finx-list-card">
        <div className="finx-card-title"><strong>Budget aktif</strong><small>{finance.weeklyBudgets.length} kategori dibatasi</small></div>
        {finance.weeklyBudgets.length ? <div className="finx-rows">{finance.weeklyBudgets.map((budget) => { const start = shiftISODate(today(), -6); const spent = transactions.filter((item) => item.type === "expense" && item.category === budget.category && item.date >= start && item.date <= today()).reduce((sum, item) => sum + item.amount, 0); const percent = budget.limit ? Math.round(spent / budget.limit * 100) : (spent ? 100 : 0); return (
          <article className="finx-row" key={budget.category}>
            <span className="finx-row-icon is-amber" aria-hidden="true"><CalendarClock size={19} /></span>
            <div className="finx-row-copy">
              <strong>{budget.category}</strong>
              <small>{formatCompactRupiah(spent)} / {formatCompactRupiah(budget.limit)} · 7 hari terakhir</small>
              <div className={`finx-bar ${percent > 100 ? "is-over" : ""}`}><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
            </div>
            <div className="finx-row-side">
              <span className={`finx-badge ${percent > 100 ? "due" : "up"}`}>{percent > 100 ? `Lewat ${percent - 100}%` : `${percent}%`}</span>
              <button className="finx-delete" onClick={() => confirmRemove(`budget mingguan ${budget.category}`, () => update((current) => ({ ...current, weeklyBudgets: current.weeklyBudgets.filter((item) => item.category !== budget.category) })))} aria-label={`Hapus budget ${budget.category}`}><Trash2 size={15} /></button>
            </div>
          </article>); })}</div> : <NoData>Belum ada budget mingguan tersimpan.</NoData>}
      </div>
    </div>}

    <div className="finx-list-card finx-recap">
      <SectionHeading title="Rekap harian" caption="Pergerakan transaksi dan pengeluaran dalam 7 hari terakhir" />
      <div className="finx-rows">
        <div className="finx-legend-row"><i className="finx-legend-dot is-income" /><span>Pemasukan hari ini</span><strong className="is-income">{formatCompactRupiah(todayIncome)}</strong></div>
        <div className="finx-legend-row"><i className="finx-legend-dot is-expense" /><span>Pengeluaran hari ini</span><strong className="is-expense">{formatCompactRupiah(todayExpense)}</strong></div>
        <div className="finx-legend-row"><i className="finx-legend-dot is-amber" /><span>Pengeluaran 7 hari</span><strong>{formatCompactRupiah(weeklyExpense)}</strong></div>
      </div>
    </div>

    <div className="finx-list-card finx-heat">
      <SectionHeading title="Spending heatmap" caption="Intensitas pengeluaran harian selama 30 hari terakhir" />
      <div className="finx-heat-grid">{heatmapDays.map((item) => <div key={item.date} className="finx-heat-cell" title={`${formatDate(item.date)} · ${formatCompactRupiah(item.amount)}`} aria-label={`${formatDate(item.date)} pengeluaran ${formatCompactRupiah(item.amount)}`} style={{ opacity: item.amount === 0 ? .16 : .25 + item.amount / maxDailySpend * .75 }} />)}</div>
      <div className="finx-heat-legend"><span>Lebih rendah</span><i /><i /><i /><i /><span>Lebih tinggi</span></div>
    </div>

    <div className="finx-list-card finx-history">
      <SectionHeading title="Riwayat saldo bersih" caption="Dihitung dari saldo awal, transaksi dan transfer yang ditautkan ke dompet; bukan snapshot manual." />
      {finance.wallets.length ? <div className="finx-history-chart">{netWorthHistory.map((item) => { const max = Math.max(1, ...netWorthHistory.map((entry) => Math.abs(entry.amount))); const label = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(`${item.month}T00:00:00`)); return (
        <div className="finx-history-column" key={item.month} title={`${formatDate(item.monthEnd)} · ${formatCompactRupiah(item.amount)}`}><strong>{formatCompactRupiah(item.amount)}</strong><div><span style={{ height: `${Math.max(4, Math.abs(item.amount) / max * 100)}%` }} /></div><small>{label}</small></div>); })}</div> : <p className="finx-note">Tambahkan dompet dan tautkan transaksi untuk membangun riwayat saldo.</p>}
    </div>

    <div className="finx-list-card finx-explore">
      <SectionHeading title="Eksplorasi kategori" caption="Akumulasi pengeluaran pada bulan berjalan" />
      {categorySpend.length ? <div className="finx-rows">{categorySpend.map(([category, amount], index) => (
        <div className="finx-legend-row" key={category}><i className="finx-legend-dot" style={{ background: `var(--spend-color-${index % 8})` }} /><span>{category}</span><strong>{formatCompactRupiah(amount)}</strong></div>))}</div> : <p className="finx-note">Belum ada pengeluaran bulan ini.</p>}
    </div>
  </section>;
}

async function compressPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = document.createElement("img"); element.onload = () => resolve(element); element.onerror = () => reject(new Error("Gambar tidak dapat dibuka.")); element.src = url;
    });
    const scale = Math.min(1, 480 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Browser tidak mendukung kompresi foto.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = .62; let data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 260_000 && quality > .3) { quality -= .08; data = canvas.toDataURL("image/jpeg", quality); }
    return data;
  } finally { URL.revokeObjectURL(url); }
}
