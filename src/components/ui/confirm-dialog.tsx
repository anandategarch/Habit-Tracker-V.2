"use client";

/**
 * Dialog konfirmasi tematik — pengganti window.confirm/alert/prompt bawaan
 * browser.
 *
 * Sebelumnya semua aksi hapus (dompet, tujuan, catatan, transfer, dst.),
 * peringatan validasi, dan input "Tambah dana" memakai dialog bawaan
 * browser, yang tampil sebagai popup polos dari domain vercel.app —
 * terasa keluar dari pengalaman Rutina. Komponen ini memakai bahasa visual
 * modal botanical (kartu krem, sudut membulat, ubin ikon pastel, tombol
 * koral lembut untuk aksi destruktif) dengan tone tanpa rasa bersalah
 * sesuai docs/design-system.md: jujur tentang konsekuensi, tanpa
 * menakut-nakuti.
 */

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";

export type ConfirmTone = "danger" | "leaf" | "amber";

/** Konfigurasi input opsional — pengganti window.prompt(). */
export interface ConfirmPromptConfig {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: "numeric" | "decimal" | "text";
  /** Awalan sebelum input, mis. "Rp". */
  prefix?: string;
  /** Batas panjang karakter input (default 30). */
  maxLength?: number;
}

export interface ConfirmRequest {
  /** Judul pertanyaan singkat, mis. "Hapus dompet?" */
  title: string;
  /** Nama item yang ditampilkan sebagai chip (opsional). */
  subject?: string;
  /** Satu-dua kalimat penjelas konsekuensi, tanpa nada menghakimi. */
  message: string;
  /** Catatan tambahan di kotak kecil, mis. peringatan tidak bisa dibatalkan. */
  note?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Sembunyikan tombol batal (untuk pesan informasi/peringatan). */
  hideCancel?: boolean;
  tone?: ConfirmTone;
  /** Ikon kustom di ubin atas (default: Trash2 untuk danger, ShieldAlert untuk lainnya). */
  icon?: typeof Trash2;
  /** Input opsional; nilainya diteruskan ke onConfirm. */
  prompt?: ConfirmPromptConfig;
  /** Validator ringan: return string pesan error, atau undefined bila valid. */
  validate?: (value: string) => string | undefined;
  /** Dipanggil dengan nilai input (bila ada) saat dikonfirmasi. */
  onConfirm: (value?: string) => void;
}

interface ConfirmApi {
  confirm: (request: ConfirmRequest) => void;
}

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm harus dipakai di dalam <ConfirmProvider>.");
  return context;
}

interface ActiveRequest extends ConfirmRequest {
  /** Penanda unik agar dialog yang sama dirender ulang bersih (animasi masuk). */
  key: number;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ActiveRequest | null>(null);
  const counterRef = useRef(0);
  // Bayangan request di ref: dibaca saat aksi dijalankan agar tidak
  // memicu efek ganda saat StrictMode double-invoke updater setState.
  const requestRef = useRef<ActiveRequest | null>(null);
  useEffect(() => { requestRef.current = request; }, [request]);

  const confirm = useCallback((incoming: ConfirmRequest) => {
    counterRef.current += 1;
    setRequest({ ...incoming, key: counterRef.current });
  }, []);

  const close = useCallback(() => setRequest(null), []);

