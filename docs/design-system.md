# Rutina Design System

## Arah visual

**Playful Botanical**: hangat, segar, ramah, dan terinspirasi ruang tumbuh. UI harus terasa seperti ruang pribadi yang ringan, bukan panel administrasi yang padat. Gunakan ilustrasi tanaman, bentuk organik, permukaan seperti kertas hangat, serta aksen lavender untuk interaksi penting.

**Sumber acuan visual:** `PEDOMAN UI.zip` di root repository. Gambar 3 (*Rutina Playful Botanical App Showcase*) adalah master reference untuk Dashboard dan shell aplikasi. Gambar 1–2 menjadi referensi pendukung halaman Kebiasaan, Keuangan, Kalender, Insights, Goals, Tree, dan Pengaturan.

## Fondasi visual

| Token / peran | Nilai acuan | Penggunaan |
|---|---|---|
| Canvas / ivory | `#fff7ef` | Latar utama |
| Surface / paper | `#fffdf9` | Kartu, panel, dan form |
| Soft peach | `#fff0e3` | Permukaan hero dan highlight hangat |
| Botanical green | `#417a57` | Identitas, aksi positif, dan progres |
| Deep leaf | `#2f6245` | Kontras hijau dan state kuat |
| Sage | `#a9c58f` | Dekorasi dan status pertumbuhan |
| Lavender | `#8f7ae5` | Navigasi aktif, primary CTA, dan kontrol terpilih |
| Border | `#efe4d9` | Garis pemisah lembut |
| Ink | `#292a25` | Teks utama |
| Muted | `#8b9185` | Metadata dan keterangan |

Warna tombol utama dan state aktif menggunakan gradasi lavender yang lembut. Hijau tetap menjadi identitas botanical serta warna untuk progres dan status positif. Jangan menggunakan lavender sebagai pengganti semua status hijau.

### Radius, shadow, dan spacing

- Radius kecil: sekitar 13px untuk kontrol dan elemen ringkas.
- Radius kartu: sekitar 19–24px.
- Radius hero: sekitar 28–30px.
- Kartu memakai border tipis dan shadow lembut; hindari glow kuat.
- Jarak antarbagian utama umumnya 12–16px; jaga padding mobile tetap hemat.
- Tombol penting memiliki tinggi sentuh minimum 40–44px.

Token dasar berada di `src/app/globals.css`. Lapisan tema Botanical dan aturan halaman berada di `src/app/rutina-botanical.css`, yang dimuat setelah stylesheet dasar. Bila menambah token atau mengubah peran warna, perbarui keduanya secara konsisten dan jangan membuat warna ad hoc di JSX.

## Tipografi dan hierarki

- Gunakan **Nunito Variable** untuk seluruh antarmuka.
- Judul halaman tegas tetapi bersahabat; hindari ukuran berlebihan.
- Angka keuangan dan statistik menggunakan tabular numerals.
- Metadata lebih kecil dan muted, tetapi tetap terbaca pada layar ponsel.
- Gunakan variasi weight secara terukur, bukan banyak keluarga font.

## Komposisi halaman

### App shell

- Desktop: sidebar berlabel, topbar dengan pencarian, bell, dan avatar.
- Mobile: header ringkas dengan brand, bell, avatar, serta bottom navigation.
- Tombol `+` di tengah bottom navigation adalah akses utama aksi cepat pada ponsel.
- Jangan menampilkan kembali baris Quick Actions desktop sebagai duplikasi menu `+` pada mobile.

### Dashboard — master reference

Urutan desktop:
1. Greeting dan tanggal.
2. Hero botanical dengan ilustrasi gardener, progress habit hari ini, dan quote bubble.
3. Empat kartu statistik: streak, total habit, saldo, aktivitas.
4. Dua kartu utama berdampingan: **Habit Utama** dan **Progress Mingguan**.
5. Kartu pendukung untuk komposisi kebiasaan, keuangan, langkah berikutnya, dan focus timer.

Kartu Progress Mingguan menampilkan ring progres harian yang diberi label dengan jelas, tujuh batang histori, perbandingan jumlah penyelesaian dengan tujuh hari sebelumnya jika histori tersedia, serta aksi untuk menambahkan aktivitas. Jangan membuat persentase perbandingan yang tidak dapat diturunkan dari data.

Urutan mobile:
1. Greeting.
2. Hero dan progress ring.
3. Tiga statistik ringkas.
4. Daftar Habit Utama.
5. Ringkasan mingguan dan kartu pendukung di bawahnya.
6. Bottom navigation dengan tombol `+`.

