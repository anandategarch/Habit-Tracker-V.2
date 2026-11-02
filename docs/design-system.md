# Rutina Design System

## Arah visual

**Quiet botanical productivity**: hangat, natural, modern, dan ringan. UI harus terasa seperti ruang pribadi yang menenangkan, bukan panel administrasi yang padat.

## Fondasi visual

| Token | Nilai / tujuan |
|---|---|
| Canvas | Warm off-white dengan sedikit nuansa hijau |
| Surface | Putih hangat untuk kartu dan panel |
| Primary | Forest green untuk aksi utama dan navigasi aktif |
| Accent | Sage untuk progress dan status positif |
| Ink | Charcoal kehijauan untuk teks utama |
| Muted | Abu-abu kehijauan untuk metadata |
| Border | Garis tipis dengan kontras rendah |
| Radius | 12 / 18 / 24 px; gunakan konsisten sesuai skala komponen |
| Shadow | Halus; hindari glow dan shadow berat |
| Motion | 160–240ms untuk feedback, 320–500ms untuk transisi layar |

Nilai token aktual berada di `src/app/globals.css`. Komponen tidak boleh mendefinisikan ulang warna ad hoc.

## Tipografi dan hierarki

- Gunakan satu keluarga sans-serif sistem yang bersih.
- Judul halaman: besar tetapi tidak berlebihan.
- Angka finansial: tabular numerals agar mudah dibandingkan.
- Metadata: lebih kecil dan muted, tetap terbaca pada ponsel.
- Hindari terlalu banyak weight dan ukuran font dalam satu layar.

## Komponen

- **App shell:** sidebar pada desktop, bottom navigation pada mobile.
- **Surface/Card:** permukaan untuk mengelompokkan satu konteks.
- **Primary button:** satu aksi dominan per konteks.
- **Icon button:** aksi sekunder wajib memiliki aria-label.
- **Metric:** label, angka, dan konteks periode.
- **Progress:** selalu disertai label atau angka; jangan mengandalkan warna saja.
- **Form field:** label terlihat, ukuran sentuh nyaman, error eksplisit.

## Layout rules

- Desain dasar mulai dari 360px.
- Konten mobile satu kolom, dengan kartu ringkas dan urutan prioritas.
- Di desktop, gunakan grid dua kolom hanya jika menambah keterbacaan.
- Bottom navigation memakai safe-area inset.
- Tombol penting memiliki tinggi minimum 44px.
- Hindari scroll horizontal kecuali untuk kontrol yang memang berupa carousel.

## Jangan dilakukan

- Jangan gunakan gradien berlebihan, glassmorphism di semua kartu, emoji sebagai ikon utama, atau banyak warna status sekaligus.
- Jangan menciptakan warna baru untuk setiap kategori.
- Jangan menampilkan data demo seolah data keuangan real.
- Jangan menambah ornamen yang mengganggu keterbacaan.
