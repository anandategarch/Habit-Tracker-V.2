import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rutina OS — konsol kebiasaan & keuangan",
    short_name: "Rutina OS",
    description: "Konsol operasional pribadi untuk kebiasaan dan keuangan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#090c0a",
    theme_color: "#090c0a",
    categories: ["lifestyle", "productivity", "finance"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
