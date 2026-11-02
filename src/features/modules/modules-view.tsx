"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowRightLeft, Check, ImagePlus, Plus, Sprout, Trash2, X } from "lucide-react";
import { EmptyState, PageIntro, PrimaryButton, SectionHeading } from "@/components/ui/primitives";
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span className="form-label">{label}</span>{children}</label>;
}
function Panel({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return <section className="card card-pad"><SectionHeading title={title} caption={caption} /><div className="module-card-body">{children}</div></section>;
}
function Intro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <PageIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />;
}
function Metric({ label, value, foot }: { label: string; value: string; foot: string }) {
  return <div className="stat-card"><div className="small-label">{label}</div><div className="metric-value">{value}</div><div className="stat-foot">{foot}</div></div>;
}
function NoData({ children }: { children: string }) {
  return <div className="module-empty"><Sprout size={20} /><p>{children}</p></div>;
}

export function ModulesView({ tab, modules, updateModule }: {
  tab: "goals" | "checkin" | "work" | "wellness" | "training" | "tree";
  modules: WorkspaceModules; updateModule: UpdateWorkspaceModule;
}) {
  if (tab === "goals") return <GoalsView modules={modules} updateModule={updateModule} />;
  if (tab === "checkin") return <CheckinView modules={modules} updateModule={updateModule} />;
  if (tab === "work") return <WorkView modules={modules} updateModule={updateModule} />;
  if (tab === "wellness") return <WellnessView modules={modules} updateModule={updateModule} />;
  if (tab === "training") return <TrainingView modules={modules} updateModule={updateModule} />;
  return <TreeView modules={modules} />;
}

