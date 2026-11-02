import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isTursoConfigured } from "@/lib/server/turso";

const COOKIE_NAME = "rutina_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

function getPassword(): string | null {
  const value = process.env.RUTINA_APP_PASSWORD?.trim();
  return value && value.length >= 12 ? value : null;
}

function getSessionSecret(): string | null {
  const value = process.env.RUTINA_SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

export function isSessionConfigurationValid(): boolean {
  return Boolean(getPassword() && getSessionSecret());
}

function signExpiry(expiry: string, secret: string): string {
  return createHmac("sha256", secret).update(`rutina-session:${expiry}`).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function hasValidSession(): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;

  const [expiry, signature] = value.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry)) return false;
  if (Number(expiry) <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(signature, signExpiry(expiry, secret));
}

export function getAuthSetupState(): {
  required: boolean;
  setupRequired: boolean;
} {
  const required = isTursoConfigured();
  return {
    required,
    setupRequired: required && !isSessionConfigurationValid(),
  };
}

export async function getAuthSessionState(): Promise<{
  required: boolean;
  setupRequired: boolean;
  authenticated: boolean;
}> {
  const state = getAuthSetupState();

  if (!state.required) {
    return { required: false, setupRequired: false, authenticated: true };
  }

  if (state.setupRequired) {
    return { ...state, authenticated: false };
  }

  return { ...state, authenticated: await hasValidSession() };
}

export async function authenticateWithPassword(password: string): Promise<boolean> {
  const configuredPassword = getPassword();
  return configuredPassword ? safeEqual(password, configuredPassword) : false;
}

export async function createSession(): Promise<void> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("RUTINA_SESSION_SECRET belum dikonfigurasi.");

  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS);
  const value = `${expiry}.${signExpiry(expiry, secret)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
