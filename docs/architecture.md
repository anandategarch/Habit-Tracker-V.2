# Arsitektur Rutina

## Batas lapisan

```text
src/
  app/
    api/
      auth/                 Password login, session, logout
      workspace/            API workspace yang dilindungi sesi
    layout.tsx               Root layout dan metadata
    page.tsx                 Entry point aplikasi
    globals.css              Design tokens dan styling
  components/
    auth/                    Access gate
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
      auth.ts                Signed HttpOnly session
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

`UI -> useWorkspace -> protected Next.js Route Handler -> server-only repository -> Turso`

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

- Turso menjadi sumber data utama ketika environment database tersedia dan sesi valid.
- LocalStorage tetap dipakai sebagai fallback saat database belum dikonfigurasi atau belum dapat dijangkau.
- Pada koneksi pertama ke database kosong, snapshot yang sebelumnya tersimpan di LocalStorage akan dikirim ke Turso satu kali.
- Check-in hari ini disimpan terpisah dari definisi habit sehingga struktur mendukung riwayat harian.
- Snapshot workspace ditulis melalui satu transaksi libSQL agar habit, check-in hari ini, transaksi, dan budget tersimpan secara konsisten.

## Keamanan

- `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` hanya dibaca server-side.
- Saat Turso aktif, API workspace mensyaratkan password aplikasi dan signed HttpOnly session cookie.
- Password aplikasi dan session secret wajib disediakan melalui environment variable.
- Implementasi saat ini merupakan workspace satu pemilik, belum autentikasi multi-user. Jangan membuka akses untuk banyak pengguna sebelum menambahkan identitas pengguna dan isolasi data.
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
