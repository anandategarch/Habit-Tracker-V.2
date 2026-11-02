import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rutina — hidup lebih terarah",
  description: "Ruang pribadi untuk membangun kebiasaan dan mengelola keuangan dengan lebih sadar.",
  applicationName: "Rutina",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rutina",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f7f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
