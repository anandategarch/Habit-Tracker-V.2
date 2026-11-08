"use client";

import { useMemo, useState } from "react";
import type { Budget, Habit, HabitCategory, Transaction, TransactionType } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { WEEKDAY_LABELS } from "@/lib/habit-schedule";
import { Sheet } from "@/features/os/widgets";
import { CheckIcon, FinanceCategoryIco, HABIT_ICON_OPTIONS, HabitCategoryIco, HabitIco } from "@/features/os/os-icons";
import type { HabitIconName } from "@/features/os/os-icons";

/* ==========================================================================
   RUTINA OS — CRUD sheets (habit / transaction / budget)
   Form bodies mount fresh every time the sheet opens, so state initializes
   from `initial` directly — no reset effects needed.
   ========================================================================== */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="os-micro">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg border border-[#4a2a2a] bg-[#f3727214] px-3 py-2 text-[12.5px] text-crimson">
      {message}
    </p>
  );
}

function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="os-safe-bottom flex gap-2.5 pt-1">
      <button type="button" className="os-btn flex-1" onClick={onCancel}>
        Batal
      </button>
      <button type="submit" className="os-btn os-btn-primary flex-1">
        <CheckIcon size={15} />
        {submitLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ HABIT */

export interface HabitDraft {
  title: string;
  category: HabitCategory;
  icon: HabitIconName;
  time: string;
  duration: number;
  schedule: Habit["schedule"];
}

const HABIT_CATEGORIES: HabitCategory[] = ["Mindfulness", "Health", "Learning", "Personal"];

export function HabitSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Habit | null;
  onSubmit: (draft: HabitDraft) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Ubah kebiasaan" : "Kebiasaan baru"}
      description={initial ? "Perbarui detail lalu simpan." : "Tentukan nama, jadwal, dan durasinya."}
    >
      {open && (
        <HabitFormBody
          key={initial?.id ?? "new"}
          initial={initial ?? null}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      )}
    </Sheet>
  );
}

function HabitFormBody({ initial, onCancel, onSubmit }: { initial: Habit | null; onCancel: () => void; onSubmit: (draft: HabitDraft) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<HabitCategory>(initial?.category ?? "Personal");
  const [icon, setIcon] = useState<HabitIconName>(initial?.icon ?? "write");
  const [time, setTime] = useState(initial?.time ?? "07:00");
  const [duration, setDuration] = useState(initial?.duration ?? 15);
  const [scheduleKind, setScheduleKind] = useState<"daily" | "weekly">(initial?.schedule?.kind === "weekly" ? "weekly" : "daily");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.schedule?.kind === "weekly" ? initial.schedule.days : [1, 2, 3, 4, 5]);
  const [error, setError] = useState("");

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return setError("Beri nama kebiasaan dulu.");
    if (trimmed.length > 100) return setError("Nama maksimal 100 karakter.");
    if (!/^\d{2}:\d{2}$/.test(time)) return setError("Waktu tidak valid.");
    const dur = Math.round(duration);
    if (!Number.isFinite(dur) || dur < 1 || dur > 600) return setError("Durasi 1–600 menit.");
    if (scheduleKind === "weekly" && weekdays.length === 0) return setError("Pilih minimal satu hari.");
    onSubmit({
      title: trimmed,
      category,
      icon,
      time,
      duration: dur,
      schedule: scheduleKind === "daily" ? { kind: "daily" } : { kind: "weekly", days: [...weekdays].sort((a, b) => a - b) },
    });
    onCancel();
  }

  return (
    <form
      className="flex flex-col gap-4 px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Nama">
        <input className="os-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Baca 10 halaman" maxLength={100} autoFocus />
      </Field>

      <Field label="Ikon">
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Pilih ikon">
          {HABIT_ICON_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={icon === name}
              aria-label={name}
              onClick={() => setIcon(name)}
              className="flex h-[52px] items-center justify-center rounded-xl border transition-all"
              style={{
                borderColor: icon === name ? "rgba(55,217,154,.5)" : "#262f28",
                background: icon === name ? "rgba(55,217,154,.1)" : "#0b0f0c",
                color: icon === name ? "#37d99a" : "#a3aea5",
              }}
            >
              <HabitIco name={name} size={21} />
            </button>
          ))}
        </div>
      </Field>

      <Field label="Kategori">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pilih kategori">
          {HABIT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className="flex h-[44px] items-center justify-center gap-2 rounded-xl border text-[13px] font-medium transition-all"
              style={{
                borderColor: category === c ? "rgba(55,217,154,.5)" : "#262f28",
                background: category === c ? "rgba(55,217,154,.1)" : "#0b0f0c",
                color: category === c ? "#37d99a" : "#a3aea5",
              }}
            >
              <HabitCategoryIco category={c} />
              {c}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Waktu">
          <input className="os-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Durasi (menit)">
          <input
            className="os-input num"
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="Jadwal">
        <div className="flex gap-2">
          <button type="button" aria-pressed={scheduleKind === "daily"} className="os-chip flex-1 justify-center !h-9" onClick={() => setScheduleKind("daily")}>
            Setiap hari
          </button>
          <button type="button" aria-pressed={scheduleKind === "weekly"} className="os-chip flex-1 justify-center !h-9" onClick={() => setScheduleKind("weekly")}>
            Hari tertentu
          </button>
        </div>
        {scheduleKind === "weekly" && (
          <div className="mt-1 flex gap-1.5" role="group" aria-label="Pilih hari">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={weekdays.includes(d)}
                aria-label={WEEKDAY_LABELS[d]}
                onClick={() => setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                className="h-9 flex-1 rounded-lg border text-[12px] font-semibold transition-all"
                style={{
                  borderColor: weekdays.includes(d) ? "rgba(55,217,154,.5)" : "#262f28",
                  background: weekdays.includes(d) ? "rgba(55,217,154,.1)" : "#0b0f0c",
                  color: weekdays.includes(d) ? "#37d99a" : "#a3aea5",
                }}
              >
                {WEEKDAY_LABELS[d]}
              </button>
            ))}
          </div>
        )}
      </Field>

      {error && <FormError message={error} />}
      <FormActions onCancel={onCancel} submitLabel={initial ? "Simpan" : "Tambah"} />
    </form>
  );
}

