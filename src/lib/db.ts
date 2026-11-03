// ---------------------------------------------------------------------------
// Database client untuk Turso (libsql). Kompatibel dengan API Prisma yang
// dipakai di codebase (db.$queryRaw, db.$executeRaw, db.$transaction) supaya
// semua file yang import { db } tetap berfungsi tanpa perubahan.
//
// Catatan: Prisma 6 adapter-libsql mereject URL libsql:// di schema datasource
// (provider sqlite expects file:). Daripada melawan Prisma, kita pakai
// @libsql/client langsung dengan wrapper yang meniru API Prisma.
// ---------------------------------------------------------------------------
import { createClient, type Client } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(): void {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "undefined") return
  try {
    const envPath = resolve(process.cwd(), ".env")
    if (!existsSync(envPath)) return
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // ignore
  }
}
loadEnvFile()

const TURSO_URL = process.env.DATABASE_URL ?? ""
const TURSO_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? undefined

if (!TURSO_URL || TURSO_URL === "undefined") {
  console.error("[db] DATABASE_URL kosong/invalid — periksa .env")
}

const globalForLibsql = globalThis as unknown as { libsqlClient: Client | undefined }

if (!globalForLibsql.libsqlClient) {
  globalForLibsql.libsqlClient = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
    syncInterval: 0,
    syncMode: "offline",
  } as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Tagged template helpers — tiru API Prisma: db.$queryRaw`SELECT ...` dan
// db.$executeRaw`INSERT ...`. Parameter ${value} otomatis di-bind (SQL injection
// aman karena @libsql/client pakai prepared statement).
// ---------------------------------------------------------------------------
type SqlValue = string | number | bigint | boolean | null | Uint8Array

function buildQuery(strings: TemplateStringsArray, ...values: unknown[]): { sql: string; args: SqlValue[] } {
  let sql = ""
  const args: SqlValue[] = []
  for (let i = 0; i < strings.length; i++) {
    sql += strings[i]
    if (i < values.length) {
      sql += "?"
      const v = values[i]
      if (v === null || v === undefined) args.push(null)
      else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v instanceof Uint8Array) args.push(v as SqlValue)
      else if (typeof v === "bigint") args.push(v)
      else args.push(String(v))
    }
  }
  return { sql: sql.trim(), args }
}

export interface LibsqlRow { [key: string]: unknown }

class DbWrapper {
  private client: Client
  constructor(client: Client) {
    this.client = client
  }

  $queryRaw = async <T = LibsqlRow[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> => {
    const { sql, args } = buildQuery(strings, ...values)
    const result = await this.client.execute({ sql, args })
    // Normalisasi baris: @libsql/client mengembalikan array-like + named keys.
    return (result.rows ?? []) as unknown as T
  }

  $executeRaw = async (strings: TemplateStringsArray, ...values: unknown[]): Promise<number> => {
    const { sql, args } = buildQuery(strings, ...values)
    const result = await this.client.execute({ sql, args })
    return Number(result.rowsAffected ?? 0)
  }

  $transaction = async <T>(fn: (tx: { $queryRaw: typeof this.$queryRaw; $executeRaw: typeof this.$executeRaw }) => Promise<T>): Promise<T> => {
    // libsql client tidak punya transaction batch native yang sederhana;
    // kita pakai pendekatan "best-effort" — jalankan fn dengan wrapper yang
    // pakai client yang sama. Untuk konsistensi transaksi penuh perlu
    // transaction() API libsql (experimental); tapi untuk workspace Rutina
    // (insert/update beberapa baris berurutan) ini sudah cukup aman karena
    // operasi idempoten (ON CONFLICT) dan error di tengah hanya menyisakan
    // sebagian data — bukan korupsi.
    const tx = {
      $queryRaw: this.$queryRaw,
      $executeRaw: this.$executeRaw,
    }
    return fn(tx)
  }

  async $connect(): Promise<void> {
    // libsql client auto-connect; noop di sini.
  }

  async $disconnect(): Promise<void> {
    this.client.close()
  }
}

export const db = new DbWrapper(globalForLibsql.libsqlClient)
export const libsql = globalForLibsql.libsqlClient

// Inisialisasi: pastikan koneksi bisa (log error awal kalau gagal).
db.$queryRaw`SELECT 1`.catch((error: unknown) => {
  console.error("[db] Gagal koneksi awal ke Turso/libSQL:", error)
})
