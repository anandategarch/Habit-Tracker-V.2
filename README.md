# Rutina

Rutina adalah ruang pribadi untuk membangun kebiasaan, mengatur fokus, dan memahami arus keuangan harian dalam satu pengalaman yang tenang dan konsisten.

## Prinsip produk

- **Mobile-first:** navigasi utama mudah dijangkau dengan satu tangan.
- **Clarity over decoration:** informasi penting tampil lebih dahulu; dekorasi tidak mengalahkan fungsi.
- **One design language:** warna, tipografi, radius, spacing, elevasi, dan interaksi memakai token bersama.
- **Feature boundaries:** setiap domain (Habit, Finance, Calendar, Insights) dipisahkan dari shell aplikasi.
- **Accessible by default:** kontrol memiliki label, fokus terlihat, dan animasi menghormati preferensi reduced-motion.

## Stack

- Next.js App Router
- React + TypeScript (strict)
- Tailwind CSS v4 + CSS design tokens
- Lucide icons
- Local browser storage untuk prototype data

Node.js minimum: **20.9**.

## Jalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Perintah pemeriksaan:

```bash
npm run typecheck
npm run lint
npm run build
```

## Struktur

```text
src/
  app/                 # Route, root layout, global styles
  features/
    app/               # App shell, navigation, and feature views
  lib/                 # Domain types, formatting, seed data
docs/
  design-system.md     # Tokens and UI rules
  architecture.md      # Boundaries and conventions
```

## Status data

Data saat ini adalah **data demo** yang disimpan di browser menggunakan LocalStorage. Belum ada akun, sinkronisasi cloud, API, atau database. Lapisan penyimpanan sengaja dibuat ringan agar nanti bisa diganti dengan repository/API tanpa mengubah komponen presentasi.

## Aturan kontribusi

Baca `AGENTS.md`, `docs/design-system.md`, dan `docs/architecture.md` sebelum menambah fitur atau mengubah visual.
