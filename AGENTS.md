# Rutina — aturan kerja untuk kontributor dan AI agent

## Tujuan

Menjaga desain, implementasi, dan perilaku produk tetap konsisten ketika fitur berkembang.

## Aturan wajib

1. Gunakan TypeScript strict. Hindari `any`; definisikan domain type di `src/lib/types.ts`.
2. Gunakan Next.js App Router. Route dan layout tetap berada di `src/app`; kode domain berada di `src/features`.
3. Jangan menaruh seluruh logika fitur ke satu file besar. Pisahkan view, state/use-case, dan akses data saat domain bertambah.
4. Semua warna, tipografi, radius, shadow, spacing, dan motion visual berasal dari token di `src/app/globals.css`.
5. Jangan menulis warna hex langsung di komponen. Gunakan class/token semantik.
6. Komponen bersama harus punya API sederhana dan konsisten; jangan membuat variasi komponen yang hanya berbeda sedikit tanpa alasan UX.
7. Mobile-first adalah standar: mulai dari 360px, lalu tingkatkan layout untuk tablet dan desktop. Hindari horizontal overflow.
8. Navigasi utama pada mobile harus tetap mudah dijangkau; sisakan ruang untuk safe-area bawah.
9. Setiap tombol harus punya aksi nyata. Kontrol yang belum berfungsi jangan ditampilkan seolah-olah aktif.
10. Form harus memiliki label, validasi dasar, state fokus, dan umpan balik setelah submit.
11. Format Rupiah, tanggal, dan angka harus lewat helper di `src/lib/format.ts`.
12. Jangan mengubah data demo menjadi klaim saldo atau performa nyata. Beri label bahwa data masih lokal/demo.
13. Hormati `prefers-reduced-motion`; semua animasi halaman, modal, chart, dan micro-interaction harus punya fallback tanpa gerakan. Jangan mengandalkan animasi untuk menyampaikan status.
14. Jangan menambahkan dependency tanpa kebutuhan yang jelas. Gunakan Lucide untuk ikon agar satu gaya.
15. Jangan menghapus fitur atau field domain tanpa menjelaskan alasannya di PR.
16. Koneksi database hanya boleh berada di `src/lib/server` dan API Route Handler; jangan import `@libsql/client` dari komponen client.
17. Jangan pernah menaruh `TURSO_AUTH_TOKEN` ke kode, commit, browser bundle, log, atau prefix `NEXT_PUBLIC_`.
18. Deployment Vercel harus dilindungi dengan Vercel Authentication pada cakupan All Deployments; endpoint data tetap wajib memvalidasi payload sebelum SQL. Jangan menambahkan bypass autentikasi platform.
19. Query SQL harus menggunakan parameter binding; hindari menyisipkan input pengguna ke string SQL.
20. Perubahan schema harus memperbarui migration SQL dan initializer idempoten.

## Sebelum menyelesaikan perubahan

- Jalankan `npm run typecheck`.
- Jalankan `npm run lint`.
- Jalankan `npm run build` bila lingkungan memungkinkan.
- Periksa layout pada lebar 360px, 390px, 768px, dan desktop.
- Ringkas file yang diubah, perilaku yang berubah, dan hal yang belum diuji.