### Halaman pendukung

- **Kebiasaan:** weekly calendar strip, progres hari ini, streak, lalu daftar kebiasaan. Filter dan analisis lanjutan tidak boleh mengalahkan daftar habit sebagai fokus.
- **Keuangan:** saldo dan tren arus kas menjadi fokus; lanjutkan dengan transaksi, distribusi kategori, dan anggaran.
- **Kalender:** grid bulan dan ringkasan tanggal terpilih berbagi satu sistem kartu.
- **Insights:** pilihan Minggu/Bulan/Tahun harus mengubah rentang data yang benar-benar dimuat. Grafik harus menyebut periode dan satuan hitung dengan jelas.
- **Goals:** tujuan ditampilkan sebagai kartu progres dan milestones; form pembuatan adalah aksi sekunder.
- **Tree:** ilustrasi pertumbuhan menjadi fokus utama, didampingi level, XP, progres, dan jalur tahap.
- **Pengaturan:** profil ilustratif, menu preferensi, informasi notifikasi yang benar, backup, dan informasi aplikasi. Jangan menampilkan kontrol untuk kemampuan yang belum tersedia.

## Responsive rules

- Desain dimulai dari 360px, dengan target QA utama 403 × 881 CSS px (kelas perangkat TECNO CAMON 50 PRO 5G).
- 430px ke bawah: Dashboard memakai tiga stat card, hero ringkas, dan bottom nav; hindari horizontal overflow.
- 600–960px: konten satu kolom atau dua kolom hanya bila masih terbaca.
- Desktop di atas 960px: sidebar expanded dan grid dua kolom untuk konten utama.
- Bottom nav harus menghormati safe-area inset.
- Jangan mengandalkan hover untuk aksi penting.

## Motion dan aksesibilitas

- Gunakan transisi singkat untuk feedback, dengan easing yang konsisten.
- Hormati `prefers-reduced-motion`; informasi dan status tetap jelas tanpa animasi.
- Semua icon button harus memiliki accessible name.
- Progress ring/bar harus mempunyai label atau nilai yang bisa dibaca teknologi bantu.
- Gunakan fokus keyboard yang terlihat dan target sentuh yang memadai.
- Empty state, loading, dan error state harus dibedakan; jangan menampilkan grafik kosong sebagai data sukses.

## Prinsip data dan perilaku

- Semua angka insight dan keuangan harus berasal dari data yang tercatat; jelaskan periode dan satuannya.
- Perbandingan periode hanya ditampilkan ketika kedua rentang memiliki histori yang dapat diperiksa.
- Jangan menampilkan data demo seolah data keuangan nyata.
- Jangan menambah tombol atau toggle yang belum memiliki perilaku nyata.
- Perubahan UI harus mempertahankan aksi habit, milestone, transaksi, ekspor/impor backup, dan perilaku penyimpanan yang sudah berjalan.


## Release quality gate

Sebelum perubahan UI dinyatakan siap rilis, cek seluruh halaman utama pada lebar 360px, 403px, 430px, 600px, 768px, 960px, dan 1440px; verifikasi tema terang/gelap, fokus keyboard, reduced motion, serta tidak ada horizontal overflow. Semua permintaan data berbasis jaringan harus menampilkan status memuat, pesan gagal yang jelas, dan aksi coba lagi bila permintaan dapat diulang. Jangan menutupi konten yang masih dapat digunakan selama histori dimuat.

## Playful Botanical 2.0 — refinement

Refinement ini mempertahankan identitas Playful Botanical dan seluruh struktur fitur aktual. Tujuannya adalah membuat aplikasi terasa seperti personal growth garden yang rapi dan dewasa: hangat, organik, editorial, tetapi tetap efisien untuk pencatatan harian.

### Material dan hierarki

- Canvas memakai ivory hangat (--canvas), sedangkan kartu memakai paper (--surface) dengan border tipis dan shadow rendah.
- Botanical green tetap dipakai untuk progres, aksi positif, dan identitas habit. Lavender dipakai secara terukur untuk navigasi aktif, pilihan, dan primary action; jangan mengubahnya menjadi warna status sukses.
- Peach menjadi aksen suasana dan hero, bukan latar untuk semua kartu. Sage dipakai untuk progres dan detail ilustratif.
- Sidebar desktop adalah paper rail yang tenang. Grup navigasi dan nama menu harus mengikuti navigation pada src/features/app/rutina-app.tsx.
- Dashboard mempertahankan urutan data aktual: greeting, hero gardener, statistik, habit utama, progress mingguan, komposisi habit, aktivitas, keuangan, dan focus timer.
- Halaman Habit, Finance, Calendar, Insights, Goals, Check-in, Meja Kerja, Wellness, Training, Tree, dan Settings menggunakan material kartu, form, tab, dan status yang konsisten. Jangan membuat angka contoh atau quick action yang belum terhubung ke callback.

