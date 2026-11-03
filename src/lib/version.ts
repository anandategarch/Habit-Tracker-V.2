/**
 * Versi aplikasi Rutina.
 *
 * Menyatukan satu sumber kebenaran untuk nomor versi yang ditampilkan di UI
 * (footer, pengaturan, debug) dan yang dipakai logika runtime. Saat versi naik,
 * ubah `APP_VERSION` di bawah. `BUILD_DATE` diisi otomatis saat build.
 */
export const APP_VERSION = "0.8.1";

export const APP_BUILD_DATE = (() => {
  // Format ISO pendek (YYYY-MM-DD). Tidak di-cache supaya selalu fresh
  // saat Vercel rebuild, dan hanya membaca sekali per modul.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
})();

/** Label lengkap untuk ditampilkan: "v0.2.1 · 2026-11-03". */
export const APP_VERSION_LABEL = `v${APP_VERSION} · ${APP_BUILD_DATE}`;
