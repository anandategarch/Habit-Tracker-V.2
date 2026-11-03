const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value).replace(/\u00a0/g, " ");
}

export function formatCompactRupiah(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  }
  return formatRupiah(value);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    ...(options ?? {}),
  }).format(new Date(`${value}T00:00:00`));
}

export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
