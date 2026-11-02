# Arsitektur Rutina

## Batas lapisan

```text
src/
  app/
    api/
      workspace/            API workspace; deployment dilindungi Vercel Authentication
    layout.tsx               Root layout dan metadata
    page.tsx                 Entry point aplikasi
    globals.css              Design tokens dan styling
  components/
    ui/                      Primitive UI dan dialog
  features/
    app/                     App shell dan navigasi
    dashboard/
    habits/
    finance/
    calendar/
    insights/
    focus/
  lib/
    server/
      turso.ts               Server-only libSQL client
      schema.ts              Idempotent schema initializer
      workspace-repository.ts SQL repository
    use-workspace.ts         Client store, local fallback, remote sync
    types.ts                 Domain contracts
    format.ts                Format angka/tanggal/Rupiah
    seed-data.ts             Data demo dan fallback
db/
  migrations/
    0001_initial.sql         Schema awal Turso
```

## Alur data

Saat Turso aktif:

`Browser -> Vercel Authentication -> UI -> useWorkspace -> Next.js Route Handler -> server-only repository -> Turso`

Saat Turso belum dikonfigurasi:

`UI -> useWorkspace -> LocalStorage / in-memory fallback`

Client tidak pernah menerima `TURSO_AUTH_TOKEN`. Database client hanya diimport dari modul `src/lib/server` dan route handler berjalan di Node.js runtime.

## Tabel Turso

- `habits`: definisi kebiasaan, waktu, durasi, ikon, urutan, dan streak.
- `habit_checkins`: status penyelesaian per tanggal, menggunakan primary key gabungan habit dan tanggal.
- `transactions`: pemasukan dan pengeluaran; nominal disimpan sebagai integer Rupiah.
- `budgets`: batas pengeluaran per kategori.
- Index dibuat untuk urutan habit, tanggal check-in, dan tanggal transaksi.

Tabel dibuat otomatis secara idempoten ketika endpoint workspace pertama kali dipanggil setelah kredensial valid. SQL yang sama disimpan dalam `db/migrations/0001_initial.sql`.

## Sinkronisasi dan migrasi lokal

- Turso menjadi sumber data utama ketika kredensial database tersedia.
- LocalStorage tetap dipakai sebagai fallback saat database belum dikonfigurasi atau belum dapat dijangkau.
- Saat aplikasi pertama dibuka pada perangkat/browser baru, UI menunggu pembacaan awal Turso selesai agar data demo tidak tampil sesaat sebelum data cloud.
- Pada koneksi pertama ke database kosong, snapshot yang sebelumnya tersimpan di LocalStorage akan dikirim ke Turso satu kali.
- Check-in hari ini disimpan terpisah dari definisi habit sehingga struktur mendukung riwayat harian.
- Snapshot workspace ditulis melalui satu transaksi libSQL agar habit, check-in hari ini, transaksi, dan budget tersimpan secara konsisten.

## Keamanan

- `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` hanya dibaca server-side.
- Deployment Vercel dilindungi dengan Vercel Authentication pada cakupan **All Deployments** (Production, Preview, dan domain deployment yang terhubung).
- Perlindungan Vercel membatasi akses aplikasi dan API ke akun yang memiliki akses team Vercel minimal Viewer. Gunakan akun Vercel yang sama pada desktop dan HP.
- API workspace tidak membuat sesi atau meminta password aplikasi; aksesnya bergantung pada Deployment Protection di lapisan platform Vercel.
- Kredensial Turso tetap server-only. Jangan menonaktifkan Vercel Authentication atau mengekspos server pengembangan lokal ke internet.
- Jangan mencetak environment variable atau token ke log.

## Arah evolusi

1. Tambahkan identitas akun dan `workspace_id` untuk multi-user.
2. Tambahkan API edit/hapus habit dan transaksi dengan audit trail.
3. Hitung streak dari riwayat check-in, bukan hanya nilai tersimpan.
4. Tambahkan test untuk perhitungan progress, budget, cashflow, dan aturan tanggal.

## Prinsip perubahan

- Komponen presentasi menerima props; jangan akses LocalStorage atau Turso dari komponen UI kecil.
- Perhitungan domain harus pure function dan mudah diuji.
- Format untuk display tidak boleh menjadi sumber data.
- Tanggal disimpan sebagai ISO date string; nominal disimpan sebagai integer Rupiah.
- Query SQL harus memakai parameter binding.