### Aturan interaksi

- Primary action menggunakan lavender; aksi penyelesaian/progres habit menggunakan botanical green.
- Status sukses, warning, error, dan netral harus dibedakan melalui warna semantik yang sudah ada; jangan memberi warna dekoratif pada status.
- Input, select, textarea, filter, dan tab harus tetap memperlihatkan fokus keyboard.
- Card hover hanya boleh memberi feedback ringan; informasi tidak boleh bergantung pada hover.
- Empty, loading, error, dan retry state tetap dipertahankan pada seluruh request data.
- Hormati prefers-reduced-motion. Animasi dekoratif tidak boleh menjadi satu-satunya penanda status.

### Responsive contract

- Desktop: sidebar berlabel tetap terlihat dan konten tidak melebar melewati batas baca.
- 961–1180px: sidebar dan konten harus tetap muat tanpa horizontal overflow.
- 430px ke bawah: statistik ringkas dua kolom, hero gardener tidak menutupi teks atau indikator progres, dan bottom navigation mempertahankan empat destinasi utama serta tombol +.
- Safe-area bawah tetap diperhitungkan pada bottom navigation dan padding konten.
- Semua kontrol yang mengubah data harus tetap menggunakan handler yang sudah ada; perubahan visual tidak mengubah schema, payload API, atau aturan sinkronisasi.

## Rutina 3.0 — A Garden of Your Life

Arah produk visual berikutnya adalah **Playful Premium**: ilustrasi botanical yang hangat dipadukan dengan layout editorial yang dewasa, ringkas, dan dapat dipercaya. Rutina harus terasa seperti ruang pribadi yang menyenangkan untuk dikunjungi kembali, bukan dashboard yang menilai produktivitas pengguna.

### Prinsip pengalaman
- **Gentle, not guilt-driven:** gunakan bahasa yang mengundang kembali, tidak memberi label gagal, malas, atau tertinggal.
- **Small wins first:** tampilkan progres yang benar-benar tercatat dan hargai satu tindakan kecil tanpa membesarkan angka.
- **One Thing Today:** utamakan satu kebiasaan berikutnya yang sudah ada di jadwal; jangan membuat tugas baru secara otomatis.
- **Rest is allowed:** mode libur, hari tanpa jadwal, dan semua habit selesai harus mempunyai pesan yang berbeda dan tidak menghakimi.
- **Evidence before praise:** semua jumlah, streak, progres, dan rangkuman harus berasal dari data workspace/histori. Jangan membuat angka contoh pada UI produksi.
- **No streak punishment:** jangan menghapus level, menurunkan pohon, atau memberi pesan negatif ketika pengguna melewatkan hari.
- **Privacy and trust:** data mood, tidur, dan keuangan hanya ditampilkan pada konteks fitur yang relevan dan label agregat harus menyebut rentang datanya.

### Dashboard narrative
1. Sapaan menyesuaikan waktu Asia/Jakarta dan keadaan hari ini.
2. Hero "Your Little Garden" menggunakan ilustrasi gardener yang sudah ada dan progres habit hari ini.
3. Ringkasan menampilkan sinyal terbatas: rekor konsistensi, habit aktif, dan arus kas bersih.
4. "One Thing Today" memilih habit berikutnya dari jadwal yang sudah ada dan menyediakan timer atau penyelesaian melalui handler yang sudah tersedia.
5. "Cerita minggu ini" merangkum histori penyelesaian 7 hari dan membandingkannya dengan 7 hari sebelumnya menggunakan bahasa yang netral.
6. Check-in dan Focus Timer tetap menjadi pengalaman pendukung, tidak menggeser habit sebagai tindakan utama.

### Growth Wrapped
- Insights memakai histori API yang sudah ada untuk 7 hari, 30 hari, atau 12 bulan.
- Jumlah penyelesaian berasal dari riwayat habit yang tersimpan.
- Rata-rata mood selalu diberi label sebagai rata-rata dari check-in terakhir yang tersedia; jangan menyebutnya sebagai rata-rata periode yang dipilih bila cakupannya berbeda.
- Saat histori gagal dimuat, tampilkan status error/placeholder, bukan angka nol yang bisa disalahartikan sebagai tidak ada progres.