  const runConfirm = useCallback((value?: string) => {
    const current = requestRef.current;
    setRequest(null);
    if (current) current.onConfirm(value);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {request && (
        <ConfirmDialog
          key={request.key}
          request={request}
          onConfirm={runConfirm}
          onCancel={close}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ request, onConfirm, onCancel }: {
  request: ActiveRequest;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [value, setValue] = useState(request.prompt?.defaultValue ?? "");
  const [error, setError] = useState("");
  const maxLength = request.prompt?.maxLength ?? 30;
  const tone: ConfirmTone = request.tone ?? "danger";
  const Icon = request.icon ?? (tone === "danger" ? Trash2 : ShieldAlert);
  const confirmLabel = request.confirmLabel ?? (tone === "danger" ? "Ya, hapus" : "Lanjutkan");
  const cancelLabel = request.cancelLabel ?? "Batal";
  // Referensi terbaru untuk aksi agar Escape setelah re-render tetap benar.
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);

  // Kunci scroll body + kembalikan fokus ke elemen sebelumnya (pola EntryModal).
  // Fokus awal: input prompt bila ada, jika tidak tombol batal (default aman).
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimeout = window.setTimeout(() => {
      if (request.prompt) inputRef.current?.focus();
      else cancelRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimeout);
      previousFocus?.focus();
    };
  }, [request.prompt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = request.validate?.(value);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    onConfirmRef.current(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelRef.current();
      return;
    }
    if (event.key !== "Tab" || !cardRef.current) return;
    const elements = Array.from(cardRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    if (elements.length === 0) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancelRef.current(); }}
    >
      <div
        ref={cardRef}
        className="modal-card confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        onKeyDown={handleKeyDown}
      >
        <span className={`confirm-icon-tile tone-${tone}`} aria-hidden="true">
          <Icon size={21} strokeWidth={1.9} />
        </span>
        <div className={`eyebrow confirm-eyebrow tone-${tone}`}>
          {tone === "danger" ? "PERIKSA SEBELUM MELANJUTKAN" : tone === "amber" ? "SEKILAS CATATAN" : "SEKILAS INFO"}
        </div>
        <h2 className="modal-title" id="confirm-modal-title">{request.title}</h2>
        {request.subject && <span className="confirm-subject" title={request.subject}>{request.subject}</span>}
        <p className="confirm-message" id="confirm-modal-message">{request.message}</p>
        {request.note && (
          <div className="confirm-note">
            <ShieldAlert size={15} aria-hidden="true" />
            <p>{request.note}</p>
          </div>
        )}
        <form onSubmit={submit}>
          {request.prompt && (
            <label className="confirm-prompt-field" htmlFor={fieldId}>
              <span className="form-label">{request.prompt.label}</span>
              <div className="amount-field">
                {request.prompt.prefix && <span aria-hidden="true">{request.prompt.prefix}</span>}
                <input
                  ref={inputRef}
                  id={fieldId}
                  className="form-control"
                  inputMode={request.prompt.inputMode ?? "text"}
                  placeholder={request.prompt.placeholder}
                  value={value}
                  maxLength={maxLength}
                  onChange={(event) => { setValue(event.target.value); setError(""); }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              {error && <span id={errorId} className="field-error" role="alert">{error}</span>}
            </label>
          )}
          <div className={`confirm-actions${request.hideCancel ? " is-single" : ""}`}>
            {!request.hideCancel && (
              <button ref={cancelRef} type="button" className="secondary-button confirm-cancel-button" onClick={() => onCancelRef.current()}>
                {cancelLabel}
              </button>
            )}
            <button
              type="submit"
              className={tone === "danger" ? "confirm-danger-button" : "primary-button confirm-safe-button"}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Versi kenyamanan untuk pola lama `confirmRemove(label, action)`:
 * mengurai label seperti `dompet "Bank utama"` menjadi judul, chip nama,
 * dan pesan yang hangat. Call site lama cukup menukar helper modul
 * menjadi hook ini — signature-nya identik.
 */
export function useConfirmRemove() {
  const { confirm } = useConfirm();
  return useCallback((label: string, action: () => void) => {
    const match = /^(.+?)\s+"(.+)"$/.exec(label);
    const kind = (match?.[1] ?? label).trim();
    const subject = match?.[2];
    // Catatan khusus per jenis item — jujur tentang apa yang tersisa.
    const notes: Record<string, string> = {
      dompet: "Catatan transaksi dan riwayat transfer tidak ikut terhapus — hanya dompetnya yang keluar dari daftar.",
      grup: "Kebiasaan di dalam grup tetap aman, hanya label grupnya yang hilang.",
      kebiasaan: "Streak, progres jumlah, dan riwayat mingguan kebiasaan ini ikut terhapus.",
      transaksi: "Ringkasan bulanan dan insight akan dihitung ulang tanpa transaksi ini.",
    };
    confirm({
      tone: "danger",
      title: `Hapus ${kind}?`,
      subject,
      message: subject
        ? `${capitalize(kind)} "${subject}" akan dihapus dari daftar.`
        : `${capitalize(kind)} akan dihapus dari daftar.`,
      note: notes[kind] ?? "Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, hapus",
      onConfirm: action,
    });
  }, [confirm]);
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("id-ID") + value.slice(1);
}
