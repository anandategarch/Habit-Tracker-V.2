# Rutina Experience Standard v0.5

Dokumen ini menyatukan tiga lapisan kerja produk: psikologi penggunaan, interaction design, dan visual polish. Implementasi harus mengikuti urutan **fungsi → interaksi → aksesibilitas → visual → verifikasi**.

## Arah produk

Rutina adalah ruang pribadi untuk bertumbuh, bukan alat untuk menilai produktivitas. Setiap layar membantu pengguna memulai dari satu langkah masuk akal, melihat progres tanpa merasa dihukum oleh hari yang terlewat, mendapat feedback jelas, dan kembali kapan pun siap.

Tidak ada streak-loss scare, notifikasi berlebihan, confetti untuk setiap klik, atau angka demo yang tampak seperti data nyata.

## Loop harian

- Dashboard mempertahankan greeting, progres, habit terjadwal, "One Thing Today", ringkasan keuangan, dan Focus Timer.
- Check-in yang belum dicatat menjadi undangan ringan, bukan alarm atau kewajiban.
- Satu tindakan utama terlihat jelas. Rekomendasi habit tidak mengunci pengguna pada satu pilihan.
- Penyelesaian habit memberikan feedback visual dan label/status yang tetap terbaca tanpa animasi.
- Hari yang lebih ringan diakui sebagai variasi ritme, bukan kegagalan.

## Pohon dan reward

- Tingkat pohon utama ditentukan oleh XP seumur hidup dan tidak turun saat minggu berganti.
- XP mingguan hanya menjelaskan musim/aktivitas minggu tersebut.
- Ilustrasi pohon utama tidak berubah menjadi daun kuning/dorman sebagai hukuman akibat performa minggu yang rendah.
- Achievement merayakan tonggak bermakna, termasuk kembali setelah jeda.
- Streak menjadi salah satu metrik, bukan satu-satunya bukti konsistensi.

## Pengungkapan bertahap

Form pembuatan habit menampilkan informasi minimum untuk memulai: nama, kategori, jadwal, waktu, dan durasi. Jenis habit, target, prioritas, kesulitan, grup, dan aturan hari/tanggal khusus berada di pengaturan lanjutan. Field tidak dihapus; nilai submit tetap dipertahankan.

## Motion dan feedback

| Interaksi | Standar |
| --- | --- |
| Press | scale 0.96, 150ms, ease-out |
| High-frequency state | instan atau ≤150ms pada opacity/background |
| State easing | cubic-bezier(0.2, 0, 0, 1) |
| Icon state crossfade | 300ms; scale 0.25→1; opacity 0→1; blur 4px→0 |
| Entrance bertingkat | 300ms; opacity, blur 4px, translateY 12px; stagger 100ms |
| Interactive state | CSS transitions/springs yang dapat dibalik, bukan keyframes satu arah |
| Initial render | tidak menjalankan transisi halaman |

Keyframes tetap boleh untuk sequence satu kali seperti splash screen, skeleton shimmer, dan reward yang memang hanya muncul saat keberhasilan. Jangan menghidupkan animasi pada setiap row atau klik.

## Visual system

- Pertahankan Playful Botanical, token warna, Nunito, kepadatan, dan komponen yang ada.
- Border dipakai untuk struktur, separator, selected state, dan batas input. Shadow dipakai untuk elevasi.
- Pada surface bertumpuk dengan inset seragam: radius luar = radius dalam + padding inset + border. Bila padding >24px atau sengaja asimetris, perlakukan sebagai dua surface berbeda.
- Ikon memakai satu library per surface, currentColor untuk state, dan stroke yang seimbang dengan bobot teks.
- Ilustrasi/logo transparan tidak diberi outline gambar konten.
- Hover hanya untuk pointer yang mendukung hover; touch tidak boleh mempertahankan dekorasi hover.
- Scroll modal, drawer, menu, dan panel dibatasi agar tidak menggulir halaman belakang.

## Aksesibilitas dan reduced motion

- Hormati prefers-reduced-motion; fallback mempertahankan crossfade opacity tanpa gerakan, scale, atau blur.
- Motion bukan satu-satunya penanda state. Tambahkan warna, ikon, label, atau status yang statis.
- Jangan menghapus focus indicator. Kontrol tetap dapat dioperasikan dengan keyboard dan touch.
- Forced-colors mode harus tetap menunjukkan batas/focus meski box-shadow dihilangkan.
- Jangan memasang will-change kecuali ada bukti stutter dan sebut hanya properti yang benar-benar dianimasikan.

## Timer dan persistensi

- Focus Timer dimiliki app shell, bukan view Dashboard yang dapat di-unmount saat pindah tab.
- Sesi aktif memakai deadline absolut agar timer akurat ketika tab browser berada di background.
- Sesi dipulihkan dari LocalStorage; kegagalan storage tidak menghentikan timer selama aplikasi masih terbuka.
- Status running/paused/complete tetap memiliki label yang dapat dibaca.

## Aturan implementasi

1. Jangan menambah dependency motion jika CSS transitions cukup.
2. Jangan mengubah schema database atau format data untuk perubahan presentasi.
3. Jangan menghapus field/fitur tanpa alasan dan migrasi yang jelas.
4. Gunakan token/design system yang sudah ada.
5. Hindari transition: all; sebut properti yang berubah.
6. QA desktop dan mobile, termasuk keyboard, reduced-motion, touch hover, overlay scroll, timer, dan state empty/loading/error.
7. Catat hal yang belum diverifikasi secara eksplisit; jangan mengklaim lulus browser test tanpa benar-benar menjalankannya.
