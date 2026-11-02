import type { FormEvent } from "react";
import { LockKeyhole, Sprout } from "lucide-react";

interface AccessGateProps {
  mode: "loading" | "setup" | "login";
  loading?: boolean;
  error?: string;
  onSubmit?: (password: string) => void;
  setupStatus?: {
    passwordReady: boolean;
    sessionSecretReady: boolean;
  };
}

export function AccessGate({ mode, loading = false, error, onSubmit, setupStatus }: AccessGateProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit?.(String(formData.get("password") ?? ""));
  }

  return (
    <main className="access-screen">
      <div className="access-orbit access-orbit-one" />
      <div className="access-orbit access-orbit-two" />
      <section className="access-card">
        <div className="access-brand">
          <span className="brand-mark"><Sprout size={22} /></span>
          <span>rutina.</span>
        </div>

        {mode === "loading" ? (
          <div className="access-loading">
            <span className="access-spinner" />
            <h1>Menyiapkan ruangmu</h1>
            <p>Menghubungkan Rutina dengan penyimpanan data.</p>
          </div>
        ) : mode === "setup" ? (
          <div className="access-copy">
            <span className="access-icon"><LockKeyhole size={20} /></span>
            <p className="eyebrow">PENGATURAN KEAMANAN</p>
            <h1>Konfigurasi keamanan belum terbaca.</h1>
            <p>Server deployment ini belum mendeteksi kedua variabel keamanan dengan panjang minimum. Kolom password memang belum dibuka sampai keduanya valid.</p>
            <div className="access-env-list">
              <div className={`access-env-row ${setupStatus?.passwordReady ? "ready" : "missing"}`}>
                <code>RUTINA_APP_PASSWORD</code>
                <span>{setupStatus?.passwordReady ? "Terbaca · valid" : "Tidak terbaca atau kurang dari 12 karakter"}</span>
              </div>
              <div className={`access-env-row ${setupStatus?.sessionSecretReady ? "ready" : "missing"}`}>
                <code>RUTINA_SESSION_SECRET</code>
                <span>{setupStatus?.sessionSecretReady ? "Terbaca · valid" : "Tidak terbaca atau kurang dari 32 karakter"}</span>
              </div>
            </div>
            <p className="access-footnote">Periksa nama variabel dan Environment scope di Vercel. Gunakan Production untuk deployment utama atau Preview untuk URL preview. Setelah mengubah Environment Variables, buat deployment baru; deployment lama tidak otomatis menerima perubahan.</p>
          </div>
        ) : (
          <div className="access-copy">
            <span className="access-icon"><LockKeyhole size={20} /></span>
            <p className="eyebrow">RUANG PRIBADIMU</p>
            <h1>Selamat datang kembali.</h1>
            <p>Masukkan password untuk membuka habit dan catatan keuanganmu.</p>
            <form className="access-form" onSubmit={handleSubmit}>
              <label htmlFor="rutina-password">Password aplikasi</label>
              <input
                id="rutina-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                required
                minLength={12}
              />
              {error && <p className="access-error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Memeriksa..." : "Masuk ke Rutina"}
              </button>
            </form>
            <p className="access-footnote">Sesi login akan aktif selama 14 hari pada perangkat ini.</p>
          </div>
        )}
      </section>
    </main>
  );
}
