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
          background: "linear-gradient(135deg, #fbf7f2 0%, #fbf7f2 55%, #ffe7dc 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: "#6b3768",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 30, height: 38, background: "white", borderRadius: 4, display: "flex" }} />
            </div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#6b3768" }}>ReportSaathi</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 700, color: "#2a1d28", lineHeight: 1.1 }}>
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
            borderRadius: 28,
            padding: 32,
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
