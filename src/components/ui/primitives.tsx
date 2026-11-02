import type { ReactNode } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BookOpen, Check, Clock3, Droplets,
  Dumbbell, Flame, Moon, PencilLine, Target,
} from "lucide-react";
import type { Habit, Transaction } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";

function PageIntro({ eyebrow, title, subtitle, action }: {
  eyebrow: string; title: string; subtitle: string; action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function PrimaryButton({ children, onClick, type = "button" }: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit";
}) {
  return <button className="primary-button" type={type} onClick={onClick}>{children}</button>;
}

function IconAction({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function SectionHeading({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div><h2 className="section-title">{title}</h2>{caption && <p className="section-caption">{caption}</p>}</div>
      {action}
    </div>
  );
}

function HabitGlyph({ icon }: { icon: Habit["icon"] }) {
  const Icon = icon === "water" ? Droplets : icon === "book" ? BookOpen : icon === "movement" ? Dumbbell : icon === "write" ? PencilLine : Moon;
  return <Icon size={18} strokeWidth={1.8} />;
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: (id: string) => void }) {
  return (
    <div className="habit-row">
      <div className="habit-icon"><HabitGlyph icon={habit.icon} /></div>
      <div className="habit-main">
        <div className="habit-name">{habit.title}</div>
        <div className="habit-meta"><span><Clock3 size={11} /> {habit.time}</span><span>{habit.duration} menit</span><span><Flame size={11} /> {habit.streak} hari</span></div>
      </div>
      <button className={`check-button ${habit.completed ? "done" : ""}`} aria-label={habit.completed ? `Batalkan ${habit.title}` : `Selesaikan ${habit.title}`} onClick={() => onToggle(habit.id)}>
        {habit.completed && <Check size={15} strokeWidth={2.8} />}
      </button>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const income = transaction.type === "income";
  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${income ? "" : "expense"}`}>
        {income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
      </div>
      <div>
        <div className="transaction-title">{transaction.title}</div>
        <div className="transaction-meta">{transaction.category} · {formatDate(transaction.date)}</div>
      </div>
      <div className={`transaction-amount ${income ? "income" : "expense"}`}>{income ? "+" : "−"}{formatRupiah(transaction.amount)}</div>
    </div>
  );
}

function StatCard({ label, value, foot, icon: Icon }: {
  label: string; value: string; foot: string; icon: typeof Target;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span className="small-label">{label}</span><span className="stat-icon"><Icon size={15} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

export { PageIntro, PrimaryButton, IconAction, SectionHeading, HabitGlyph, HabitRow, TransactionRow, StatCard };
