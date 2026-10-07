"use client";

import { getBoundaryMessage } from "@/lib/errors/public";

/** Replaces the root layout when it fails, so it cannot rely on globals.css or shared UI. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F8FAFC",
          color: "#050505",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px" }}>
            {getBoundaryMessage(error, "BuildView couldn't load. Please try again.")}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              background: "#A4CF30",
              color: "#050505",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
