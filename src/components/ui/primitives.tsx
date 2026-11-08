import type { ReactNode } from "react";
import { WeeklyHistorySlot } from "@/components/ui/weekly-history";
import {
  CalendarDays, Check, Clock3, Flag, Flame, Folder, Gauge, Inbox, Target, Timer,
} from "lucide-react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { BotanicalIllustration, type BotanicalIllustrationVariant } from "@/components/ui/botanical-illustration";
import type { Habit, Transaction } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { scheduleLabel } from "@/lib/habit-schedule";
import { burstLeaves } from "@/components/ui/celebrate";
import { FinanceCategoryIcon, HabitArtIcon } from "@/components/ui/category-icons";

// v0.25 — UI dominan ikon: header halaman dipadatkan menjadi ikon + judul
// (eyebrow/kalimat subjudul dan ilustrasi botanical tidak lagi dirender),
// StatCard menjadi icon-first tanpa kalimat narasi, dan meta kebiasaan
// disandikan sebagai chip berikon (teks pendek + tooltip untuk konteks penuh).
// v0.27 — ilustrasi kembali sebagai lapisan dekoratif: prop `art` merender satu
// ilustrasi botanical per tab di header, dan EmptyState memakai ilustrasi
// kontekstual menggantikan ikon lingkaran. Teks tetap faktual (bebas narasi).
function PageIntro({ icon, title, meta, action, art }: {
  icon: AppIconName; title: string; meta?: string; action?: ReactNode; art?: BotanicalIllustrationVariant;
}) {
  return (
    <>
      <div className={`page-intro${action ? " page-intro--has-action" : ""}`}>
        {art && <BotanicalIllustration variant={art} className="page-intro-art" />}
        <span className="page-intro-icon" aria-hidden="true"><AppIcon name={icon} size={22} /></span>
        <div className="page-intro-copy">
          <h1 className="page-title">{title}</h1>
          {meta && <p className="page-intro-meta">{meta}</p>}
        </div>
        {action && <div className="page-intro-action">{action}</div>}
      </div>
      <WeeklyHistorySlot />
    </>
  );
}

