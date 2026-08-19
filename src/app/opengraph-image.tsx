import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "BuildView — Construction Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const photo = await readFile(
    join(process.cwd(), "public/og/buildview-1200x630.png")
  );
  const photoSrc = `data:image/png;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          backgroundColor: "#050505",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <img
          src={photoSrc}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(5,5,5,0.88) 0%, rgba(5,5,5,0.55) 46%, rgba(5,5,5,0.18) 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 64px",
            width: "720px",
            height: "630px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "18px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#A4CF30",
              fontWeight: 600,
            }}
          >
            Construction Intelligence Platform
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: "84px",
              lineHeight: 0.92,
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            BUILDVIEW
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontSize: "26px",
              lineHeight: 1.35,
              color: "#E2E8F0",
              maxWidth: "560px",
            }}
          >
            Construction monitoring through 360° site capture, progress tracking, reports and issue management.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
