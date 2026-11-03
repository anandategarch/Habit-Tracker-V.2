import { ImageResponse } from "next/og";

export const runtime = "edge";

const iconSizes: Record<string, { size: number; maskable: boolean }> = {
  "icon-192": { size: 192, maskable: false },
  "icon-512": { size: 512, maskable: false },
  "icon-maskable-512": { size: 512, maskable: true },
  "apple-180": { size: 180, maskable: false },
};

function IconArtwork({ maskable }: { maskable: boolean }) {
  const markTransform = maskable ? "translate(96 96) scale(10)" : "translate(64 64) scale(12)";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#2f6245" }}>
      <svg width="100%" height="100%" viewBox="0 0 512 512">
        <circle cx="256" cy="256" r={maskable ? 174 : 196} fill="#417a57" />
        <g transform={markTransform}>
          <path d="M16 28.2c.2-6.2.1-11.4-.2-16.4" stroke="#f7faf2" strokeWidth="2.25" strokeLinecap="round" fill="none" />
          <path d="M15.8 19.2C8.8 19.2 5 15 5.2 7.3c7.2-.2 11 3.5 11.2 11.1-.2.3-.4.6-.6.8Z" fill="#dcebd7" />
          <path d="M16.7 14.5c.3-7.1 4.2-10.9 11-10.9.2 7.1-3.4 11-10.7 11.5" fill="#c7dfc2" />
          <path d="M15.5 10.5c-3.7-2.8-3.9-6-.1-9 3.8 2.8 3.8 6 .1 9Z" fill="#e8b765" />
          <path d="M16 20.2c-2.5 2.3-4.7 3.8-7.5 4.8M16 22.2c2.4 1.1 4.7 2.2 7.1 4.2" stroke="#dcebd7" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".8" />
          <circle cx="16" cy="28.2" r="2.2" fill="#e8b765" />
        </g>
      </svg>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ icon: string }> },
) {
  const { icon } = await params;
  const config = iconSizes[icon];
  if (!config) return new Response("Icon tidak ditemukan", { status: 404 });
  return new ImageResponse(<IconArtwork maskable={config.maskable} />, {
    width: config.size,
    height: config.size,
  });
}
