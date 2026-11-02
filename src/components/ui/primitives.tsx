import type { ReactNode } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BookOpen, Check, Clock3, Droplets,
  Dumbbell, Flame, Moon, PencilLine, Sprout, Target,
} from "lucide-react";
import type { Habit, Transaction } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";

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

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: (id: string) => void }) {
  return (
    <article className={`habit-row ${habit.completed ? "is-complete" : ""}`}>
      <div className="habit-icon"><HabitGlyph icon={habit.icon} /></div>
      <div className="habit-main">
        <div className="habit-name">{habit.title}</div>
        <div className="habit-meta">
          <span><Clock3 size={11} /> {habit.time}</span>
          <span>{habit.duration} menit</span>
          <span><Flame size={11} /> {habit.streak} hari</span>
        </div>
      </div>
      <button
        type="button"
        className={`check-button ${habit.completed ? "done" : ""}`}
        aria-label={habit.completed ? `Batalkan ${habit.title}` : `Tandai ${habit.title} selesai`}
        aria-pressed={habit.completed}
        onClick={() => onToggle(habit.id)}
      >
        {habit.completed && <Check size={15} strokeWidth={2.8} />}
      </button>
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
