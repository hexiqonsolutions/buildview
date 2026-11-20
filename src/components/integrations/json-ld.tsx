import { solutions } from "@/lib/marketing/solutions";
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
        logo: `${siteConfig.url}${siteConfig.brand.logoRaster}`,
        sameAs: [siteConfig.instagram.url, ...Object.values(siteConfig.social).filter(Boolean)].filter(
          (value, index, list) => list.indexOf(value) === index
        ),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: `${siteConfig.name} 360° Visualization Platform`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
        url: siteConfig.url,
        provider: { "@id": `${siteConfig.url}/#organization` },
        featureList: [
          "360° virtual walkthroughs",
          "Construction intelligence",
          "Interior showcase portfolios",
          "Real estate property tours",
          "Progress reports",
          "Document management",
          "Issue tracking",
          "Client dashboard",
        ],
      },
      ...solutions.map((solution) => ({
        "@type": "Service",
        "@id": `${siteConfig.url}${solution.href}#service`,
        name: solution.navLabel,
        serviceType: solution.eyebrow,
        provider: { "@id": `${siteConfig.url}/#organization` },
        areaServed: "IN",
        description: solution.seo.description,
        url: `${siteConfig.url}${solution.href}`,
      })),
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
