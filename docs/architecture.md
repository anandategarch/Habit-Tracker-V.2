# Arsitektur Rutina

## Batas lapisan

```text
app/
  Root layout, route composition, global CSS
features/
  app/       Shell dan komposisi layar awal
  habits/    Domain kebiasaan (ekstraksi lanjutan)
  finance/   Domain transaksi dan anggaran (ekstraksi lanjutan)
  calendar/  Kalender dan riwayat (ekstraksi lanjutan)
  insights/  Agregasi dan analitik (ekstraksi lanjutan)
  focus/     Timer fokus dan sesi konsentrasi
components/
  ui/        Primitive lintas fitur (button, card, field, dialog)
lib/
  types.ts   Kontrak domain
  format.ts  Format angka, tanggal, mata uang
  seed-data.ts  Data demo
```

## Alur data saat ini

UI -> `useWorkspace` external store -> browser LocalStorage. Penyimpanan disubscribe melalui `useSyncExternalStore` agar hidrasi tidak memicu setState sinkron di effect.

Data demo bersifat lokal pada browser/perangkat yang sama. Tidak ada sinkronisasi antarperangkat dan tidak ada autentikasi.

## Arah evolusi

1. Ekstrak feature views ke folder domain setelah interaksi bertambah.
2. Ganti LocalStorage dengan interface repository yang menggunakan API/server action.
3. Tambahkan database dan autentikasi setelah skema pengguna serta ownership data ditetapkan.
4. Simpan transaksi sebagai ledger; saldo bersih dihitung dari pemasukan dikurangi pengeluaran, bukan diedit manual.
5. Tambahkan validasi domain dan test untuk perhitungan progress, budget, serta arus kas.

## Prinsip perubahan

- Komponen presentasi menerima props; jangan akses LocalStorage dari komponen UI kecil.
- Perhitungan domain harus pure function dan mudah diuji.
- Format untuk display tidak boleh menjadi sumber data.
- Tanggal disimpan sebagai ISO date string; nominal disimpan sebagai integer rupiah.
