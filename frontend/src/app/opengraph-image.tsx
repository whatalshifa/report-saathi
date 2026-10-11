import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "ReportSaathi: your family's lab reports, explained";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The brand's colours (globals.css) and the January sample report's values, as the landing page shows them.
const INK = "#2b1a29";
const MUTED = "#6b5867";
const PLUM = "#6b3768";
const CORAL = "#f06a48";
const FLAGS = {
  Low: ["#fffbeb", "#78350f"],
  High: ["#fff1f2", "#9f1239"],
  Normal: ["#ecfdf5", "#065f46"],
} as const;
const ROWS: [string, string, keyof typeof FLAGS][] = [
  ["Haemoglobin", "10.6 g/dL", "Low"],
  ["HbA1c", "6.1 %", "High"],
  ["Vitamin D", "14 ng/mL", "Low"],
  ["Serum creatinine", "0.8 mg/dL", "Normal"],
];

// Figtree, the site's typeface (SIL Open Font License, assets/fonts/OFL.txt). The image is drawn once at
// build time, so the fonts are read from disk then.
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** The picture shown when the link is shared on WhatsApp, LinkedIn or X. */
export default async function Image() {
  const [medium, extraBold, black] = await Promise.all([
    font("Figtree-Medium.ttf"),
    font("Figtree-ExtraBold.ttf"),
    font("Figtree-Black.ttf"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#fff7f3",
          fontFamily: "Figtree",
          color: INK,
          overflow: "hidden",
        }}
      >
        {/* The landing page's soft blobs: plum behind the card, coral low on the left. */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -40,
            width: 640,
            height: 700,
            borderRadius: 320,
            background: "#f6e4f0",
            transform: "rotate(-12deg)",
          }}
        />
        <div
          style={{ position: "absolute", left: -190, bottom: -230, width: 380, height: 380, borderRadius: 190, background: "#ffe2d5" }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 690 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: -3.4 }}>
              <div style={{ display: "flex" }}>Your family&apos;s lab</div>
              <div style={{ display: "flex" }}>reports,</div>
              <span style={{ display: "flex", position: "relative", alignSelf: "flex-start", color: PLUM }}>
                explained.
                <svg width="340" height="26" viewBox="0 0 200 16" style={{ position: "absolute", left: -4, bottom: -18 }}>
                  <path d="M3 11C40 4 92 3 197 6M30 13c46-4 98-5 150-3" fill="none" stroke={CORAL} strokeWidth="4.5" strokeLinecap="round" />
                </svg>
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 500, color: MUTED, marginTop: 40, lineHeight: 1.35 }}>
              Every value read, flagged and explained in plain English, Hindi or Marathi.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 64,
            top: 118,
            width: 380,
            display: "flex",
            flexDirection: "column",
            background: "white",
            borderRadius: 36,
            padding: "28px 32px",
            boxShadow: "0 30px 60px -24px rgba(107, 55, 104, 0.45)",
            transform: "rotate(2deg)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 10 }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Meera Joshi</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: MUTED }}>Sample report · 12 Jan 2026</div>
          </div>
          {ROWS.map(([name, value, flag]) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: "2px solid #f6e4f0",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{name}</div>
                <div style={{ fontSize: 19, fontWeight: 500, color: MUTED }}>{value}</div>
              </div>
              <div
                style={{
                  background: FLAGS[flag][0],
                  color: FLAGS[flag][1],
                  fontSize: 18,
                  fontWeight: 800,
                  padding: "6px 16px",
                  borderRadius: 999,
                }}
              >
                {flag}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Figtree", data: medium, weight: 500, style: "normal" },
        { name: "Figtree", data: extraBold, weight: 800, style: "normal" },
        { name: "Figtree", data: black, weight: 900, style: "normal" },
      ],
    },
  );
}

/** The wordmark as components/Logo.tsx draws it: "report" medium, "saathi" black in plum, a coral heart for the dot of the i and a coral stroke beneath. */
function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", fontSize: 58, lineHeight: 1, letterSpacing: -2.6 }}>
      <span style={{ fontWeight: 500, color: "rgba(43, 26, 41, 0.8)" }}>report</span>
      <span style={{ display: "flex", position: "relative", fontWeight: 900, color: PLUM }}>
        saath
        <span style={{ display: "flex", position: "relative" }}>
          ı
          <svg width="20" height="18" viewBox="0 0 20 18" style={{ position: "absolute", top: 2, left: -8, transform: "rotate(-12deg)" }}>
            <path d="M10 17S1.5 11.6 1.5 6A4.4 4.4 0 0 1 10 3.7 4.4 4.4 0 0 1 18.5 6C18.5 11.6 10 17 10 17Z" fill={CORAL} />
          </svg>
        </span>
        <svg width="150" height="12" viewBox="0 0 120 14" preserveAspectRatio="none" style={{ position: "absolute", left: 1, bottom: -12 }}>
          <path d="M3 9.5C28 4.5 70 2.8 117 5.2" fill="none" stroke={CORAL} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
