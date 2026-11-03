import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { TreeSplash } from "@/components/pwa/tree-splash";
import { ThemeProvider } from "@/components/pwa/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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
  // Adaptive themeColor so the OS status bar matches the active theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2821" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <PwaRegister />
          <TreeSplash />
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
