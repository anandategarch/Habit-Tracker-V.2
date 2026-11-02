import { NextResponse } from "next/server";
import {
  authenticateWithPassword,
  createSession,
  getAuthSetupState,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authState = getAuthSetupState();

  if (!authState.required) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 400 });
  }

  if (authState.setupRequired) {
    return NextResponse.json(
      { error: "Konfigurasi password aplikasi belum lengkap." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const password =
    typeof body === "object" && body !== null && "password" in body &&
    typeof body.password === "string"
      ? body.password
      : "";

  if (!(await authenticateWithPassword(password))) {
    return NextResponse.json({ error: "Password tidak sesuai." }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
