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
 * rutina-app hanya akan me-sync nilai yang sama setelah hydration.
 */
const THEME_INIT_SCRIPT = `(function(){try{
var t="light";try{var m=JSON.parse(localStorage.getItem("rutina.v2.extended-modules")||"{}");
var s=m&&m.settings&&m.settings.theme;if(s==="dark"||s==="light")t=s;
else t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}catch(e){
t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
document.documentElement.dataset.theme=t;
var mc=document.querySelector("meta[name=theme-color]");
if(mc)mc.setAttribute("content",t==="dark"?"#1d2821":"#fff7ef");
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
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
