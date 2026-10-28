import type { Metadata } from "next";
import { TourShareUnavailable, TourShareViewer } from "@/components/share/tour-share-viewer";
import { getTourSharePublicMeta } from "@/lib/actions/tour-shares";
import { siteConfig } from "@/lib/site-config";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await getTourSharePublicMeta(token);
  if (!result.ok) {
    return {
      title: `Link unavailable | ${siteConfig.name}`,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${result.meta.tourName} · ${result.meta.projectName} | ${siteConfig.name}`,
    description: `Shared 360° site tour for ${result.meta.projectName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicTourSharePage({ params }: PageProps) {
  const { token } = await params;
  const result = await getTourSharePublicMeta(token);

  if (!result.ok) {
    return <TourShareUnavailable />;
  }

  return <TourShareViewer meta={result.meta} />;
}
