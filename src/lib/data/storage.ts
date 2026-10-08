import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireStaffPermission } from "@/lib/auth/staff";

export type AdminStorageCategory = {
  id: "documents" | "reports" | "photos" | "issue_images" | "matterport";
  label: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageClientRow = {
  clientId: string;
  clientName: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageStats = {
  totalBytes: number;
  limitBytes: number;
  categories: AdminStorageCategory[];
  clients: AdminStorageClientRow[];
};

export type AdminSitePhoto = {
  id: string;
  caption: string | null;
  storage_path: string | null;
  image_url: string;
  created_at: string;
  event_id: string;
  event_title: string;
  event_date: string;
  project_id: string;
  project_name: string;
  building?: string | null;
  floor?: string | null;
};

/** Display-only allocation for the usage meter; Supabase enforces the real plan quota. */
const STORAGE_ALLOCATION_BYTES = 100 * 1024 ** 3;

function sumFileSizes(rows: Array<{ file_size: number | null }> | null | undefined) {
  return rows?.reduce((sum, row) => sum + (row.file_size ?? 0), 0) ?? 0;
}

export async function getAdminStorageStats(): Promise<AdminStorageStats> {
  await requireStaffPermission("read", "storage");
  const supabase = await createClient();

  const [
    documentsRes,
    reportsRes,
    photosRes,
    issueImagesRes,
    toursRes,
    projectsRes,
    clientsRes,
  ] = await Promise.all([
    supabase.from("documents").select("file_size, project_id").is("deleted_at", null),
    supabase.from("reports").select("file_size, project_id").is("deleted_at", null),
    supabase.from("timeline_photos").select("id").is("deleted_at", null),
    supabase.from("issue_images").select("id").is("deleted_at", null),
    supabase.from("project_tours").select("id").is("deleted_at", null),
    supabase.from("projects").select("id, client_id").is("deleted_at", null),
    supabase.from("clients").select("id, name, company_name").is("deleted_at", null),
  ]);

  const docBytes = sumFileSizes(documentsRes.data);
  const reportBytes = sumFileSizes(reportsRes.data);
  const photoCount = photosRes.data?.length ?? 0;
  const issueImageCount = issueImagesRes.data?.length ?? 0;
  const tourCount = toursRes.data?.length ?? 0;

  const projectClientMap = new Map<string, string>();
  projectsRes.data?.forEach((p) => {
    if (p.client_id) projectClientMap.set(p.id, p.client_id);
  });

  const clientNameMap = new Map<string, string>();
  clientsRes.data?.forEach((c) => {
    clientNameMap.set(c.id, c.company_name || c.name);
  });

  const clientUsage = new Map<string, { bytes: number; fileCount: number }>();

  function addClientUsage(projectId: string, bytes: number, count = 1) {
    const clientId = projectClientMap.get(projectId);
    if (!clientId) return;
    const current = clientUsage.get(clientId) ?? { bytes: 0, fileCount: 0 };
    clientUsage.set(clientId, {
      bytes: current.bytes + bytes,
      fileCount: current.fileCount + count,
    });
  }

  documentsRes.data?.forEach((d) => addClientUsage(d.project_id, d.file_size ?? 0));
  reportsRes.data?.forEach((r) => addClientUsage(r.project_id, r.file_size ?? 0));

  const categories: AdminStorageCategory[] = [
    {
      id: "documents",
      label: "Documents",
      bytes: docBytes,
      fileCount: documentsRes.data?.length ?? 0,
    },
    {
      id: "reports",
      label: "Reports",
      bytes: reportBytes,
      fileCount: reportsRes.data?.length ?? 0,
    },
    {
      id: "photos",
      label: "Site Photos",
      bytes: 0,
      fileCount: photoCount,
    },
    {
      id: "issue_images",
      label: "Issue Images",
      bytes: 0,
      fileCount: issueImageCount,
    },
    {
      id: "matterport",
      label: "Virtual Tours",
      bytes: 0,
      fileCount: tourCount,
    },
  ];

  const totalBytes = docBytes + reportBytes;
  const clients: AdminStorageClientRow[] = Array.from(clientUsage.entries())
    .map(([clientId, usage]) => ({
      clientId,
      clientName: clientNameMap.get(clientId) ?? "Unknown client",
      bytes: usage.bytes,
      fileCount: usage.fileCount,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalBytes,
    limitBytes: STORAGE_ALLOCATION_BYTES,
    categories,
    clients,
  };
}

export async function getAdminSitePhotos(): Promise<AdminSitePhoto[]> {
  await requireStaffPermission("read", "projects");
  const supabase = await createClient();

  const { data } = await supabase
    .from("timeline_photos")
    .select(
      `
      id,
      caption,
      storage_path,
      image_url,
      created_at,
      timeline_event:timeline_events(
        id,
        title,
        event_date,
        project_id,
        building,
        floor,
        project:projects(name)
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) return [];

  const photos: AdminSitePhoto[] = [];

  for (const row of data) {
    const event = row.timeline_event as {
      id: string;
      title: string;
      event_date: string;
      project_id: string;
      building: string | null;
      floor: string | null;
      project: { name: string } | null;
    } | null;

    if (!event) continue;

    photos.push({
      id: row.id,
      caption: row.caption,
      storage_path: row.storage_path,
      image_url: row.image_url,
      created_at: row.created_at,
      event_id: event.id,
      event_title: event.title,
      event_date: event.event_date,
      project_id: event.project_id,
      project_name: event.project?.name ?? "Project",
      building: event.building,
      floor: event.floor,
    });
  }

  return photos;
}
