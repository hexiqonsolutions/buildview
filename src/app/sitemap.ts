import type { MetadataRoute } from "next";
import { marketingRoutes } from "@/lib/integrations";
import { siteConfig } from "@/lib/site-config";

const priorities: Record<string, number> = {
  "": 1,
  "/contact": 0.9,
  "/services": 0.85,
  "/projects": 0.8,
  "/about": 0.75,
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