### Sistem visual
- Ivory sebagai canvas, paper-white sebagai surface, botanical green untuk progres, sage untuk detail pertumbuhan, peach untuk kehangatan, dan lavender untuk primary action.
- Gunakan tipografi Nunito yang ramah, hierarki judul yang ringkas, ruang kosong yang cukup, border lembut, dan shadow rendah.
- Satu kartu hanya boleh memiliki satu tujuan utama. Jangan memberi semua kartu warna aksen yang berbeda.
- Animasi harus singkat, dekoratif, tidak menghalangi input, dan mematuhi `prefers-reduced-motion`.
- Fokus keyboard harus terlihat pada seluruh tombol, tautan, tab, input, select, dan textarea.
- Desktop, tablet, dan mobile harus menjaga urutan informasi yang sama; mobile mengubah komposisi, bukan sekadar mengecilkan desktop.

### Guardrail implementasi
- Redesain ini presentation-first. Jangan mengubah formula streak, XP, jadwal, kategori, amount habit, keuangan, sinkronisasi, API, maupun schema.
- Semua CTA harus terhubung ke callback yang sudah ada dan mempunyai status disabled yang benar.
- Jangan menambah localStorage preference atau kolom database baru tanpa kebutuhan produk dan migrasi yang terencana.

## Finance — Calm Fintech × Botanical

Halaman Keuangan memakai komposisi yang lebih berorientasi pada pembacaan angka, sambil mempertahankan material dan warna Botanical Rutina.

- Ringkasan utama menempatkan **arus kas bersih** sebagai angka paling dominan, dengan pemasukan dan pengeluaran sebagai konteks pendukung. Semua angka mengikuti transaksi pada periode laporan yang dipilih dan harus tetap sesuai helper perhitungan yang sudah ada.
- Grafik arus uang membandingkan pemasukan dan pengeluaran per hari untuk tujuh hari yang berakhir pada tanggal akhir periode terpilih. Grafik menggunakan seluruh riwayat transaksi agar rentang yang melewati pergantian bulan tidak kehilangan data hari sebelumnya.
- Distribusi kategori menghitung pengeluaran aktual pada periode laporan yang dipilih. Kategori ditampilkan berdasarkan nilai terbesar; kategori tambahan digabung sebagai "Kategori lainnya" agar visual tetap ringkas.
- Kontrol anggaran dipisahkan dari distribusi pengeluaran. Setiap anggaran menampilkan realisasi, batas, persentase, sisa atau kelebihan, serta state ketika batas belum ditentukan.
- Daftar transaksi menampilkan lima transaksi terbaru secara default, menyediakan filter jenis transaksi, dan dapat diperluas tanpa menghapus atau membatasi data sumber.
- Empty state harus tetap membedakan belum ada transaksi, belum ada kategori pengeluaran, dan belum ada anggaran.
- Tema gelap, fokus keyboard, reduced motion, dan layout mobile harus tetap berfungsi. Grafik dan progress memiliki label aksesibel.
- Redesign hanya mengubah presentasi. Jangan mengubah schema transaksi/anggaran, formula arus kas, aturan kategori, penyimpanan, sinkronisasi, maupun API.


### Periode laporan dan batas data historis

- Pengguna dapat memilih bulan laporan dari bulan yang sudah berjalan atau bulan sebelumnya. Periode ini mengubah ringkasan arus kas, distribusi kategori, anggaran yang dibandingkan, dan daftar transaksi.
- Grafik harian mengikuti tujuh hari sampai akhir periode yang dipilih. Untuk bulan berjalan, ujung rentang adalah tanggal hari ini; untuk bulan lampau, ujung rentang adalah hari terakhir bulan tersebut.
- Grafik harus menyediakan nilai pemasukan dan pengeluaran per hari yang dapat dibaca, bukan hanya tinggi batang dan label tanggal.
- Data `Budget` saat ini hanya menyimpan batas kategori yang berlaku sekarang, bukan histori perubahan batas per bulan. Saat melihat bulan lampau, UI wajib menyatakan bahwa perbandingan memakai batas anggaran yang dikonfigurasi saat ini; jangan menyajikannya sebagai rekaman batas historis.
- Pemilih periode tidak boleh mengubah transaksi, menghapus histori, mengubah formula arus kas, ataupun membuat angka aset/saldo/prediksi yang tidak tersedia pada model data.
