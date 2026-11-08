import { ImageResponse } from "next/og";

export const runtime = "edge";

const iconSizes: Record<string, { size: number; maskable: boolean }> = {
  "icon-192": { size: 192, maskable: false },
  "icon-512": { size: 512, maskable: false },
  "icon-maskable-512": { size: 512, maskable: true },
  "apple-180": { size: 180, maskable: false },
};

function IconArtwork({ maskable }: { maskable: boolean }) {
  const scale = maskable ? 7.4 : 9;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b0f0c",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 512 512">
        <rect
          x={maskable ? 126 : 96}
          y={maskable ? 126 : 96}
          width={maskable ? 260 : 320}
          height={maskable ? 260 : 320}
          rx="94"
          fill="#10b981"
          fillOpacity="0.16"
          stroke="#17b877"
          strokeWidth="14"
        />
        <g transform={`translate(256 256) scale(${scale})`}>
          <path
            d="M-16 9 -1.2 -7.4 4.4 -2.2 16 -16"
            stroke="#37d99a"
            strokeWidth="4.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="16" cy="-16" r="4.2" fill="#37d99a" />
        </g>
      </svg>
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ icon: string }> }) {
  const { icon } = await params;
  const config = iconSizes[icon];

  if (!config) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(<IconArtwork maskable={config.maskable} />, {
    width: config.size,
    height: config.size,
  });
}
