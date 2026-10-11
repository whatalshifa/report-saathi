import { ImageResponse } from "next/og";

export const alt = "ReportSaathi: understand every lab report your family gets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROWS = [
  ["Haemoglobin", "10.6 g/dL", "Low", "#fef3c7", "#78350f"],
  ["HbA1c", "6.1 %", "High", "#ffe4e6", "#9f1239"],
  ["Serum Creatinine", "0.8 mg/dL", "Normal", "#d1fae5", "#065f46"],
];

/** The picture shown when the link is shared on WhatsApp, LinkedIn or X. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #fff7f3 0%, #fff7f3 55%, #ffe2d5 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          {/* The wordmark: "report" light, "saathi" heavy in plum over a coral stroke. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", fontSize: 56, letterSpacing: -2.5, lineHeight: 1 }}>
              <span style={{ color: "#4a3346", fontWeight: 400 }}>report</span>
              <span style={{ color: "#6b3768", fontWeight: 800 }}>saathi</span>
            </div>
            <div style={{ display: "flex", marginLeft: 160, marginTop: 4, width: 150, height: 8, borderRadius: 8, background: "#f06a48", transform: "rotate(-2deg)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 62, fontWeight: 800, color: "#2b1a29", lineHeight: 1.05, letterSpacing: -2 }}>
              Understand every lab report your family gets.
            </div>
            <div style={{ fontSize: 28, color: "#6e5f69", marginTop: 24 }}>
              Every value read and flagged, explained in English, Hindi or Marathi.
            </div>
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            alignSelf: "center",
            width: 400,
            background: "white",
            borderRadius: 40,
            padding: 36,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            boxShadow: "0 20px 50px rgba(107, 55, 104, 0.15)",
          }}
        >
          {ROWS.map(([name, value, flag, bg, fg]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#2a1d28" }}>{name}</div>
                <div style={{ fontSize: 20, color: "#6e5f69" }}>{value}</div>
              </div>
              <div
                style={{
                  background: bg,
                  color: fg,
                  fontSize: 20,
                  fontWeight: 700,
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
    size,
  );
}
