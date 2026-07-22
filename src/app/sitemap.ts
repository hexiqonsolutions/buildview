import type { MetadataRoute } from "next";
import { marketingRoutes } from "@/lib/integrations";
import { siteConfig } from "@/lib/site-config";

const priorities: Record<string, number> = {
  "": 1,
  "/contact": 0.9,
  "/pricing": 0.88,
  "/services": 0.85,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  return marketingRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: priorities[path] ?? 0.7,
  }));
}
