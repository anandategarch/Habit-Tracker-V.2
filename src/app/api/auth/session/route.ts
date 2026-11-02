import { NextResponse } from "next/server";
import { getAuthSessionState } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getAuthSessionState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
