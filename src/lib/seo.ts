import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

const siteUrl = siteConfig.url;

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Construction Monitoring Software | BuildView Construction Intelligence Platform",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "construction monitoring software",
    "construction intelligence platform",
    "construction progress tracking",
    "virtual site tours",
    "360 virtual tour construction",
    "360 site captures",
    "construction document management",
    "construction issue tracking",
    "project timeline construction",
    "remote site inspection",
    "BuildView",
    "PMC dashboard",
  ],
  authors: [{ name: siteConfig.name, url: siteUrl }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: siteConfig.name,
    title:
      "Construction Monitoring Software | BuildView Construction Intelligence Platform",
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.brand.logo,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — construction monitoring with virtual site tours`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Construction Monitoring Software | BuildView Construction Intelligence Platform",
    description: siteConfig.description,
    images: [siteConfig.brand.logo],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export function pageMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = `${siteUrl}${path}`;

  return {
    title,
    description,
    keywords: defaultMetadata.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
    },
  };
}