function PrimaryButton({ children, onClick, type = "button", disabled = false }: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
}) {
  return <button className="primary-button" type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

function IconAction({ label, children, onClick, className = "" }: {
  label: string; children: ReactNode; onClick?: () => void; className?: string;
}) {
  return <button type="button" className={`icon-button icon-action-feedback ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function SectionHeading({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div className="section-heading-copy"><h2 className="section-title">{title}</h2>{caption && <p className="section-caption">{caption}</p>}</div>
      {action && <div className="section-heading-action">{action}</div>}
    </div>
  );
}

function HabitGlyph({ icon }: { icon: Habit["icon"] }) {
  // v0.16 — glyph flat-filled (gaya Flaticon, palet botanical) menggantikan
  // ikon Lucide garis lama (Droplets/BookOpen/Dumbbell/PencilLine/Moon).
  return <HabitArtIcon icon={icon} size={19} />;
}

// v0.18: prop onDelete dihapus — seluruh aksi hapus kebiasaan kini terpusat di
// Pengaturan (data-manager-view), bukan lagi di baris daftar tab.
function HabitRow({ habit, onToggle, onAdjust, paused = false, dragHandle, variant = "default" }: { habit: Habit; onToggle: (id: string) => void; onAdjust?: (id: string, delta: number) => void; paused?: boolean; dragHandle?: ReactNode; variant?: "default" | "card" }) {
  const amountHabit = habit.kind === "amount";
  const current = habit.currentAmount ?? 0;
  const target = habit.targetAmount ?? 1;
  const percentage = Math.min(100, Math.round(current / target * 100));
  const avoid = habit.kind === "avoid";
  const cardVariant = variant === "card";
  const toggleLabel = habit.completed
    ? (avoid ? `Catat pelanggaran ${habit.title}` : `Batalkan ${habit.title}`)
    : (avoid ? `Tandai hari bersih ${habit.title}` : `Tandai ${habit.title} selesai`);
  // v0.25 — meta chip berikon: teks dipendekkan, konteks penuh dipindah ke
  // title/aria-label supaya tetap ramah pembaca layar tanpa memenuhi layar.
  const priorityWord = habit.priority === "high" ? "Tinggi" : habit.priority === "medium" ? "Sedang" : "Rendah";
  const priorityFull = habit.priority === "high" ? "tinggi" : habit.priority === "medium" ? "sedang" : "rendah";
  const difficultyWord = habit.difficulty === "hard" ? "Berat" : habit.difficulty === "medium" ? "Sedang" : "Ringan";
  const difficultyFull = habit.difficulty === "hard" ? "tinggi" : habit.difficulty === "medium" ? "sedang" : "rendah";
  const metaChips = (
    <>
      <span className="meta-chip"><Clock3 size={11} aria-hidden="true" /> {habit.time}</span>
      <span className="meta-chip"><Timer size={11} aria-hidden="true" /> {habit.duration} mnt</span>
      <span className="meta-chip meta-chip-streak" title={`${habit.streak} hari beruntun`} aria-label={`Streak ${habit.streak} hari`}><Flame size={11} aria-hidden="true" /> {habit.streak}</span>
      {habit.priority && <span className={`meta-chip meta-chip-flag priority-${habit.priority}`} title={`Prioritas ${priorityFull}`}><Flag size={11} aria-hidden="true" /> {priorityWord}</span>}
      {habit.difficulty && <span className="meta-chip" title={`Kesulitan ${difficultyFull}`}><Gauge size={11} aria-hidden="true" /> {difficultyWord}</span>}
      {habit.groupName && <span className="meta-chip"><Folder size={11} aria-hidden="true" /> {habit.groupName}</span>}
      {habit.schedule && habit.schedule.kind !== "daily" && <span className="meta-chip" title={`Jadwal ${scheduleLabel(habit.schedule)}`}><CalendarDays size={11} aria-hidden="true" /> {scheduleLabel(habit.schedule)}</span>}
    </>
  );
  return (
    <article className={`habit-row ${cardVariant ? "habit-row-card" : ""} ${habit.completed ? "is-complete" : ""} ${amountHabit ? "is-amount-habit" : ""}`}>
      {dragHandle}
      <div className="habit-icon"><HabitGlyph icon={habit.icon} /></div>
      <div className={`habit-main ${cardVariant ? "habit-card-main" : ""}`}>
        {cardVariant ? (
          <>
            <div className="habit-row-heading">
              <div className="habit-name" title={habit.title}>{habit.title}</div>
              <span className="habit-streak-chip" title={`${habit.streak} hari berturut-turut`} aria-label={`Streak ${habit.streak} hari`}>
                <Flame size={12} aria-hidden="true" />
                <strong>{habit.streak}</strong>
                <small>hari</small>
              </span>
            </div>
            <div className="habit-meta">
              <span className="meta-chip"><Clock3 size={11} aria-hidden="true" /> {habit.time}</span>
              <span className="meta-chip"><Timer size={11} aria-hidden="true" /> {habit.duration} mnt</span>
            </div>
            {(habit.priority || habit.difficulty || habit.groupName || (habit.schedule && habit.schedule.kind !== "daily")) && (
              <div className="habit-context-tags">
                {habit.priority && <span className={`meta-chip meta-chip-flag priority-${habit.priority}`} title={`Prioritas ${priorityFull}`}><Flag size={11} aria-hidden="true" /> {priorityWord}</span>}
                {habit.difficulty && <span className="meta-chip" title={`Kesulitan ${difficultyFull}`}><Gauge size={11} aria-hidden="true" /> {difficultyWord}</span>}
                {habit.groupName && <span className="meta-chip"><Folder size={11} aria-hidden="true" /> {habit.groupName}</span>}
                {habit.schedule && habit.schedule.kind !== "daily" && <span className="meta-chip" title={`Jadwal ${scheduleLabel(habit.schedule)}`}><CalendarDays size={11} aria-hidden="true" /> {scheduleLabel(habit.schedule)}</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="habit-name" title={habit.title}>{habit.title}</div>
            <div className="habit-meta">{metaChips}</div>
          </>
        )}
        {amountHabit && <div className="habit-amount-progress"><div className="habit-amount-caption"><strong>{current} / {target} {habit.unit || "unit"}</strong><span>{percentage}%</span></div><div className="module-progress-track"><span style={{ width: `${percentage}%` }} /></div></div>}
        {avoid && <small className="habit-kind-note">Streak dihitung pada hari berhasil menghindari kebiasaan ini.</small>}
      </div>
      <div className="habit-row-actions">
        {amountHabit ? (
          <div className="habit-amount-stepper">
            <button type="button" aria-label={`Kurangi ${habit.title}`} disabled={current <= 0 || paused} onClick={() => onAdjust?.(habit.id, -1)}>−</button>
            <button type="button" aria-label={`Tambah ${habit.title}`} disabled={!onAdjust || paused} onClick={(event) => { if (!habit.completed && current + 1 >= target) burstLeaves(event.currentTarget); onAdjust?.(habit.id, 1); }}>+</button>
          </div>
        ) : cardVariant ? (
          <button
            type="button"
            className={`habit-check-action ${habit.completed ? "is-complete" : ""}`}
            aria-label={toggleLabel}
            aria-pressed={habit.completed}
            disabled={paused}
            onClick={(event) => { if (!habit.completed) burstLeaves(event.currentTarget); onToggle(habit.id); }}
          >
            <span className="habit-check-icon"><Check size={14} strokeWidth={2.8} /></span>
            <span className="habit-check-label">{avoid ? "Hari bersih" : habit.completed ? "Selesai" : "Tandai selesai"}</span>
          </button>
        ) : (
          <button type="button" className={`check-button ${habit.completed ? "done" : ""}`} aria-label={toggleLabel} aria-pressed={habit.completed} disabled={paused} onClick={(event) => { if (!habit.completed) burstLeaves(event.currentTarget); onToggle(habit.id); }}>
            {habit.completed && <Check size={15} strokeWidth={2.8} />}
          </button>
        )}
      </div>
    </article>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <article className="transaction-row">
      {/* v0.19.1 — ikon kategori flat-filled (gaya Flaticon) menggantikan panah
          generik: kategori terlihat sekilas, arah kas tetap tersandi dari tanda
          +/− dan warna nominal, plus tint hijau/amber pada tile ikon. */}
      <div className={`transaction-icon ${income ? "" : "expense"}`}>
        <FinanceCategoryIcon category={transaction.category} size={19} />
      </div>
      <div className="transaction-copy">
        <div className="transaction-title">{transaction.title}</div>
        <div className="transaction-meta">{transaction.category} <span>·</span> {formatDate(transaction.date)}</div>
      </div>
      <div className={`transaction-amount ${income ? "income" : "expense"}`}>{income ? "+" : "−"}{formatRupiah(transaction.amount)}</div>
    </article>
  );
}

// v0.25 — StatCard icon-first: tile ikon menjadi jangkar visual, angka besar,
// label kecil. Kalimat narasi (foot) dihapus agar angka berbicara sendiri.
function StatCard({ label, value, icon: Icon, tone = "default" }: {
  label: string; value: string; icon: typeof Target; tone?: "default" | "green" | "amber" | "orange";
}) {
  return (
    <div className={`stat-card tone-${tone} stat-card-icon-first`}>
      <span className="stat-icon-tile" aria-hidden="true"><Icon size={17} /></span>
      <div className="stat-copy">
        <div className="metric-value">{value}</div>
        <span className="small-label">{label}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = Inbox, title, description, action, art }: {
  icon?: typeof Target; title: string; description: string; action?: ReactNode; art?: BotanicalIllustrationVariant;
}) {
  return (
    <div className="empty-state">
      {art ? (
        <BotanicalIllustration variant={art} className="empty-state-art" />
      ) : (
        <span className="empty-state-icon"><Icon size={22} /></span>
      )}
      <strong>{title}</strong>
      <p>{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export { PageIntro, PrimaryButton, IconAction, SectionHeading, HabitGlyph, HabitRow, TransactionRow, StatCard, EmptyState };
