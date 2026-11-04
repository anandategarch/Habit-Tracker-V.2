import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { TreeSplash } from "@/components/pwa/tree-splash";
import "@fontsource-variable/nunito";
import "./globals.css";
import "./rutina-botanical.css";

export const metadata: Metadata = {
  title: "Rutina — hidup lebih terarah",
  description: "Ruang pribadi untuk membangun kebiasaan dan mengelola keuangan dengan lebih sadar.",
  applicationName: "Rutina",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rutina",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-180", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2821" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Skrip pre-paint tema: jalankan SEBELUM CSS render pertama supaya
 * pengguna mode gelap tidak melihat "flash" UI terang saat load.
 * Membaca snapshot localStorage modul (settings.theme) + prefers-color-scheme.
 *
 * Skrip ini sengaja HANYA memutasi atribut <html data-theme> — sebelum
 * hidrasi React. Karena itu <html> di bawah memakai suppressHydrationWarning
 * (pola yang sama dengan next-themes) supaya React tidak melaporkan
 * "attributes didn't match" saat hidrasi.
 *
 * Mutasi meta theme-color TIDAK dilakukan di sini: elemen <meta> hasil
 * metadata API berada di dalam tree React, mengubahnya sebelum hidrasi
 * memicu hydration error. Sinkronisasi meta (warna status bar PWA)
 * dilakukan PASCA hidrasi oleh rutina-app (applyTheme di useEffect).
 */
const THEME_INIT_SCRIPT = `(function(){try{
var t="light";try{var m=JSON.parse(localStorage.getItem("rutina.v2.extended-modules")||"{}");
var s=m&&m.settings&&m.settings.theme;if(s==="dark"||s==="light")t=s;
else t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}catch(e){
t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
document.documentElement.dataset.theme=t;
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: skrip tema pre-paint menyetel data-theme pada
  // <html> sebelum hidrasi — perilaku disengaja (anti-FOUC), pola standar
  // next-themes. Mismatch atribut <html> di-suppress satu level ini saja;
  // warning pada children tetap aktif.
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <PwaRegister />
        <TreeSplash />
        {children}
      </body>
    </html>
  );
}
