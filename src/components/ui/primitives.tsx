import type { ReactNode } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BookOpen, Check, Clock3, Droplets,
  Dumbbell, Flame, Moon, PencilLine, Sprout, Target,
} from "lucide-react";
import type { Habit, Transaction } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { scheduleLabel } from "@/lib/habit-schedule";

function PageIntro({ eyebrow, title, subtitle, action }: {
  eyebrow: string; title: string; subtitle: string; action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div className="page-intro-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action && <div className="page-intro-action">{action}</div>}
    </div>
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
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
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
  const Icon = icon === "water" ? Droplets : icon === "book" ? BookOpen : icon === "movement" ? Dumbbell : icon === "write" ? PencilLine : Moon;
  return <Icon size={18} strokeWidth={1.8} />;
}

function HabitRow({ habit, onToggle, onAdjust, onTimerToggle, onViewTimeAnalysis, timerActive = false, timerElapsedSeconds = 0, paused = false }: { habit: Habit; onToggle: (id: string) => void; onAdjust?: (id: string, delta: number) => void; onTimerToggle?: (id: string) => void; onViewTimeAnalysis?: (id: string) => void; timerActive?: boolean; timerElapsedSeconds?: number; paused?: boolean }) {
  const amountHabit = habit.kind === "amount";
  const current = habit.currentAmount ?? 0;
  const target = habit.targetAmount ?? 1;
  const percentage = Math.min(100, Math.round(current / target * 100));
  const avoid = habit.kind === "avoid";
  return (
    <article className={`habit-row ${habit.completed ? "is-complete" : ""} ${amountHabit ? "is-amount-habit" : ""}`}>
      <div className="habit-icon"><HabitGlyph icon={habit.icon} /></div>
      <div className="habit-main">
        <div className="habit-name">{habit.title}</div>
        <div className="habit-meta">
          <span><Clock3 size={11} /> {habit.time}</span>
          <span>{habit.duration} menit target</span>
          <span><Flame size={11} /> {habit.streak} hari</span>
          {typeof habit.timeSpentMinutes === "number" && habit.timeSpentMinutes > 0 && <span>{habit.timeSpentMinutes} menit dicatat</span>}
          {habit.priority && <span className={`habit-detail-tag priority-${habit.priority}`}>Prioritas {habit.priority === "high" ? "tinggi" : habit.priority === "medium" ? "sedang" : "rendah"}</span>}
          {habit.difficulty && <span className="habit-detail-tag">Kesulitan {habit.difficulty === "hard" ? "tinggi" : habit.difficulty === "medium" ? "sedang" : "rendah"}</span>}
          {habit.groupName && <span className="habit-detail-tag">{habit.groupName}</span>}
          {habit.schedule && habit.schedule.kind !== "daily" && <span className="habit-detail-tag">Jadwal {scheduleLabel(habit.schedule)}</span>}
        </div>
        {amountHabit && <div className="habit-amount-progress"><div className="habit-amount-caption"><strong>{current} / {target} {habit.unit || "unit"}</strong><span>{percentage}%</span></div><div className="module-progress-track"><span style={{ width: `${percentage}%` }} /></div></div>}
        {avoid && <small className="habit-kind-note">Streak dihitung pada hari berhasil menghindari kebiasaan ini.</small>}
      </div>
      <div className="habit-row-actions">
        {amountHabit ? <div className="habit-amount-stepper"><button type="button" aria-label={`Kurangi ${habit.title}`} disabled={current <= 0 || paused} onClick={() => onAdjust?.(habit.id, -1)}>−</button><button type="button" aria-label={`Tambah ${habit.title}`} disabled={!onAdjust || paused} onClick={() => onAdjust?.(habit.id, 1)}>+</button></div> : <button type="button" className={`check-button ${habit.completed ? "done" : ""}`} aria-label={habit.completed ? (avoid ? `Catat pelanggaran ${habit.title}` : `Batalkan ${habit.title}`) : (avoid ? `Tandai hari bersih ${habit.title}` : `Tandai ${habit.title} selesai`)} aria-pressed={habit.completed} disabled={paused} onClick={() => onToggle(habit.id)}>{habit.completed && <Check size={15} strokeWidth={2.8} />}</button>}
        {onTimerToggle && <button className={`habit-time-track ${timerActive ? "active" : ""}`} type="button" onClick={() => onTimerToggle(habit.id)} disabled={paused} aria-pressed={timerActive} aria-label={timerActive ? `Hentikan timer ${habit.title}` : `Mulai timer ${habit.title}`}>{timerActive ? `Stop ${String(Math.floor(timerElapsedSeconds / 60)).padStart(2, "0")}:${String(timerElapsedSeconds % 60).padStart(2, "0")}` : "Mulai timer"}</button>}
        {onViewTimeAnalysis && <button className="habit-history-action" type="button" onClick={() => onViewTimeAnalysis(habit.id)}>Riwayat waktu</button>}
      </div>
    </article>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <article className="transaction-row">
      <div className={`transaction-icon ${income ? "" : "expense"}`}>
        {income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
      </div>
      <div className="transaction-copy">
        <div className="transaction-title">{transaction.title}</div>
        <div className="transaction-meta">{transaction.category} <span>·</span> {formatDate(transaction.date)}</div>
      </div>
      <div className={`transaction-amount ${income ? "income" : "expense"}`}>{income ? "+" : "−"}{formatRupiah(transaction.amount)}</div>
    </article>
  );
}

function StatCard({ label, value, foot, icon: Icon, tone = "default" }: {
  label: string; value: string; foot: string; icon: typeof Target; tone?: "default" | "green" | "amber";
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span className="small-label">{label}</span><span className="stat-icon"><Icon size={15} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function EmptyState({ icon: Icon = Sprout, title, description, action }: {
  icon?: typeof Target; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export { PageIntro, PrimaryButton, IconAction, SectionHeading, HabitGlyph, HabitRow, TransactionRow, StatCard, EmptyState };
