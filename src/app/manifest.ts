import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rutina — hidup lebih terarah",
    short_name: "Rutina",
    description: "Ruang pribadi untuk membangun kebiasaan dan mengelola keuangan dengan lebih sadar.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f5f7f2",
    theme_color: "#275642",
    categories: ["lifestyle", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
