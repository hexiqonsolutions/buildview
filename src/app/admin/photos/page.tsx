import {
  getScopedSitePhotos,
  parseWorkspaceScopeFromParams,
} from "@/lib/admin/scope-server";
import { SitePhotosGallery } from "@/components/admin/photos/site-photos-gallery";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { ImageIcon } from "lucide-react";

export default async function SitePhotosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);
  const photos = await getScopedSitePhotos(scope);

  return (
    <OpsWorkspacePage
      title="Site Photos"
      description="Gallery of site photography linked to timeline events across the active workspace."
      icon={ImageIcon}
    >
      <SitePhotosGallery photos={photos} />
    </OpsWorkspacePage>
  );
}
