# Koneksi Database Turso

## Kredensial runtime

Rutina menggunakan dua environment variable yang hanya dibaca oleh server Next.js:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Jangan gunakan prefix `NEXT_PUBLIC_`, jangan commit token ke repository, dan jangan kirim nilainya ke chat.

## Perlindungan akses aplikasi

Rutina tidak menggunakan password aplikasi, registrasi, atau cookie sesi internal.

Rutina mengandalkan **Vercel Deployment Protection**; aplikasi tidak menyediakan login internal atau otorisasi per-user di API. Pada pemeriksaan konfigurasi project `habittracker2` tanggal 3 November 2026, Vercel melaporkan SSO protection aktif untuk **Preview**, sedangkan perlindungan Production belum terkonfirmasi aktif. Karena itu, konfigurasi aktual belum memenuhi rekomendasi All Deployments.

Sebelum menggunakan Production dengan data pribadi, atur Vercel Authentication/Deployment Protection pada cakupan **All Deployments**, lalu verifikasi akses Production dan Preview menggunakan akun yang memang diizinkan. Jangan menganggap dokumentasi ini sebagai bukti konfigurasi sudah aktif.

Jangan menonaktifkan Deployment Protection atau mengekspos server pengembangan lokal ke internet. Saat menjalankan `npm run dev`, perlindungan Vercel tidak berlaku.

## Setup Vercel

Buka **Project → Settings → Environment Variables** pada proyek `habittracker2`, lalu pastikan kedua variabel Turso tersedia untuk Production. Preview dapat diaktifkan juga bila URL Preview digunakan. Setelah mengubah environment variable, buat deployment baru agar nilainya masuk ke runtime deployment.

## Schema dan data

Schema awal berada di `db/migrations/0001_initial.sql`. API membuat tabel secara otomatis dan idempoten sebelum request workspace pertama.

Tabel utama:
- `habits` — definisi kebiasaan.
- `habit_checkins` — check-in kebiasaan per tanggal.
- `transactions` — pemasukan dan pengeluaran.
- `budgets` — batas anggaran per kategori.

Saat pertama kali tersambung ke database yang masih kosong, snapshot LocalStorage yang sudah tersimpan di browser dapat dimigrasikan ke Turso. Jika database sudah memiliki data, data remote tidak ditimpa oleh snapshot lokal.

## Batasan versi

- Workspace saat ini merupakan ruang pribadi satu pemilik, bukan sistem multi-user dengan akun dan isolasi data per pengguna.
- Belum tersedia API khusus untuk menghapus atau mengedit seluruh jenis data.
- Riwayat check-in tersimpan di tabel terpisah, tetapi tampilan histori penuh dan grafik historis belum tersedia.
- Browser tidak pernah terhubung langsung ke Turso; seluruh akses database melalui server Next.js.
