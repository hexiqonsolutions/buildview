import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  ProjectMedia,
  ProjectStatus,
  PropertyDetails,
  PropertyUnit,
} from "@/lib/types";
import { STORAGE_BUCKETS } from "@/lib/types";
import { buildBuyerProperty, type BuyerProperty } from "@/lib/property/buyer-view";
import { siteConfig } from "@/lib/site-config";

type Client = SupabaseClient<Database>;

/** Long enough for a buyer to browse the page after opening it. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

export type PropertyRows = {
  details: PropertyDetails | null;
  units: PropertyUnit[];
};

/** Raw rows. Missing tables (migration 044 not applied) read as empty. */
export async function loadPropertyRows(client: Client, projectId: string): Promise<PropertyRows> {
  const [detailsRes, unitsRes] = await Promise.all([
    client.from("property_details").select("*").eq("project_id", projectId).maybeSingle(),
    client
      .from("property_units")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  return {
    details: detailsRes.error ? null : ((detailsRes.data as PropertyDetails | null) ?? null),
    units: unitsRes.error ? [] : ((unitsRes.data as PropertyUnit[] | null) ?? []),
  };
}

export async function signProjectMediaPaths(
  client: Client,
  paths: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return new Map();
  const { data } = await client.storage
    .from(STORAGE_BUCKETS.PROJECT_MEDIA)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  return new Map(
    (data ?? [])
      .filter((entry) => !entry.error && entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl as string] as const)
  );
}

/**
 * Build the stripped buyer view for a project with the given client.
 * Portal passes the RLS client; the public share page passes the service-role
 * client after validating the share token.
 */
export async function loadBuyerProperty(
  client: Client,
  projectId: string,
  override?: PropertyRows
): Promise<BuyerProperty | null> {
  const { data: project } = await client
    .from("projects")
    .select("id, name, location, status, cover_image_url")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) return null;

  const [rows, mediaRes, timelineRes] = await Promise.all([
    override ? Promise.resolve(override) : loadPropertyRows(client, projectId),
    client
      .from("project_media")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    client
      .from("timeline_events")
      .select("id, title, event_date, progress_note, progress_percent")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("event_date", { ascending: false })
      .limit(4),
  ]);

  const media = mediaRes.error ? [] : ((mediaRes.data as ProjectMedia[] | null) ?? []);
  const timeline = timelineRes.error
    ? []
    : ((timelineRes.data as {
        id: string;
        title: string;
        event_date: string | null;
        progress_note: string | null;
        progress_percent: number | null;
      }[] | null) ?? []);

  const signed = await signProjectMediaPaths(client, [
    ...media.map((m) => m.storage_path),
    ...rows.units.map((u) => u.floor_plan_path),
    rows.details?.brochure_path,
  ]);
  const urlFor = (path: string | null | undefined) => (path ? signed.get(path) ?? null : null);

  const p = project as {
    name: string;
    location: string | null;
    status: ProjectStatus;
    cover_image_url: string | null;
  };

  return buildBuyerProperty({
    project: { name: p.name, location: p.location, status: p.status, coverUrl: p.cover_image_url },
    details: rows.details,
    units: rows.units.map((unit) => ({ ...unit, floorPlanUrl: urlFor(unit.floor_plan_path) })),
    photos: media
      .filter((m) => m.media_type === "photo")
      .map((m) => ({ id: m.id, url: urlFor(m.storage_path), title: m.title })),
    videos: media
      .filter((m) => m.media_type === "video")
      .map((m) => ({ id: m.id, url: urlFor(m.storage_path), title: m.title })),
    brochureUrl: urlFor(rows.details?.brochure_path),
    timeline,
    fallbackWhatsApp: siteConfig.contact.whatsappE164,
  });
}
