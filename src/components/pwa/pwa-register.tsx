"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Registrasi Service Worker + banner "ada pembaruan".
 *
 * sw.js memanggil skipWaiting() + clients.claim(). Tanpa UI update, PWA
 * terpasang bisa berjalan dengan shell lama/setengah baru (HTML network-only,
 * aset cache-first) dan pengguna tidak pernah diberi tahu untuk memuat ulang.
 * Di sini kita dengarkan "updatefound" → worker baru "installed" → tampilkan
 * banner dismissible dengan tombol "Muat ulang".
 */
export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    let cancelled = false;

    const onNewWorkerState = (worker: ServiceWorker) => {
      if (cancelled) return;
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        // Worker baru menunggu aktif — tawarkan reload agar versi baru dipakai.
        setUpdateReady(true);
      }
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        registration = reg;
        // Worker sudah menunggu (terpasang sebelum listener aktif)?
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => onNewWorkerState(worker));
        });
      })
      .catch(() => {
        // PWA installation remains optional when service workers are unavailable.
      });

    // Reload otomatis saat controller berganti (setelah skipWaiting).
    const onControllerChange = () => {
      if (!cancelled) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration?.removeEventListener?.("updatefound", () => {});
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="pwa-update-banner" role="alert">
      <span>Versi baru Rutina tersedia.</span>
      <div className="pwa-update-actions">
        <button
          type="button"
          className="pwa-update-reload"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={13} /> Muat ulang
        </button>
        <button
          type="button"
          className="pwa-update-dismiss"
          aria-label="Tutup pemberitahuan pembaruan"
          onClick={() => setUpdateReady(false)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
