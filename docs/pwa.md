# Instalasi PWA Rutina

Rutina dapat dipasang dari browser HP ke layar utama sebagai aplikasi web progresif (PWA).

## Android

1. Buka URL Production Rutina menggunakan Chrome.
2. Login melalui Vercel Authentication.
3. Tekan tombol unduh di bagian kanan atas Rutina, atau buka menu Chrome.
4. Pilih **Instal aplikasi** / **Tambahkan ke layar utama**.
5. Buka Rutina melalui ikon yang muncul di layar utama.

## iPhone

1. Buka URL Production Rutina menggunakan Safari.
2. Login melalui Vercel Authentication.
3. Tekan **Bagikan** di Safari.
4. Pilih **Tambahkan ke Layar Utama**, lalu tekan **Tambah**.
5. Buka Rutina melalui ikon di layar utama.

## Perilaku aplikasi

- PWA menggunakan mode standalone agar terbuka tanpa bilah alamat browser.
- Ikon PNG berukuran 192×192, 512×512, maskable 512×512, dan Apple touch icon 180×180 dibuat melalui Next.js ImageResponse.
- Saat dibuka sebagai aplikasi terpasang, animasi pohon tumbuh berjalan sekali pada setiap peluncuran aplikasi.
- Tombol **Lewati** dapat menutup animasi lebih cepat.
- Animasi tidak dipaksakan saat perangkat mengaktifkan pengaturan reduced motion.
- Service worker hanya meneruskan permintaan ke jaringan. Tidak ada halaman, kredensial Vercel, API workspace, atau data Turso yang disimpan ke cache.
- Rutina tetap memerlukan koneksi internet dan login Vercel. Ini bukan aplikasi offline.

