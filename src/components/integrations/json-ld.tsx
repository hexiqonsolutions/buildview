import { siteConfig } from "@/lib/site-config";

export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        email: siteConfig.contact.email,
        telephone: siteConfig.contact.phone,
        description: siteConfig.description,
        logo: `${siteConfig.url}${siteConfig.brand.logo}`,
        sameAs: Object.values(siteConfig.social),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: `${siteConfig.name} Construction Intelligence Platform`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        url: siteConfig.url,
        provider: { "@id": `${siteConfig.url}/#organization` },
        featureList: [
          "360° virtual site tours",
          "Construction progress tracking",
          "Progress reports",
          "Document management",
          "Issue tracking",
          "Project timelines",
          "Client dashboard",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
