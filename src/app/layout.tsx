import type { Metadata } from "next";
import { IBM_Plex_Sans, Syne } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BuildView CRM",
  description:
    "Enterprise sales CRM for construction leads, email, follow-ups, and pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${sans.variable} min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 antialiased`}
      >
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
