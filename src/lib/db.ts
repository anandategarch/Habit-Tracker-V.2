// ---------------------------------------------------------------------------
// Database client untuk Turso (libsql). Kompatibel dengan API Prisma yang
// dipakai di codebase (db.$queryRaw, db.$executeRaw, db.$transaction) supaya
// semua file yang import { db } tetap berfungsi tanpa perubahan.
//
// IMPORTANT: FULLY lazy initialization.
//   Vercel/Next.js build mengevaluasi module-level code di SEMUA route handlers
//   saat "collect page data". Pada build-time, DATABASE_URL belum ter-set
//   (env vars di-load saat runtime deploy). Kalau kita init libsql client di
//   module top-level, URL kosong → URL_INVALID error → build gagal.
//
//   Solusi: `db` adalah Proxy. Setiap property access ($queryRaw, $executeRaw,
//   dst) mengembalikan FUNCTION yang baru init libsql client saat dipanggil
//   (di runtime request), BUKAN saat di-access. Jadi `typeof db.$queryRaw`
//   atau destructure di build-time TIDAK trigger init → tidak throw.
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

type QueryRawFn = <T = LibsqlRow[]>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>
type ExecuteRawFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<number>
interface TxLike { $queryRaw: QueryRawFn; $executeRaw: ExecuteRawFn }
type TransactionFn = <T>(fn: (tx: TxLike) => Promise<T>) => Promise<T>
type ConnectFn = () => Promise<void>
type DisconnectFn = () => Promise<void>

function makeQueryRaw(client: Client): QueryRawFn {
  return async function <T = LibsqlRow[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    const { sql, args } = buildQuery(strings, ...values)
    const result = await client.execute({ sql, args })
    return (result.rows ?? []) as unknown as T
  }
}

function makeExecuteRaw(client: Client): ExecuteRawFn {
  return async function (strings: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    const { sql, args } = buildQuery(strings, ...values)
    const result = await client.execute({ sql, args })
    return Number(result.rowsAffected ?? 0)
  }
}

function makeTransaction(client: Client): TransactionFn {
  return async function <T>(fn: (tx: TxLike) => Promise<T>): Promise<T> {
    // libsql client tidak punya transaction batch native yang sederhana;
    // kita pakai pendekatan "best-effort" — jalankan fn dengan wrapper yang
    // pakai client yang sama. Operasi Rutina idempoten (ON CONFLICT) jadi aman.
    const tx: TxLike = {
      $queryRaw: makeQueryRaw(client),
      $executeRaw: makeExecuteRaw(client),
    }
    return fn(tx)
  }
}

// ---------------------------------------------------------------------------
// Lazy client holder — baru dibuat saat dipakai pertama kali (di runtime
// request, BUKAN saat module load di build-time).
// ---------------------------------------------------------------------------
let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client
  const url = process.env.DATABASE_URL ?? ""
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? undefined
  if (!url || url === "undefined") {
    throw new Error(
      "[db] DATABASE_URL kosong/invalid. Pastikan env var DATABASE_URL ter-set " +
      "(mis. di Vercel Project Settings > Environment Variables) dengan nilai " +
      "'libsql://...' (Turso database URL)."
    )
  }
  _client = createClient({
    url,
    authToken,
  })
  return _client
}

// ---------------------------------------------------------------------------
// `db` adalah Proxy. Property access mengembalikan LAZY FUNCTION yang baru
// init client saat DIPANGGIL. Jadi:
//   - Module load di build-time → Proxy dibuat, getClient() TIDAK dipanggil → aman
//   - `typeof db.$queryRaw` di build-time → return "function" tanpa init → aman
//   - `db.$queryRaw\`SELECT ...\`` di runtime request → init client, execute query
// ---------------------------------------------------------------------------
type DbApi = {
  $queryRaw: QueryRawFn
  $executeRaw: ExecuteRawFn
  $transaction: TransactionFn
  $connect: ConnectFn
  $disconnect: DisconnectFn
}

// Cache method implementations supaya tidak buat closure baru tiap property access.
let _lazyQueryRaw: QueryRawFn | null = null
let _lazyExecuteRaw: ExecuteRawFn | null = null
let _lazyTransaction: TransactionFn | null = null

function lazyQueryRaw(): QueryRawFn {
  if (_lazyQueryRaw) return _lazyQueryRaw
  _lazyQueryRaw = (async function (strings: TemplateStringsArray, ...values: unknown[]) {
    return makeQueryRaw(getClient())(strings, ...values)
  }) as QueryRawFn
  return _lazyQueryRaw
}

function lazyExecuteRaw(): ExecuteRawFn {
  if (_lazyExecuteRaw) return _lazyExecuteRaw
  _lazyExecuteRaw = (function (strings: TemplateStringsArray, ...values: unknown[]) {
    return makeExecuteRaw(getClient())(strings, ...values)
  }) as ExecuteRawFn
  return _lazyExecuteRaw
}

function lazyTransaction(): TransactionFn {
  if (_lazyTransaction) return _lazyTransaction
  _lazyTransaction = (function <T>(fn: (tx: TxLike) => Promise<T>): Promise<T> {
    return makeTransaction(getClient())(fn)
  }) as TransactionFn
  return _lazyTransaction
}

const LAZY_CONNECT: ConnectFn = async () => { /* libsql auto-connect; noop */ }
const LAZY_DISCONNECT: DisconnectFn = async () => {
  if (_client) { _client.close(); _client = null }
  _lazyQueryRaw = null
  _lazyExecuteRaw = null
  _lazyTransaction = null
}

const METHOD_MAP: Record<string, unknown> = {
  $queryRaw: lazyQueryRaw(),
  $executeRaw: lazyExecuteRaw(),
  $transaction: lazyTransaction(),
  $connect: LAZY_CONNECT,
  $disconnect: LAZY_DISCONNECT,
}

export const db = new Proxy({} as DbApi, {
  get(_target, prop: string | symbol) {
    if (typeof prop === "string" && prop in METHOD_MAP) {
      return METHOD_MAP[prop]
    }
    return undefined
  },
})

// Export libsql client getter (lazy) untuk script init-turso & admin.
export function getLibsql(): Client {
  return getClient()
}
