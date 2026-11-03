import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SQLite error 14 ("Unable to open database file") bisa muncul sebentar saat
// dev server HMR membuat PrismaClient baru atau saat migrasi paralel mengunci
// file DB. Kita pakai global singleton + log error saja; koneksi akan
// otomatis di-reset oleh Prisma pada operasi berikutnya.
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ['error', 'warn'],
  })
  // Pastikan DB bisa di-reconnect kalau proses Node hidup lagi (mis. after crash).
  globalForPrisma.prisma.$connect().catch((error) => {
    console.error('[db] Gagal koneksi awal ke SQLite:', error)
  })
}

export const db = globalForPrisma.prisma
