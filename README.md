# Rutina

Rutina adalah ruang pribadi untuk membangun kebiasaan, mengatur fokus, dan memahami arus keuangan harian dalam satu pengalaman yang tenang dan konsisten.

## Prinsip produk

- **Mobile-first:** navigasi utama mudah dijangkau dengan satu tangan.
- **Clarity over decoration:** informasi penting tampil lebih dahulu; dekorasi tidak mengalahkan fungsi.
- **One design language:** warna, tipografi, radius, spacing, elevasi, dan interaksi memakai token bersama.
- **Feature boundaries:** setiap domain (Habit, Finance, Calendar, Insights) dipisahkan dari shell aplikasi.
- **Accessible by default:** kontrol memiliki label, fokus terlihat, dan animasi menghormati preferensi reduced-motion.

## Stack

- Next.js App Router
- React + TypeScript (strict)
- Tailwind CSS v4 + CSS design tokens
- Lucide icons
- Turso (libSQL) untuk penyimpanan cloud melalui server-side API\n- LocalStorage sebagai mode demo/fallback dan sumber migrasi awal

Node.js minimum: **20.9**.

## Jalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Perintah pemeriksaan:

```bash
npm run typecheck
npm run lint
npm run build
```

## Struktur

```text
src/
  app/                 # Route, root layout, global styles
  features/
    app/               # App shell, navigation, and feature views
  lib/                 # Domain types, formatting, seed data
docs/
  design-system.md     # Tokens and UI rules
  architecture.md      # Boundaries and conventions
```

## Database Turso

Rutina menggunakan `@libsql/client` pada server Next.js. Kredensial tidak pernah dikirim ke browser.

Tabel yang dibuat otomatis pada request workspace pertama:
- `habits` — definisi kebiasaan.
- `habit_checkins` — check-in per tanggal.
- `transactions` — pemasukan dan pengeluaran (integer Rupiah).
- `budgets` — batas anggaran per kategori.

SQL awal tersedia di `db/migrations/0001_initial.sql`. API memastikan tabel tersedia secara idempoten sebelum membaca/menulis data. Pada koneksi pertama ke database kosong, data LocalStorage yang sudah ada akan dipindahkan ke Turso.

### Environment variables

Salin `.env.example` ke `.env.local` untuk lokal, lalu isi:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `RUTINA_APP_PASSWORD` (minimal 12 karakter)
- `RUTINA_SESSION_SECRET` (minimal 32 karakter; buat dengan `openssl rand -base64 32`)

Di Vercel tambahkan ke **Project → Settings → Environment Variables** untuk Production/Preview sesuai kebutuhan, kemudian redeploy. Jangan memakai prefix `NEXT_PUBLIC_` dan jangan commit `.env.local`.

Saat Turso aktif, Rutina mengunci API data dengan password satu pemilik dan cookie sesi HttpOnly selama 14 hari. Ini bukan autentikasi multi-pengguna; jangan bagikan password aplikasi. Saat variabel Turso belum tersedia, aplikasi tetap berjalan dalam mode demo LocalStorage.

## Aturan kontribusi

Baca `AGENTS.md`, `docs/design-system.md`, dan `docs/architecture.md` sebelum menambah fitur atau mengubah visual.
