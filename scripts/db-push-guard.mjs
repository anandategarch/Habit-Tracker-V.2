// Guard untuk `bun run db:push` (dipanggil .zscripts/dev.sh setiap boot container).
//
// MASALAH: prisma/schema.prisma tidak memodelkan tabel yang dikelola SQL manual
// (finance_categories, dsb). `prisma db push` menyinkronkan schema -> DB dan bisa
// MEN-DROP tabel yang tidak ada di schema. Kalau DATABASE_URL menunjuk remote
// Turso (data produksi user), db push akan merusak data.
//
// KEPUTUSAN: prisma db push hanya boleh berjalan untuk file SQLite lokal.
// Remote Turso selalu dilewati dengan pesan yang jelas.
const url = process.env.DATABASE_URL ?? "";

if (url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("ws://") || url.startsWith("wss://")) {
  console.log("[db:push] Dilewati — DATABASE_URL menunjuk remote Turso (data produksi).");
  console.log("[db:push] prisma db push hanya untuk basis SQLite lokal; tabel Turso dikelola migrasi eksplisit.");
  process.exit(0);
}

if (!url) {
  console.error("[db:push] DATABASE_URL kosong — tidak bisa menjalankan prisma db push.");
  process.exit(1);
}

// Basis lokal (file:) — aman menjalankan prisma db push.
const { execSync } = await import("node:child_process");
console.log(`[db:push] DATABASE_URL lokal (${url.slice(0, 60)}…) — menjalankan prisma db push…`);
execSync("prisma db push", { stdio: "inherit" });
