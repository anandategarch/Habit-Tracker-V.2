import "server-only";

import { createClient, type Client } from "@libsql/client";

let cachedClient: Client | null = null;

export function isTursoConfigured(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
    process.env.TURSO_AUTH_TOKEN?.trim()
  );
}

export function getTursoClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    throw new Error("Turso belum dikonfigurasi. Isi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN.");
  }

  if (!cachedClient) {
    cachedClient = createClient({ url, authToken });
  }

  return cachedClient;
}