/* ------------------------------------------------------------ TRANSACTION */

export interface TransactionDraft {
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  date: string;
}

export function TransactionSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
  knownCategories,
  defaultCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Transaction | null;
  onSubmit: (draft: TransactionDraft) => void;
  knownCategories: string[];
  defaultCategories: string[];
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Ubah transaksi" : "Catat transaksi"}
      description="Pemasukan atau pengeluaran — langsung masuk rekap bulan ini."
    >
      {open && (
        <TransactionFormBody
          key={initial?.id ?? "new"}
          initial={initial ?? null}
          knownCategories={knownCategories}
          defaultCategories={defaultCategories}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      )}
    </Sheet>
  );
}

function TransactionFormBody({
  initial,
  onCancel,
  onSubmit,
  knownCategories,
  defaultCategories,
}: {
  initial: Transaction | null;
  onCancel: () => void;
  onSubmit: (draft: TransactionDraft) => void;
  knownCategories: string[];
  defaultCategories: string[];
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? (initial?.type === "income" ? "Gaji" : defaultCategories[2] ?? "Makanan"));
  const [amountText, setAmountText] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>([...defaultCategories, ...knownCategories]);
    if (category) set.add(category);
    return [...set];
  }, [defaultCategories, knownCategories, category]);

  function submit() {
    const trimmed = title.trim();
    const amount = Number(amountText.replace(/[^\d]/g, ""));
    if (!trimmed) return setError("Kasih nama transaksinya.");
    if (trimmed.length > 100) return setError("Nama maksimal 100 karakter.");
    if (!Number.isSafeInteger(amount) || amount <= 0) return setError("Nominal harus angka bulat di atas 0.");
    if (amount > 9_999_999_999) return setError("Nominal terlalu besar.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Tanggal tidak valid.");
    if (!category.trim()) return setError("Pilih kategori.");
    onSubmit({ type, title: trimmed, category, amount, date });
    onCancel();
  }

  return (
    <form
      className="flex flex-col gap-4 px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis transaksi">
        <button
          type="button"
          role="radio"
          aria-checked={type === "expense"}
          onClick={() => {
            setType("expense");
            if (category === "Gaji" || category === "Freelance") setCategory(defaultCategories[2] ?? "Makanan");
          }}
          className="flex h-[46px] items-center justify-center rounded-xl border text-[13.5px] font-semibold transition-all"
          style={{
            borderColor: type === "expense" ? "rgba(243,114,114,.5)" : "#262f28",
            background: type === "expense" ? "rgba(243,114,114,.09)" : "#0b0f0c",
            color: type === "expense" ? "#f37272" : "#a3aea5",
          }}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={type === "income"}
          onClick={() => {
            setType("income");
            setCategory("Gaji");
          }}
          className="flex h-[46px] items-center justify-center rounded-xl border text-[13.5px] font-semibold transition-all"
          style={{
            borderColor: type === "income" ? "rgba(55,217,154,.5)" : "#262f28",
            background: type === "income" ? "rgba(55,217,154,.09)" : "#0b0f0c",
            color: type === "income" ? "#37d99a" : "#a3aea5",
          }}
        >
          Pemasukan
        </button>
      </div>

      <Field label="Nominal">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-faint">Rp</span>
          <input
            className="os-input num !h-[52px] !pl-11 !text-[20px] !font-semibold"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            inputMode="numeric"
            autoFocus
            aria-label="Nominal dalam rupiah"
          />
        </div>
      </Field>

      <Field label="Keterangan">
        <input
          className="os-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "income" ? "mis. Gaji bulanan" : "mis. Makan siang"}
          maxLength={100}
        />
      </Field>

      <Field label="Kategori">
        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, 16).map((c) => (
            <button key={c} type="button" aria-pressed={category === c} className="os-chip" onClick={() => setCategory(c)}>
              <FinanceCategoryIco category={c} size={13} />
              {c}
            </button>
          ))}
        </div>
        <input
          className="os-input mt-1 !h-9 !text-[13px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="atau tulis kategori sendiri"
          maxLength={60}
          aria-label="Kategori kustom"
        />
      </Field>

      <Field label="Tanggal">
        <input className="os-input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {error && <FormError message={error} />}
      <FormActions onCancel={onCancel} submitLabel={initial ? "Simpan" : "Catat"} />
    </form>
  );
}

