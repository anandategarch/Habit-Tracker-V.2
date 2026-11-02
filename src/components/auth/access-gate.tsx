import type { FormEvent } from "react";
import { LockKeyhole, Sprout } from "lucide-react";

interface AccessGateProps {
  mode: "loading" | "setup" | "login";
  loading?: boolean;
  error?: string;
  onSubmit?: (password: string) => void;
}

export function AccessGate({ mode, loading = false, error, onSubmit }: AccessGateProps) {
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
            <h1>Database hampir siap.</h1>
            <p>Tambahkan dua environment variable keamanan di Vercel sebelum membuka data Rutina.</p>
            <div className="access-env-list">
              <code>RUTINA_APP_PASSWORD</code>
              <code>RUTINA_SESSION_SECRET</code>
            </div>
            <p className="access-footnote">Password minimal 12 karakter. Secret sesi minimal 32 karakter. Setelah menyimpannya, deploy ulang aplikasi.</p>
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