function GoalsView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
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
  }
  const active = modules.goals.filter((goal) => !goal.completed).length;
  const completed = modules.goals.length - active;
  const steps = modules.goals.reduce((sum, goal) => sum + goal.milestones.length, 0);
  const doneSteps = modules.goals.reduce((sum, goal) => sum + goal.milestones.filter((step) => step.completed).length, 0);
  return <>
    <Intro eyebrow="GOALS & MILESTONES" title="Ubah niat menjadi progres." subtitle="Pecah tujuan besar menjadi langkah yang bisa diselesaikan satu per satu." />
    <div className="module-metrics"><Metric label="TUJUAN AKTIF" value={String(active)} foot="Masih berjalan" /><Metric label="TUJUAN SELESAI" value={String(completed)} foot="Sudah dicapai" /><Metric label="MILESTONES" value={`${doneSteps}/${steps}`} foot="Langkah diselesaikan" /></div>
    <div className="module-two-col">
      <Panel title="Tujuan baru" caption="Tuliskan hasil yang ingin dicapai dan milestone-nya">
        <form className="form-grid" onSubmit={submit}>
          <Field label="Nama tujuan"><input className={field} name="title" maxLength={100} required placeholder="Contoh: Menyelesaikan sertifikasi" /></Field>
          <Field label="Deskripsi"><textarea className={field} name="description" rows={2} placeholder="Mengapa tujuan ini penting?" /></Field>
          <div className="form-two-columns">
            <Field label="Kategori"><select className={field} name="category"><option>Personal</option><option>Health</option><option>Learning</option><option>Finance</option><option>Career</option></select></Field>
            <Field label="Tenggat"><input className={field} name="dueDate" type="date" /></Field>
          </div>
          <Field label="Milestones (satu per baris)"><textarea className={field} name="milestones" rows={3} placeholder={"Riset langkah pertama\nSelesaikan bagian awal\nEvaluasi hasil"} /></Field>
          <PrimaryButton type="submit"><Plus size={15} /> Simpan tujuan</PrimaryButton>
        </form>
      </Panel>
      <Panel title="Daftar tujuan" caption={`${modules.goals.length} tujuan tersimpan`}>
        {modules.goals.length ? <div className="module-list">{modules.goals.map((goal) => {
          const done = goal.milestones.filter((step) => step.completed).length;
          const progress = goal.milestones.length ? Math.round(done / goal.milestones.length * 100) : (goal.completed ? 100 : 0);
          return <article className="module-item" key={goal.id}>
            <div className="module-item-top"><div><span className="module-tag">{goal.category}</span><h3>{goal.title}</h3><p>{goal.description || "Tidak ada deskripsi."}</p></div><button className="module-icon-action danger" onClick={() => updateModule("goals", (items) => remove(items, goal.id))} aria-label={`Hapus tujuan ${goal.title}`}><Trash2 size={15} /></button></div>
            {goal.dueDate && <small className="module-muted">Tenggat {formatDate(goal.dueDate)}</small>}
            <div className="module-progress-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="module-inline-meta"><small>{done}/{goal.milestones.length} milestone · {progress}%</small><button className={secondary} onClick={() => updateModule("goals", (items) => items.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))}>{goal.completed ? "Buka kembali" : "Tandai selesai"}</button></div>
            {goal.milestones.map((step) => <label className="module-check-row" key={step.id}><input type="checkbox" checked={step.completed} onChange={(event) => updateModule("goals", (items) => items.map((item) => item.id === goal.id ? { ...item, milestones: item.milestones.map((part) => part.id === step.id ? { ...part, completed: event.target.checked } : part) } : item))} /><span className={step.completed ? "is-done" : ""}>{step.title}</span></label>)}
          </article>;
        })}</div> : <NoData>Belum ada tujuan. Mulai dengan satu hasil yang ingin kamu capai.</NoData>}
      </Panel>
    </div>
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
  }
  return <>
    <Intro eyebrow="DAILY CHECK-IN & JOURNAL" title="Periksa keadaan dirimu." subtitle="Catat suasana hati, energi, tidur, dan hal yang ingin kamu ingat hari ini." />
    <div className="module-two-col">
      <Panel title="Check-in hari ini" caption={current ? "Perbarui catatanmu bila diperlukan." : "Tidak perlu sempurna. Catat apa adanya."}>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-two-columns">
            <Field label="Mood (1–5)"><select className={field} name="mood" defaultValue={String(current?.mood ?? 3)}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} · {["","Sangat berat","Kurang baik","Biasa","Baik","Sangat baik"][n]}</option>)}</select></Field>
            <Field label="Energi (1–5)"><select className={field} name="energy" defaultValue={String(current?.energy ?? 3)}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} · {["","Sangat rendah","Rendah","Cukup","Tinggi","Sangat tinggi"][n]}</option>)}</select></Field>
          </div>
          <Field label="Durasi tidur (jam)"><input className={field} name="sleep" type="number" min="0" max="24" step=".5" defaultValue={current?.sleepHours ?? 7} /></Field>
          <Field label="Jurnal singkat"><textarea className={field} name="notes" rows={6} defaultValue={current?.notes ?? ""} placeholder="Apa yang berjalan baik? Apa yang terasa berat?" /></Field>
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
    const item: WorkRoutine = { id: id(), title, description: String(data.get("description") || ""), frequency: String(data.get("frequency") || "Harian"), lastDone: "" };
    updateModule("routines", (items) => [item, ...items]); event.currentTarget.reset();
  }
  const taskList = modules.tasks.filter((item) => status === "all" || item.status === status);
  return <>
    <Intro eyebrow="PERSONAL WORKSPACE" title="Ruang untuk menyelesaikan sesuatu." subtitle="Kelola tugas, rutinitas kerja, dan catatan dalam satu tempat." />
    <div className="module-tabs"><button className={section === "tasks" ? "active" : ""} onClick={() => setSection("tasks")}>Task board <span>{modules.tasks.length}</span></button><button className={section === "notes" ? "active" : ""} onClick={() => setSection("notes")}>Catatan <span>{modules.notes.length}</span></button><button className={section === "routines" ? "active" : ""} onClick={() => setSection("routines")}>Rutinitas <span>{modules.routines.length}</span></button></div>
    {section === "tasks" && <div className="module-two-col">
      <Panel title="Tugas baru" caption="Simpan tindakan yang jelas dan bisa diselesaikan"><form className="form-grid" onSubmit={addTask}><Field label="Nama tugas"><input className={field} name="title" required maxLength={120} placeholder="Apa yang perlu diselesaikan?" /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} /></Field><div className="form-two-columns"><Field label="Prioritas"><select className={field} name="priority"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select></Field><Field label="Tenggat"><input className={field} name="dueDate" type="date" /></Field></div><PrimaryButton type="submit"><Plus size={15} /> Tambah tugas</PrimaryButton></form></Panel>
      <Panel title="Task board" caption={`${modules.tasks.filter((task) => task.status === "done").length} dari ${modules.tasks.length} tugas selesai`}><div className="module-tabs compact">{(["all", "todo", "doing", "done"] as const).map((value) => <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value === "all" ? "Semua" : value === "todo" ? "To do" : value === "doing" ? "Berjalan" : "Selesai"}</button>)}</div>{taskList.length ? <div className="module-list">{taskList.map((task) => <article className="module-item" key={task.id}><div className="module-item-top"><div><span className={`module-priority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}</div><button className="module-icon-action danger" onClick={() => updateModule("tasks", (items) => remove(items, task.id))} aria-label={`Hapus tugas ${task.title}`}><Trash2 size={15} /></button></div><div className="module-inline-meta"><small>{task.dueDate ? formatDate(task.dueDate) : "Tanpa tenggat"}</small><select className="module-status-select" value={task.status} onChange={(event) => updateModule("tasks", (items) => items.map((item) => item.id === task.id ? { ...item, status: event.target.value as TaskStatus } : item))}><option value="todo">To do</option><option value="doing">Berjalan</option><option value="done">Selesai</option></select></div></article>)}</div> : <NoData>Tidak ada tugas pada filter ini.</NoData>}</Panel>
    </div>}
    {section === "notes" && <div className="module-two-col"><Panel title="Catatan baru" caption="Simpan ide, referensi, atau ringkasan"><form className="form-grid" onSubmit={addNote}><Field label="Judul"><input className={field} name="title" required maxLength={100} /></Field><Field label="Isi"><textarea className={field} name="body" rows={6} required /></Field><Field label="Tag (pisahkan dengan koma)"><input className={field} name="tags" placeholder="kerja, ide, referensi" /></Field><PrimaryButton type="submit"><Plus size={15} /> Simpan catatan</PrimaryButton></form></Panel><Panel title="Catatan tersimpan" caption={`${modules.notes.length} catatan`}>{modules.notes.length ? <div className="module-list">{modules.notes.map((note) => <article className="module-item" key={note.id}><div className="module-item-top"><h3>{note.title}</h3><button className="module-icon-action danger" onClick={() => updateModule("notes", (items) => remove(items, note.id))} aria-label={`Hapus catatan ${note.title}`}><Trash2 size={15} /></button></div><p>{note.body}</p><div className="module-chip-row">{note.tags.map((tag) => <span className="module-tag" key={tag}>{tag}</span>)}</div><small className="module-muted">Diperbarui {new Date(note.updatedAt).toLocaleDateString("id-ID")}</small></article>)}</div> : <NoData>Belum ada catatan.</NoData>}</Panel></div>}
    {section === "routines" && <div className="module-two-col"><Panel title="Rutinitas baru" caption="Pekerjaan berulang yang ingin dijaga"><form className="form-grid" onSubmit={addRoutine}><Field label="Nama rutinitas"><input className={field} name="title" required /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} /></Field><Field label="Frekuensi"><select className={field} name="frequency"><option>Harian</option><option>Hari kerja</option><option>Setiap minggu</option><option>Setiap bulan</option></select></Field><PrimaryButton type="submit"><Plus size={15} /> Tambah rutinitas</PrimaryButton></form></Panel><Panel title="Rutinitas tersimpan">{modules.routines.length ? <div className="module-list">{modules.routines.map((item) => <article className="module-item" key={item.id}><div className="module-item-top"><div><h3>{item.title}</h3><p>{item.description}</p><small className="module-muted">{item.frequency}</small></div><button className="module-icon-action danger" onClick={() => updateModule("routines", (items) => remove(items, item.id))} aria-label={`Hapus rutinitas ${item.title}`}><Trash2 size={15} /></button></div><button className={secondary} onClick={() => updateModule("routines", (items) => items.map((routine) => routine.id === item.id ? { ...routine, lastDone: today() } : routine))}>Tandai dilakukan hari ini {item.lastDone === today() ? "✓" : ""}</button></article>)}</div> : <NoData>Belum ada rutinitas kerja.</NoData>}</Panel></div>}
  </>;
}

function WellnessView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const current = modules.wellness.find((item) => item.date === today()) ?? { date: today(), waterMl: 0, proteinGrams: 0, weightKg: null, note: "" };
  const [weight, setWeight] = useState(current.weightKg?.toString() ?? "");
  const [protein, setProtein] = useState(String(current.proteinGrams));
  const [note, setNote] = useState(current.note);
  useEffect(() => { setWeight(current.weightKg?.toString() ?? ""); setProtein(String(current.proteinGrams)); setNote(current.note); }, [current.weightKg, current.proteinGrams, current.note]);
  function save() {
    const next: WellnessEntry = { ...current, weightKg: weight ? Number(weight) : current.weightKg, proteinGrams: Math.max(0, Number(protein) || 0), note };
    updateModule("wellness", (items) => [next, ...items.filter((item) => item.date !== today())].sort((a, b) => b.date.localeCompare(a.date)));
  }
  const weights = modules.wellness.filter((item) => item.weightKg !== null).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  return <>
    <Intro eyebrow="WELLNESS TRACKER" title="Rawat kebutuhan dasarmu." subtitle="Pantau hidrasi, protein, dan perubahan berat badan tanpa menebak-nebak." />
    <div className="module-metrics"><Metric label="AIR HARI INI" value={`${current.waterMl.toLocaleString("id-ID")} ml`} foot="Target awal 2.000 ml" /><Metric label="PROTEIN" value={`${current.proteinGrams} g`} foot={`${Math.round(current.proteinGrams)} gram tercatat`} /><Metric label="BERAT TERAKHIR" value={current.weightKg ? `${current.weightKg} kg` : "—"} foot="Catatan hari ini" /></div>
    <div className="module-two-col"><Panel title="Hidrasi" caption="Tambah setiap kali minum air"><div className="wellness-water-ring"><div><strong>{current.waterMl.toLocaleString("id-ID")}</strong><small>ml hari ini</small></div></div><div className="module-button-row">{[150, 250, 350, 500].map((amount) => <button className={secondary} key={amount} onClick={() => updateModule("wellness", (items) => { const base = items.find((item) => item.date === today()) ?? current; return [{ ...base, waterMl: base.waterMl + amount }, ...items.filter((item) => item.date !== today())]; })}>+{amount} ml</button>)}<button className={secondary} onClick={() => updateModule("wellness", (items) => items.map((item) => item.date === today() ? { ...item, waterMl: Math.max(0, item.waterMl - 250) } : item))}>−250 ml</button></div><div className="module-progress-track"><span style={{ width: `${Math.min(100, current.waterMl / 2000 * 100)}%` }} /></div></Panel><Panel title="Nutrisi & berat badan" caption="Masukkan catatan tubuh hari ini"><div className="form-grid"><Field label="Protein (gram)"><input className={field} type="number" min="0" max="1000" value={protein} onChange={(event) => setProtein(event.target.value)} /></Field><Field label="Berat badan (kg)"><input className={field} type="number" min="1" max="500" step=".1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Contoh: 65.5" /></Field><Field label="Catatan"><textarea className={field} rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></Field><PrimaryButton onClick={save}><Check size={15} /> Simpan data wellness</PrimaryButton></div>{weights.length > 0 && <div className="module-list">{weights.map((item) => <div className="module-inline-meta" key={item.date}><small>{formatDate(item.date)}</small><strong>{item.weightKg} kg</strong></div>)}</div>}</Panel></div>
  </>;
}

function TrainingView({ modules, updateModule }: { modules: WorkspaceModules; updateModule: UpdateWorkspaceModule }) {
  const [seconds, setSeconds] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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
    if (!file.type.startsWith("image/")) { window.alert("Pilih file gambar."); return; }
    if (file.size > 12 * 1024 * 1024) { window.alert("Ukuran foto maksimal 12 MB sebelum kompresi."); return; }
    setPhotoBusy(true);
    try {
      const imageData = await compressPhoto(file);
      if (imageData.length > 280_000) throw new Error("Ukuran foto masih terlalu besar setelah kompresi.");
      const photo: ProgressPhoto = { id: id(), date: today(), label: "Foto progres", note: "", imageData };
      updateModule("progressPhotos", (items) => [photo, ...items].slice(0, 5));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal memproses foto.");
    } finally { setPhotoBusy(false); event.target.value = ""; }
  }
  const totalMinutes = modules.workouts.reduce((sum, item) => sum + item.durationMinutes + item.cardioMinutes, 0);
  const readiness = modules.checkins.find((item) => item.date === today());
  return <>
    <Intro eyebrow="WORKOUT & TRAINING" title="Latihan dengan progres yang tercatat." subtitle="Simpan program, sesi latihan, kardio, foto progres, dan waktu istirahat. Fitur peta otot tidak disertakan." />
    <div className="module-metrics"><Metric label="SESI LATIHAN" value={String(modules.workouts.length)} foot="Seluruh riwayat" /><Metric label="TOTAL DURASI" value={`${totalMinutes} mnt`} foot="Latihan dan kardio" /><Metric label="KESIAPAN HARI INI" value={readiness ? `${Math.round((readiness.mood + readiness.energy) / 10 * 100)}%` : "—"} foot={readiness ? "Dari mood dan energi" : "Isi daily check-in dahulu"} /></div>
    <div className="module-two-col"><Panel title="Catat sesi latihan" caption="Log gerakan, set, repetisi, beban, dan kardio"><form className="form-grid" onSubmit={addWorkout}><Field label="Nama sesi"><input className={field} name="title" defaultValue="Full body" maxLength={80} /></Field><div className="form-two-columns"><Field label="Tanggal"><input className={field} name="date" type="date" defaultValue={today()} /></Field><Field label="Durasi latihan (menit)"><input className={field} name="duration" type="number" min="0" defaultValue="45" /></Field></div><Field label="Nama gerakan"><input className={field} name="exercise" required placeholder="Contoh: Push-up" /></Field><div className="form-three-columns"><Field label="Set"><input className={field} name="sets" type="number" min="1" defaultValue="3" /></Field><Field label="Repetisi"><input className={field} name="reps" type="number" min="1" defaultValue="10" /></Field><Field label="Beban (kg)"><input className={field} name="weight" type="number" min="0" step=".5" defaultValue="0" /></Field></div><Field label="Kardio (menit)"><input className={field} name="cardio" type="number" min="0" defaultValue="0" /></Field><Field label="Catatan"><textarea className={field} name="notes" rows={2} /></Field><PrimaryButton type="submit"><Plus size={15} /> Simpan latihan</PrimaryButton></form></Panel><Panel title="Program latihan" caption="Simpan split latihan mingguan"><form className="form-grid" onSubmit={addProgram}><Field label="Nama program"><input className={field} name="title" required placeholder="Contoh: Strength 3 hari" /></Field><Field label="Hari latihan"><input className={field} name="days" placeholder="Senin, Rabu, Jumat" /></Field><Field label="Deskripsi"><textarea className={field} name="description" rows={2} /></Field><PrimaryButton type="submit"><Plus size={15} /> Buat program</PrimaryButton></form>{modules.programs.map((program) => <article className="module-item" key={program.id}><div className="module-item-top"><div><h3>{program.title} {program.active && <span className="module-tag">Aktif</span>}</h3><p>{program.days} · {program.description}</p></div><button className="module-icon-action danger" onClick={() => updateModule("programs", (items) => remove(items, program.id))} aria-label={`Hapus program ${program.title}`}><Trash2 size={14} /></button></div><button className={secondary} onClick={() => updateModule("programs", (items) => items.map((item) => ({ ...item, active: item.id === program.id })))}>Jadikan aktif</button></article>)}</Panel></div>
    <div className="module-two-col"><Panel title="Riwayat latihan" caption="Setiap sesi yang kamu catat">{modules.workouts.length ? <div className="module-list">{modules.workouts.slice(0, 30).map((session) => <article className="module-item" key={session.id}><div className="module-item-top"><div><small className="module-muted">{formatDate(session.date)}</small><h3>{session.title}</h3><p>{session.durationMinutes} menit latihan · {session.cardioMinutes} menit kardio</p></div><button className="module-icon-action danger" onClick={() => updateModule("workouts", (items) => remove(items, session.id))} aria-label="Hapus sesi"><Trash2 size={14} /></button></div>{session.exercises.map((exercise) => <p className="module-muted" key={exercise.id}>{exercise.name} · {exercise.sets} × {exercise.reps} · {exercise.weightKg} kg</p>)}{session.notes && <p>{session.notes}</p>}</article>)}</div> : <NoData>Belum ada sesi latihan.</NoData>}</Panel><Panel title="Rest timer" caption="Atur waktu jeda antar set"><div className="rest-timer"><strong>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong><div className="module-button-row">{[30, 60, 90, 120, 180].map((value) => <button className={seconds === value ? "primary-button module-small-button" : secondary} key={value} onClick={() => { setSeconds(value); setRemaining(value); setRunning(false); }}>{value}s</button>)}</div><div className="module-button-row"><button className="primary-button module-small-button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Mulai"}</button><button className={secondary} onClick={() => { setRunning(false); setRemaining(seconds); }}>Reset</button></div></div></Panel></div>
    <Panel title="Foto progres" caption="Foto dikompresi sebelum disimpan; maksimal 5 foto aktif"><label className="module-upload"><ImagePlus size={20} /><span>{photoBusy ? "Mengompresi foto…" : "Tambah foto progres"}</span><input type="file" accept="image/*" disabled={photoBusy} onChange={addPhoto} /></label>{modules.progressPhotos.length > 0 && <div className="module-photo-grid">{modules.progressPhotos.map((photo) => <figure key={photo.id}><img src={photo.imageData} alt={`Foto progres ${photo.date}`} /><figcaption>{formatDate(photo.date)}<button onClick={() => updateModule("progressPhotos", (items) => remove(items, photo.id))} aria-label="Hapus foto"><X size={13} /></button></figcaption></figure>)}</div>}</Panel>
  </>;
}

function TreeView({ modules }: { modules: WorkspaceModules }) {
  const xp = modules.checkins.length * 5 + modules.goals.filter((goal) => goal.completed).length * 50 + modules.workouts.length * 20;
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const stage = ["Benih", "Tunas", "Pohon muda", "Pohon berbunga"][Math.min(3, Math.floor((level - 1) / 3))];
  const icon = ["🌱", "🌿", "🌳", "🌸"][Math.min(3, Math.floor((level - 1) / 3))];
  return <>
    <Intro eyebrow="GROWTH JOURNEY" title="Hal besar tumbuh dari langkah kecil." subtitle="Ringkasan gamifikasi berdasarkan check-in, tujuan, dan sesi latihan yang tercatat di V2." />
    <section className="tree-progress-card"><div className="tree-illustration" aria-hidden="true">{icon}</div><div><span className="small-label">LEVEL {level} · {stage.toUpperCase()}</span><h2>{stage}</h2><p>Konsistensi dibangun melalui tindakan yang diulang.</p><div className="module-progress-track"><span style={{ width: `${progress}%` }} /></div><small>{progress}/100 XP menuju level berikutnya</small></div></section>
    <div className="module-metrics"><Metric label="TOTAL XP" value={String(xp)} foot="Check-in, tujuan selesai, dan latihan" /><Metric label="TUJUAN SELESAI" value={String(modules.goals.filter((goal) => goal.completed).length)} foot="Hasil yang tercapai" /><Metric label="SESI LATIHAN" value={String(modules.workouts.length)} foot="Aktivitas tubuh yang dicatat" /></div>
  </>;
}

export function FinanceExtrasPanel({ modules, updateModule, transactions, onAddTransactions }: {
  modules: WorkspaceModules; updateModule: UpdateWorkspaceModule; transactions: Transaction[];
  onAddTransactions: (items: Transaction[]) => void;
}) {
  const [tab, setTab] = useState<"wallets" | "transfers" | "recurring" | "savings" | "rules" | "split" | "weekly">("wallets");
  const finance = modules.finance;
  const update = (fn: (current: FinanceExtras) => FinanceExtras) => updateModule("finance", fn);
  const month = today().slice(0, 7);
  const monthExpenses = transactions.filter((item) => item.type === "expense" && item.date.slice(0, 7) === month).reduce((sum, item) => sum + item.amount, 0);
  const day = Number(today().slice(8, 10));
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const projection = day ? Math.round(monthExpenses / day * days) : 0;
  const walletBalance = (wallet: Wallet) => {
    const selected = transactions.filter((item) => item.walletId === wallet.id);
    const income = selected.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = selected.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const sent = finance.transfers.filter((item) => item.fromWalletId === wallet.id).reduce((sum, item) => sum + item.amount, 0);
    const received = finance.transfers.filter((item) => item.toWalletId === wallet.id).reduce((sum, item) => sum + item.amount, 0);
    return wallet.openingBalance + income - expense - sent + received;
  };
  function addWallet(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); if (!name) return; const item: Wallet = { id: id(), name, type: String(data.get("type") || "cash") as Wallet["type"], openingBalance: Math.max(0, Number(data.get("balance")) || 0) }; update((current) => ({ ...current, wallets: [...current.wallets, item] })); event.currentTarget.reset(); }
  function addTransfer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const fromWalletId = String(data.get("from") || ""); const toWalletId = String(data.get("to") || ""); const amount = Math.round(Number(data.get("amount"))); if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || amount <= 0) return; const item: MoneyTransfer = { id: id(), fromWalletId, toWalletId, amount, date: String(data.get("date") || today()), note: String(data.get("note") || "") }; update((current) => ({ ...current, transfers: [item, ...current.transfers] })); event.currentTarget.reset(); }
  function addRecurring(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const amount = Math.round(Number(data.get("amount"))); if (!title || amount <= 0) return; const item: RecurringTransaction = { id: id(), title, amount, type: String(data.get("type") || "expense") as RecurringTransaction["type"], category: String(data.get("category") || "Tagihan"), frequency: String(data.get("frequency") || "monthly") as RecurringTransaction["frequency"], nextDate: String(data.get("nextDate") || today()), active: true }; update((current) => ({ ...current, recurring: [item, ...current.recurring] })); event.currentTarget.reset(); }
  function addSavings(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const targetAmount = Math.round(Number(data.get("target"))); if (!title || targetAmount <= 0) return; const item: SavingsGoal = { id: id(), title, targetAmount, savedAmount: Math.max(0, Number(data.get("saved")) || 0), dueDate: String(data.get("dueDate") || "") }; update((current) => ({ ...current, savingsGoals: [item, ...current.savingsGoals] })); event.currentTarget.reset(); }
  function addRule(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const keyword = String(data.get("keyword") || "").trim(); if (!keyword) return; const item: CategoryRule = { id: id(), keyword, category: String(data.get("category") || "Lainnya") }; update((current) => ({ ...current, categoryRules: [item, ...current.categoryRules] })); event.currentTarget.reset(); }
  function addWeekly(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const category = String(data.get("category") || "Makanan"); const limit = Math.round(Number(data.get("limit"))); if (limit < 0) return; update((current) => ({ ...current, weeklyBudgets: [...current.weeklyBudgets.filter((item) => item.category !== category), { category, limit }] })); event.currentTarget.reset(); }
  function splitTransaction(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const title = String(data.get("title") || "").trim(); const total = Math.round(Number(data.get("total"))); const first = Math.round(Number(data.get("firstAmount"))); const second = Math.round(Number(data.get("secondAmount"))); if (!title || total <= 0 || first <= 0 || second <= 0 || first + second !== total) { window.alert("Nominal kedua bagian harus sama dengan total transaksi."); return; } const group = id(); const date = String(data.get("date") || today()); const items: Transaction[] = [{ id: id(), title: `${title} (1/2)`, category: String(data.get("firstCategory") || "Makanan") as Transaction["category"], type: "expense", amount: first, date, splitGroupId: group }, { id: id(), title: `${title} (2/2)`, category: String(data.get("secondCategory") || "Lainnya") as Transaction["category"], type: "expense", amount: second, date, splitGroupId: group }]; onAddTransactions(items); event.currentTarget.reset(); }
  const categorySpend = useMemo(() => {
    const result = new Map<string, number>();
    for (const item of transactions.filter((transaction) => transaction.type === "expense" && transaction.date.slice(0, 7) === month)) result.set(item.category, (result.get(item.category) ?? 0) + item.amount);
    return [...result.entries()].sort((a, b) => b[1] - a[1]);
  }, [transactions, month]);
  return <section className="card card-pad finance-extras">
    <SectionHeading title="Keuangan lanjutan" caption="Dompet, transfer, transaksi terjadwal, tabungan, aturan kategori, dan pemisahan transaksi." />
    <div className="module-metrics compact"><Metric label="TOTAL SALDO DOMPET" value={formatCompactRupiah(finance.wallets.reduce((sum, wallet) => sum + walletBalance(wallet), 0))} foot={`${finance.wallets.length} dompet`} /><Metric label="PROYEKSI PENGELUARAN" value={formatCompactRupiah(projection)} foot="Estimasi akhir bulan dari rata-rata harian" /><Metric label="TARGET TABUNGAN" value={String(finance.savingsGoals.length)} foot="Tujuan tersimpan" /></div>
    <div className="module-tabs">{([{id:"wallets",label:"Dompet"},{id:"transfers",label:"Transfer"},{id:"recurring",label:"Berulang"},{id:"savings",label:"Tabungan"},{id:"rules",label:"Aturan"},{id:"split",label:"Split"},{id:"weekly",label:"Budget mingguan"}] as const).map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {tab === "wallets" && <div className="module-two-col"><form className="form-grid" onSubmit={addWallet}><Field label="Nama dompet"><input className={field} name="name" required placeholder="Tunai, BCA, GoPay" /></Field><Field label="Jenis"><select className={field} name="type"><option value="cash">Tunai</option><option value="bank">Bank</option><option value="e-wallet">E-wallet</option><option value="other">Lainnya</option></select></Field><Field label="Saldo awal (Rp)"><input className={field} name="balance" type="number" min="0" defaultValue="0" /></Field><PrimaryButton type="submit"><Plus size={15} /> Tambah dompet</PrimaryButton></form><div className="module-list">{finance.wallets.length ? finance.wallets.map((wallet) => <article className="module-item module-inline-meta" key={wallet.id}><div><strong>{wallet.name}</strong><small className="module-muted">{wallet.type}</small></div><div><strong>{formatCompactRupiah(walletBalance(wallet))}</strong><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, wallets: remove(current.wallets, wallet.id) }))} aria-label={`Hapus ${wallet.name}`}><Trash2 size={14} /></button></div></article>) : <NoData>Tambahkan dompet untuk mencatat saldo dan transfer antar sumber dana.</NoData>}</div></div>}
    {tab === "transfers" && <div className="module-two-col"><form className="form-grid" onSubmit={addTransfer}><Field label="Dari"><select className={field} name="from" required>{finance.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></Field><Field label="Ke"><select className={field} name="to" required>{finance.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></Field><Field label="Nominal (Rp)"><input className={field} name="amount" type="number" min="1" required /></Field><Field label="Tanggal"><input className={field} name="date" type="date" defaultValue={today()} /></Field><Field label="Catatan"><input className={field} name="note" /></Field><PrimaryButton type="submit" disabled={finance.wallets.length < 2}><ArrowRightLeft size={15} /> Simpan transfer</PrimaryButton></form><div className="module-list">{finance.transfers.map((item) => <article className="module-item" key={item.id}><div className="module-item-top"><strong>{finance.wallets.find((wallet) => wallet.id === item.fromWalletId)?.name || "Dompet dihapus"} → {finance.wallets.find((wallet) => wallet.id === item.toWalletId)?.name || "Dompet dihapus"}</strong><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, transfers: remove(current.transfers, item.id) }))} aria-label="Hapus transfer"><Trash2 size={14} /></button></div><p>{formatCompactRupiah(item.amount)} · {formatDate(item.date)}</p></article>)}</div></div>}
    {tab === "recurring" && <div className="module-two-col"><form className="form-grid" onSubmit={addRecurring}><Field label="Nama transaksi berulang"><input className={field} name="title" required /></Field><div className="form-two-columns"><Field label="Jenis"><select className={field} name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></Field><Field label="Kategori"><select className={field} name="category"><option>Tagihan</option><option>Makanan</option><option>Transportasi</option><option>Lifestyle</option><option>Kesehatan</option><option>Gaji</option><option>Freelance</option><option>Lainnya</option></select></Field></div><Field label="Nominal (Rp)"><input className={field} name="amount" type="number" min="1" required /></Field><div className="form-two-columns"><Field label="Frekuensi"><select className={field} name="frequency"><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option><option value="yearly">Tahunan</option></select></Field><Field label="Tanggal berikutnya"><input className={field} name="nextDate" type="date" defaultValue={today()} /></Field></div><PrimaryButton type="submit"><Plus size={15} /> Jadwalkan transaksi</PrimaryButton></form><div className="module-list">{finance.recurring.map((item) => <article className="module-item" key={item.id}><div className="module-item-top"><div><h3>{item.title}</h3><p>{item.category} · {item.frequency} · {formatDate(item.nextDate)}</p><strong>{formatCompactRupiah(item.amount)}</strong></div><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, recurring: remove(current.recurring, item.id) }))} aria-label="Hapus transaksi berulang"><Trash2 size={14} /></button></div><div className="module-inline-meta"><small>{item.active ? "Aktif" : "Dijeda"}</small><button className={secondary} onClick={() => update((current) => ({ ...current, recurring: current.recurring.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry) }))}>{item.active ? "Jeda" : "Aktifkan"}</button></div></article>)}</div></div>}
    {tab === "savings" && <div className="module-two-col"><form className="form-grid" onSubmit={addSavings}><Field label="Nama tujuan tabungan"><input className={field} name="title" required /></Field><div className="form-two-columns"><Field label="Target (Rp)"><input className={field} name="target" type="number" min="1" required /></Field><Field label="Sudah terkumpul (Rp)"><input className={field} name="saved" type="number" min="0" defaultValue="0" /></Field></div><Field label="Tenggat"><input className={field} name="dueDate" type="date" /></Field><PrimaryButton type="submit"><Plus size={15} /> Buat target</PrimaryButton></form><div className="module-list">{finance.savingsGoals.map((goal) => { const progress = Math.min(100, goal.savedAmount / goal.targetAmount * 100); return <article className="module-item" key={goal.id}><div className="module-item-top"><div><h3>{goal.title}</h3><p>{formatCompactRupiah(goal.savedAmount)} / {formatCompactRupiah(goal.targetAmount)}</p></div><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, savingsGoals: remove(current.savingsGoals, goal.id) }))} aria-label="Hapus target"><Trash2 size={14} /></button></div><div className="module-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="module-inline-meta"><small>{Math.round(progress)}% {goal.dueDate && `· tenggat ${formatDate(goal.dueDate)}`}</small><button className={secondary} onClick={() => { const amount = Number(window.prompt("Nominal yang ditambahkan (Rp)")); if (amount > 0) update((current) => ({ ...current, savingsGoals: current.savingsGoals.map((item) => item.id === goal.id ? { ...item, savedAmount: item.savedAmount + Math.round(amount) } : item) })); }}>Tambah dana</button></div></article>; })}</div></div>}
    {tab === "rules" && <div className="module-two-col"><form className="form-grid" onSubmit={addRule}><Field label="Kata kunci transaksi"><input className={field} name="keyword" required placeholder="Contoh: Starbucks" /></Field><Field label="Kategori otomatis"><select className={field} name="category"><option>Makanan</option><option>Transportasi</option><option>Tagihan</option><option>Lifestyle</option><option>Kesehatan</option><option>Gaji</option><option>Freelance</option><option>Lainnya</option></select></Field><PrimaryButton type="submit"><Plus size={15} /> Tambah aturan</PrimaryButton></form><div className="module-list">{finance.categoryRules.map((rule) => <article className="module-item module-inline-meta" key={rule.id}><div><strong>{rule.keyword}</strong><small className="module-muted">→ {rule.category}</small></div><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, categoryRules: remove(current.categoryRules, rule.id) }))} aria-label="Hapus aturan"><Trash2 size={14} /></button></article>)}</div></div>}
    {tab === "split" && <div className="module-two-col"><form className="form-grid" onSubmit={splitTransaction}><Field label="Nama transaksi"><input className={field} name="title" required placeholder="Belanja bersama" /></Field><Field label="Total nominal (Rp)"><input className={field} name="total" type="number" min="1" required /></Field><Field label="Tanggal"><input className={field} name="date" type="date" defaultValue={today()} /></Field><div className="form-two-columns"><Field label="Bagian 1 · kategori"><select className={field} name="firstCategory"><option>Makanan</option><option>Transportasi</option><option>Tagihan</option><option>Lifestyle</option><option>Lainnya</option></select></Field><Field label="Bagian 1 · nominal"><input className={field} name="firstAmount" type="number" min="1" required /></Field></div><div className="form-two-columns"><Field label="Bagian 2 · kategori"><select className={field} name="secondCategory"><option>Lifestyle</option><option>Makanan</option><option>Transportasi</option><option>Tagihan</option><option>Lainnya</option></select></Field><Field label="Bagian 2 · nominal"><input className={field} name="secondAmount" type="number" min="1" required /></Field></div><PrimaryButton type="submit"><Plus size={15} /> Simpan transaksi split</PrimaryButton></form><div className="module-muted">Transaksi akan dibuat sebagai dua baris pengeluaran yang terhubung oleh satu ID split. Total kedua bagian harus sama dengan total transaksi.</div></div>}
    {tab === "weekly" && <div className="module-two-col"><form className="form-grid" onSubmit={addWeekly}><Field label="Kategori"><select className={field} name="category"><option>Makanan</option><option>Transportasi</option><option>Tagihan</option><option>Lifestyle</option><option>Kesehatan</option><option>Lainnya</option></select></Field><Field label="Batas 7 hari (Rp)"><input className={field} name="limit" type="number" min="0" required /></Field><PrimaryButton type="submit"><Plus size={15} /> Simpan budget mingguan</PrimaryButton></form><div className="module-list">{finance.weeklyBudgets.map((budget) => { const since = new Date(); since.setDate(since.getDate() - 6); const start = `${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,"0")}-${String(since.getDate()).padStart(2,"0")}`; const spent = transactions.filter((item) => item.type === "expense" && item.category === budget.category && item.date >= start && item.date <= today()).reduce((sum, item) => sum + item.amount, 0); const percent = budget.limit ? Math.round(spent / budget.limit * 100) : (spent ? 100 : 0); return <article className="module-item" key={budget.category}><div className="module-item-top"><strong>{budget.category}</strong><button className="module-icon-action danger" onClick={() => update((current) => ({ ...current, weeklyBudgets: current.weeklyBudgets.filter((item) => item.category !== budget.category) }))} aria-label="Hapus budget mingguan"><Trash2 size={14} /></button></div><p>{formatCompactRupiah(spent)} / {formatCompactRupiah(budget.limit)} · {percent}%</p><div className="module-progress-track"><span style={{ width: `${Math.min(100, percent)}%` }} /></div></article>; })}</div></div>}
    <div className="module-category-explorer"><SectionHeading title="Eksplorasi kategori" caption="Akumulasi pengeluaran pada bulan berjalan" />{categorySpend.length ? categorySpend.map(([category, amount]) => <div className="module-inline-meta" key={category}><span>{category}</span><strong>{formatCompactRupiah(amount)}</strong></div>) : <p className="module-muted">Belum ada pengeluaran bulan ini.</p>}</div>
  </section>;
}

async function compressPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("Gambar tidak dapat dibuka.")); element.src = url;
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
