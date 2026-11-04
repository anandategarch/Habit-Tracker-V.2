"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_DISMISS_KEY = "rutina.install-dismissed";
const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Tombol bisa disembunyikan 7 hari (di iOS beforeinstallprompt tidak
    // pernah fire — ikon download menempati topbar permanen tanpa ini).
    try {
      const at = Number(window.localStorage.getItem(INSTALL_DISMISS_KEY) || 0);
      if (at && Date.now() - at < INSTALL_DISMISS_MS) setDismissed(true);
    } catch { /* abaikan */ }

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => {
      setInstalled(
        displayMode.matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    updateInstalledState();
    displayMode.addEventListener("change", updateInstalledState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      displayMode.removeEventListener("change", updateInstalledState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      setHelpOpen(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  function dismissInstall() {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch { /* abaikan */ }
  }

  if (installed || dismissed) return null;

  return (
    <>
      <button
        className="icon-button pwa-install-trigger"
        type="button"
        aria-label="Pasang Rutina di layar utama"
        title="Pasang Rutina"
        onClick={() => void handleInstall()}
      >
        <Download size={17} />
      </button>
      {helpOpen && (
        <div
          className="pwa-help-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <section className="pwa-help-card" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title">
            <div className="pwa-help-heading">
              <div>
                <div className="eyebrow">AKSES LEBIH CEPAT</div>
                <h2 id="pwa-help-title">Pasang Rutina di HP</h2>
              </div>
              <div className="pwa-help-heading-actions">
                <button className="text-button" type="button" onClick={() => { dismissInstall(); setHelpOpen(false); }}>Sembunyikan 7 hari</button>
                <button className="icon-button" type="button" aria-label="Tutup panduan" onClick={() => setHelpOpen(false)}>
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="pwa-help-step">
              <strong>Android</strong>
              <p>Buka menu browser (⋮), lalu pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</p>
            </div>
            <div className="pwa-help-step">
              <strong>iPhone</strong>
              <p>Buka halaman ini di Safari, tekan tombol <b>Bagikan</b> <Share2 size={14} aria-hidden="true" />, pilih <b>Tambahkan ke Layar Utama</b>, lalu tekan <b>Tambah</b>.</p>
            </div>
            <p className="pwa-help-note">Setelah terpasang, buka Rutina dari ikon di layar utama. Login Vercel tetap diperlukan untuk mengakses workspace.</p>
          </section>
        </div>
      )}
    </>
  );
}
