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
  // icon.svg's 32-unit drawing; on the maskable icon the heart is drawn larger, inside the safe zone.
  const glyph = maskable ? size * 1.15 : size;
  // Maskable: the plum fills the square and the heart sits in the safe zone. Otherwise the soft round blob.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: maskable ? "#6b3768" : "transparent",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 32 32">
          {!maskable && (
            <path
              d="M16.6 1.2c7 .3 13.7 5 14.2 12.3.6 8.4-5.6 16.8-14.4 17.3C7.6 31.3 1 25.6 1.2 16.9 1.4 8 8.6.9 16.6 1.2Z"
              fill="#6b3768"
            />
          )}
          <path d="M16 24.5s-8.2-5-8.2-10.6a4.3 4.3 0 0 1 8.2-2 4.3 4.3 0 0 1 8.2 2c0 5.6-8.2 10.6-8.2 10.6Z" fill="#fff" />
          <path
            d="M9.6 16.6h3l1.5-2.6 2.4 5 1.6-2.4h4.4"
            fill="none"
            stroke="#f06a48"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
