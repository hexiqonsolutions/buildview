import { siteConfig } from "@/lib/site-config";

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    email: siteConfig.contact.email,
    ...(siteConfig.contact.phone ? { telephone: siteConfig.contact.phone } : {}),
    ...(siteConfig.contact.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: "Lok Upvan Phase 2",
            addressLocality: "Thane",
            addressRegion: "Maharashtra",
            addressCountry: "IN",
          },
        }
      : {}),
    logo: `${siteConfig.url}${siteConfig.brand.logo}`,
    sameAs: Object.values(siteConfig.social).filter(Boolean),
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
