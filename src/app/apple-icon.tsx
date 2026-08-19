import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
        }}
      >
        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "999px",
            border: "10px solid #A4CF30",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A4CF30",
            fontSize: "54px",
            fontWeight: 700,
          }}
        >
          B
        </div>
      </div>
    ),
    { ...size }
  );
}
