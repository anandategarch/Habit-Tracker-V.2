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
// v0.27: prisma CLI tidak lagi terpasang di proyek ini (klien DB memakai
// @libsql/client; skema dikelola lewat db/migrations). Kalau CLI tidak ada,
// cukup pastikan file basis data lokal sudah terinisialisasi lalu lanjut —
// boot container tidak boleh gagal hanya karena prisma tidak terpasang.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const prismaAvailable = spawnSync("prisma", ["--version"], { stdio: "ignore", shell: true }).status === 0;
const localPath = url.replace(/^file:/, "").replace(/\?.*$/, "");

if (!prismaAvailable) {
  if (existsSync(localPath)) {
    console.log("[db:push] Dilewati — basis data lokal sudah terinisialisasi dan prisma CLI tidak terpasang.");
    console.log("[db:push] Skema dikelola lewat db/migrations (klien: @libsql/client).");
    process.exit(0);
  }
  console.error("[db:push] Basis data lokal belum ada dan prisma CLI tidak terpasang — jalankan migrasi db/migrations terlebih dahulu.");
  process.exit(1);
}

const { execSync } = await import("node:child_process");
console.log(`[db:push] DATABASE_URL lokal (${url.slice(0, 60)}…) — menjalankan prisma db push…`);
execSync("prisma db push", { stdio: "inherit" });
