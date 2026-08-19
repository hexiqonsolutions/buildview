import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "999px",
            border: "3px solid #A4CF30",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
