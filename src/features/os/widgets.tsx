"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "@/features/os/os-icons";

/* ==========================================================================
   RUTINA OS — data visualization kit
   Hand-built SVG widgets: rings, sparklines, bars, heat strips, donuts.
   Every chart exposes role="img" + aria-label for screen readers.
   ========================================================================== */

/* ---------- progress ring ---------- */

export function Ring({
  value,
  size = 96,
  thickness = 9,
  centerTop,
  centerBottom,
  tone = "accent",
  label,
}: {
  value: number; // 0..1
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerBottom?: string;
  tone?: "accent" | "amber" | "crimson";
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = tone === "accent" ? "#37d99a" : tone === "amber" ? "#f2b64c" : "#f37272";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1c241e" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: "stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      {(centerTop || centerBottom) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerTop && (
            <span className={`num font-semibold leading-none text-ink ${size < 70 ? "text-[14px]" : "text-[19px]"}`}>{centerTop}</span>
          )}
          {centerBottom && <span className="os-micro mt-1 !text-[9px]">{centerBottom}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- sparkline ---------- */

export function Sparkline({
  values,
  width = 132,
  height = 40,
  color = "#37d99a",
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  label: string;
}) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" className="rounded-md border border-dashed border-line" />;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 0.0001);
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 3 - ((v - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={area} fill={color} fillOpacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------- bar chart ---------- */

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}

export function Bars({ data, height = 108, tone = "accent", label }: { data: BarDatum[]; height?: number; tone?: "accent" | "crimson" | "amber"; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const color = tone === "accent" ? "#37d99a" : tone === "amber" ? "#f2b64c" : "#f37272";
  return (
    <div role="img" aria-label={label}>
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((d, i) => {
          const pct = d.value === 0 ? 2 : Math.max(4, Math.round((d.value / max) * 100));
          return (
            <div key={`${d.label}-${i}`} className="flex h-full flex-1 flex-col justify-end" title={d.hint ?? `${d.label}: ${d.value}`}>
              <div
                className="w-full rounded-t-[4px] transition-all duration-300"
                style={{
                  height: `${pct}%`,
                  background: d.value === 0 ? "#161d17" : d.highlight ? color : `${color}66`,
                  border: d.value === 0 ? "1px solid #1f2721" : "1px solid transparent",
                  borderRadius: "4px 4px 2px 2px",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d, i) => (
          <span key={`${d.label}-l-${i}`} className="flex-1 text-center text-[10px] font-medium text-faint">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- habit heat strip ---------- */

export type HeatState = "done" | "miss" | "off" | "future";

export function HeatStrip({ cells, label }: { cells: Array<{ date: string; state: HeatState; title: string }>; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-[3px]">
      {cells.map((cell) => (
        <span
          key={cell.date}
          title={cell.title}
          className="h-[13px] w-[13px] rounded-[3px] sm:h-[15px] sm:w-[15px]"
          style={{
            background:
              cell.state === "done" ? "#37d99a" : cell.state === "miss" ? "#232d24" : cell.state === "off" ? "#141a15" : "transparent",
            border: cell.state === "future" ? "1px dashed #232d24" : cell.state === "miss" ? "1px solid #2c362e" : cell.state === "off" ? "1px solid #1f2721" : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ---------- donut ---------- */

export const DONUT_PALETTE = ["#37d99a", "#f2b64c", "#ec8b5f", "#f37272", "#a3e635", "#8aa892", "#cbb682", "#5c8a6b", "#d97fb0", "#9db8a5"];

export interface DonutSlice {
  label: string;
  value: number;
}

export function Donut({ slices, size = 150, thickness = 16, label }: { slices: DonutSlice[]; size?: number; thickness?: number; label: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a211b" strokeWidth={thickness} />
      {total > 0 &&
        slices.map((slice, i) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(dash - 2, 0.1)} ${circumference - dash + 2}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
    </svg>
  );
}

/* ---------- progress bar ---------- */

export function ProgressBar({
  value,
  max,
  tone = "accent",
  label,
}: {
  value: number;
  max: number;
  tone?: "accent" | "amber" | "crimson";
  label?: string;
}) {
  const ratio = max <= 0 ? 0 : Math.min(1, value / max);
  const over = max > 0 && value > max;
  const color = over ? "#f37272" : tone === "amber" ? "#f2b64c" : "#37d99a";
  return (
    <div
      className="h-[7px] w-full overflow-hidden rounded-full bg-[#1a211b]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${ratio * 100}%`, background: color }}
      />
    </div>
  );
}

/* ---------- KPI stat tile ---------- */

export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = "default",
  right,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: "default" | "accent" | "crimson" | "amber";
  right?: ReactNode;
}) {
  const toneColor = tone === "accent" ? "text-accent" : tone === "crimson" ? "text-crimson" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="os-card os-card-hover flex min-w-0 flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="os-micro truncate">{label}</span>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className={`num block truncate text-[24px] font-semibold leading-tight tracking-[-0.01em] ${toneColor}`}>{value}</span>
          {sub && <span className="mt-1 block text-[11.5px] leading-snug text-dim [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{sub}</span>}
        </div>
        {right && <div className="shrink-0 pb-0.5">{right}</div>}
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel2 text-dim">{icon}</span>
      <div>
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        {hint && <p className="mt-1 max-w-[300px] text-[12.5px] leading-relaxed text-dim">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- dialog shell (radix) ---------- */

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="os-overlay" />
        <Dialog.Content className="os-dialog" style={wide ? { width: "min(600px, calc(100vw - 32px))" } : undefined}>
          <span
            className="mx-auto mt-2.5 mb-1 block h-1 w-10 rounded-full bg-[#2c362e] sm:hidden"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="text-[15px] font-semibold text-ink">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 text-[12.5px] text-dim">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Tutup"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-dim transition-colors hover:border-line2 hover:text-ink"
              >
                <XIcon size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="os-safe-bottom min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- confirm dialog ---------- */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="os-overlay" />
        <Dialog.Content className="os-dialog" style={{ width: "min(400px, calc(100vw - 32px))" }}>
          <div className="px-5 py-5">
            <Dialog.Title className="text-[15px] font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Description className="mt-1.5 text-[13px] leading-relaxed text-dim">{description}</Dialog.Description>
            <div className="mt-5 flex justify-end gap-2.5">
              <Dialog.Close asChild>
                <button type="button" className="os-btn">
                  Batal
                </button>
              </Dialog.Close>
              <button
                type="button"
                className={`os-btn ${danger ? "os-btn-danger" : "os-btn-primary"}`}
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- micro section header ---------- */

export function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="os-micro">{title}</h2>
      {right}
    </div>
  );
}
