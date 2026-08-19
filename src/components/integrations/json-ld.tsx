import { siteConfig } from "@/lib/site-config";

const contactSchema = {
  email: siteConfig.contact.email,
  ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
  ...(siteConfig.contact.address
    ? {
        address: {
          "@type": "PostalAddress",
          streetAddress: siteConfig.contact.address,
        },
      }
    : {}),
};

export function JsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        ...contactSchema,
        description: siteConfig.description,
        logo: `${siteConfig.url}${siteConfig.brand.logo}`,
        sameAs: [siteConfig.instagram.url, ...Object.values(siteConfig.social).filter(Boolean)].filter(
          (value, index, list) => list.indexOf(value) === index
        ),
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
        "@type": "Service",
        "@id": `${siteConfig.url}/#service`,
        name: "Construction monitoring",
        serviceType: "Construction monitoring and project visibility",
        provider: { "@id": `${siteConfig.url}/#organization` },
        areaServed: "IN",
        description:
          "Construction visibility and monitoring through 360° site capture, progress tracking, documentation, reports and issue management.",
        url: `${siteConfig.url}/services`,
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
