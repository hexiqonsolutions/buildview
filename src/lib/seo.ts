import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

const siteUrl = siteConfig.url;
const ogImage = {
  url: siteConfig.brand.ogImage,
  width: 1200,
  height: 630,
  alt: "BuildView — Experience every space. 360° visualization for construction intelligence, real estate tours, and interior showcases.",
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.seo.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "360 virtual walkthrough solutions",
    "immersive 360 experiences",
    "construction intelligence platform",
    "360 construction monitoring",
    "interior design virtual portfolio",
    "360 interior virtual tour",
    "real estate virtual tours",
    "virtual property walkthrough",
    "360 property photography",
    "BuildView",
  ],
  authors: [{ name: siteConfig.name, url: siteUrl }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: siteConfig.name,
    title: siteConfig.seo.ogTitle,
    description: siteConfig.description,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.seo.ogTitle,
    description: siteConfig.description,
    images: [ogImage.url],
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
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

/** Signed-in and auth screens: keep them out of search results and drop the homepage canonical. */
export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
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
  const ogTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    keywords: defaultMetadata.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: "en_IN",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage.url],
    },
  };
}
