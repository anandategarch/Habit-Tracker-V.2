import { ImageResponse } from "next/og";

export const runtime = "edge";

const iconSizes: Record<string, { size: number; maskable: boolean }> = {
  "icon-192": { size: 192, maskable: false },
  "icon-512": { size: 512, maskable: false },
  "icon-maskable-512": { size: 512, maskable: true },
  "apple-180": { size: 180, maskable: false },
};

function IconArtwork({ maskable }: { maskable: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#275642",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 512 512">
        {!maskable && <circle cx="256" cy="256" r="196" fill="#32684d" />}
        {maskable && <circle cx="256" cy="256" r="174" fill="#32684d" />}
        <path
          d="M238 391c-7-47-8-91-3-130 3-26-4-53-16-75 25 18 40 43 43 72 14-32 42-59 78-79-25 35-47 68-65 103 0 37 3 73 8 109z"
          fill="#f5f7f2"
        />
        <path
          d="M244 274c-24-34-50-55-81-70m113 43c24-27 50-43 80-52m-110 104c-23-21-45-32-70-37"
          fill="none"
          stroke="#f5f7f2"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <g fill="#d9e9dd">
          <ellipse cx="145" cy="192" rx="54" ry="48" />
          <ellipse cx="218" cy="145" rx="68" ry="62" />
          <ellipse cx="303" cy="146" rx="67" ry="62" />
          <ellipse cx="365" cy="204" rx="54" ry="49" />
          <ellipse cx="132" cy="265" rx="47" ry="43" />
          <ellipse cx="250" cy="226" rx="72" ry="65" fill="#f5f7f2" />
          <ellipse cx="360" cy="275" rx="45" ry="42" />
        </g>
        <ellipse cx="238" cy="377" rx="20" ry="25" fill="#e8b765" />
        <path
          d="M236 360c10 8 11 17 4 27"
          fill="none"
          stroke="#f6d79f"
          strokeWidth="5"
          strokeLinecap="round"
        />
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
