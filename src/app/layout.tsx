import type { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { SiteAnalytics } from "@/components/integrations/site-analytics";
import { defaultMetadata } from "@/lib/seo";
import "./globals.css";

const body = Open_Sans({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const display = Poppins({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#A4CF30" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${body.variable} ${display.variable} font-sans`}
        suppressHydrationWarning
      >
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
