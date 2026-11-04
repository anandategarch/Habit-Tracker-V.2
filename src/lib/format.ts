const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value).replace(/\u00a0/g, " ");
}

export function formatCompactRupiah(value: number): string {
  // Pembulatan selalu ke BAWAH (floor) agar tidak pernah melebihkan nilai:
  // 999.999 tampil "Rp 999 rb" (bukan "Rp 1.000 rb" yang menyesatkan).
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = Math.floor(abs / 100_000) / 10;
    return `${sign}Rp ${millions.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.floor(abs / 1_000).toLocaleString("id-ID")} rb`;
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