/* ----------------------------------------------------------------- BUDGET */

export function BudgetSheet({
  open,
  onOpenChange,
  initial,
  existingCategories,
  defaultCategories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Budget | null;
  existingCategories: string[];
  defaultCategories: string[];
  onSubmit: (draft: { category: string; limit: number }) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? "Ubah anggaran" : "Anggaran baru"} description="Batas belanja bulanan per kategori.">
      {open && (
        <BudgetFormBody
          key={initial?.category ?? "new"}
          initial={initial ?? null}
          existingCategories={existingCategories}
          defaultCategories={defaultCategories}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      )}
    </Sheet>
  );
}

function BudgetFormBody({
  initial,
  existingCategories,
  defaultCategories,
  onCancel,
  onSubmit,
}: {
  initial: Budget | null;
  existingCategories: string[];
  defaultCategories: string[];
  onCancel: () => void;
  onSubmit: (draft: { category: string; limit: number }) => void;
}) {
  const options = useMemo(() => {
    const set = new Set<string>(defaultCategories);
    for (const c of existingCategories) set.add(c);
    if (initial?.category) set.add(initial.category);
    return [...set];
  }, [defaultCategories, existingCategories, initial]);

  const [category, setCategory] = useState(initial?.category ?? options[2] ?? "Makanan");
  const [limitText, setLimitText] = useState(initial ? String(initial.limit) : "");
  const [error, setError] = useState("");

  function submit() {
    const limit = Number(limitText.replace(/[^\d]/g, ""));
    if (!category.trim()) return setError("Pilih kategori.");
    if (!Number.isSafeInteger(limit) || limit <= 0) return setError("Batas harus angka bulat di atas 0.");
    onSubmit({ category: category.trim(), limit });
    onCancel();
  }

  return (
    <form
      className="flex flex-col gap-4 px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Kategori">
        <select className="os-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={Boolean(initial)}>
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Batas per bulan (Rp)">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-faint">Rp</span>
          <input
            className="os-input num !pl-11"
            value={limitText}
            onChange={(e) => setLimitText(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="500000"
            inputMode="numeric"
            autoFocus
          />
        </div>
      </Field>
      {error && <FormError message={error} />}
      <FormActions onCancel={onCancel} submitLabel="Simpan" />
    </form>
  );
}
