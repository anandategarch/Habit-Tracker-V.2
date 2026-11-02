# Koneksi Database Turso

## Runtime configuration

Semua kredensial hanya digunakan di server Next.js:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Jangan gunakan prefix `NEXT_PUBLIC_` dan jangan commit token ke repository.

## App access gate

Ketika Turso aktif, workspace dilindungi dengan password satu pemilik:

- `RUTINA_APP_PASSWORD`: password unik minimal 12 karakter.
- `RUTINA_SESSION_SECRET`: secret acak minimal 32 karakter, untuk menandatangani cookie sesi.

Cookie sesi menggunakan HttpOnly, SameSite=Strict, Secure pada production, dan masa berlaku 14 hari.

## Setup Vercel

Buka Project Settings → Environment Variables dan tambahkan ke environment yang digunakan:

1. `TURSO_DATABASE_URL` — URL database.
2. `TURSO_AUTH_TOKEN` — token database baru yang masih aktif.
3. `RUTINA_APP_PASSWORD` — password aplikasi.
4. `RUTINA_SESSION_SECRET` — hasil generate secret random.

Deploy ulang setelah menambahkan variabel. Jangan paste nilai rahasia ke chat atau commit.

Contoh untuk membuat session secret di terminal:

```bash
openssl rand -base64 32
```

## Schema dan data

Schema awal berada di `db/migrations/0001_initial.sql`. API juga membuat tabel secara otomatis dan aman untuk dipanggil berulang saat endpoint workspace pertama kali diakses.

Pada login pertama ke database kosong, snapshot lama yang memang sudah tersimpan di browser akan dimigrasikan ke Turso. Jika database sudah memiliki data, data remote tidak akan ditimpa oleh snapshot lokal.

## Batasan versi awal

- Satu password untuk satu pemilik; belum multi-user.
- Belum ada API edit/hapus transaksi atau habit.
- Riwayat check-in per tanggal sudah memiliki tabel sendiri, tetapi grafik dan fitur histori penuh belum diimplementasikan.
- Tidak ada akses langsung dari browser ke Turso.
