import { ImageResponse } from "next/og";

/**
 * The app icon as a PNG, drawn from the same shapes as app/icon.svg. `filled` fills the whole square
 * with plum and draws the heart larger inside the middle: phones (Android's maskable icons, the iPhone's
 * home screen) crop the square to a shape of their own. Otherwise it is the soft round blob.
 */
export function appIcon(size: number, filled: boolean) {
  const glyph = filled ? size * 1.15 : size;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: filled ? "#6b3768" : "transparent",
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 32 32">
          {!filled && (
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
