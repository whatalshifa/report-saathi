import { ImageResponse } from "next/og";

// The app icons in the web app manifest, drawn from the same shapes as icon.svg and made once at build time.
// "maskable" fills the whole square and keeps the page inside the middle, because phones crop it to a
// circle or a rounded square of their own.
const ICONS = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;

type Name = keyof typeof ICONS;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name as Name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;
  // icon.svg's 32-unit drawing, shrunk on the maskable icon so it sits inside the safe zone.
  const glyph = maskable ? size * 0.8 : size;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
          borderRadius: maskable ? 0 : size * (9 / 32),
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 32 32">
          <path d="M10 7.5h8.5L23 12v12.5a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" fill="#fff" />
          <path d="M18.5 7.5V12H23" fill="none" stroke="#99f6e4" strokeWidth={1.5} strokeLinejoin="round" />
          <path
            d="M11 18.5h2.6l1.5-3.5 2.2 6 1.5-2.5H21"
            fill="none"
            stroke="#0f766e"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
