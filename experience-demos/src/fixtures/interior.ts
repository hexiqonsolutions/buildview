import { interiorTourUrl, thumbFor } from "./matterport";
import type { DemoProject, PortfolioDashboardFixture } from "./types";

const MP = interiorTourUrl();
const THUMB = thumbFor(MP);

const INTERIOR_PHOTOS = [
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&h=700&fit=crop",
];

const ARCH_PHOTOS = [
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=900&h=700&fit=crop",
];

function emptyOps() {
  return {
    issues: [],
    timeline: [],
    comments: [],
    progression: {
      overall_percent: 100,
      pre_slab_percent: 100,
      post_slab_percent: 100,
      floors_complete: 0,
      floors_total: 0,
      phases: [],
      weekly: [],
    },
    reports: [],
    documents: [],
  };
}

export function getInteriorProjects(): DemoProject[] {
  const residenceTours = [
    {
      id: "int-tour-1",
      name: "Living & dining — final",
      matterport_url: MP,
      capture_date: "2025-11-12",
      description: "Primary living volume after FF&E install",
      thumbnail_url: THUMB,
      building: "Residence",
      floor: "Level 1",
      sort_order: 0,
    },
    {
      id: "int-tour-2",
      name: "Primary suite walkthrough",
      matterport_url: MP,
      capture_date: "2025-11-12",
      description: "Bedroom, dressing, and wet areas",
      thumbnail_url: THUMB,
      building: "Residence",
      floor: "Level 2",
      sort_order: 1,
    },
    {
      id: "int-tour-3",
      name: "Client presentation capture",
      matterport_url: MP,
      capture_date: "2025-09-03",
      description: "Pre-handover presentation for stakeholders",
      thumbnail_url: THUMB,
      building: "Residence",
      floor: "All",
      sort_order: 2,
    },
  ];

  const studioTours = [
    {
      id: "arch-tour-1",
      name: "Courtyard villa — exterior to core",
      matterport_url: MP,
      capture_date: "2025-06-20",
      description: "Architecture showcase walkthrough",
      thumbnail_url: THUMB,
      building: "Villa",
      floor: "Ground",
      sort_order: 0,
    },
    {
      id: "arch-tour-2",
      name: "Upper gallery",
      matterport_url: MP,
      capture_date: "2025-06-20",
      description: "Double-height gallery and bridge",
      thumbnail_url: THUMB,
      building: "Villa",
      floor: "First",
      sort_order: 1,
    },
  ];

  const boutiqueTours = [
    {
      id: "int-tour-b1",
      name: "Boutique lobby & retail floor",
      matterport_url: MP,
      capture_date: "2024-12-08",
      description: "Hospitality-grade interior package",
      thumbnail_url: THUMB,
      building: "Boutique",
      floor: "GF",
      sort_order: 0,
    },
  ];

  return [
    {
      id: "exp-interior-palm-residence",
      name: "Palm Grove Residence",
      client_name: "Atelier North",
      location: "Juhu, Mumbai",
      description:
        "4,200 sq ft coastal residence — warm timber, limestone, and layered lighting. Delivered as a client-ready digital showcase with Matterport walkthroughs and photography.",
      status: "completed",
      start_date: "2024-02-01",
      completion_date: "2025-11-15",
      cover_image_url: INTERIOR_PHOTOS[0],
      area_sqft: 4200,
      portfolio_category: "interior",
      progress: 100,
      stage: "Completed",
      tourCount: residenceTours.length,
      latestTour: residenceTours[0],
      tours: residenceTours,
      media: INTERIOR_PHOTOS.map((url, i) => ({
        id: `im-${i}`,
        type: "photo" as const,
        title: `Palm Grove — still ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
    {
      id: "exp-architecture-courtyard-villa",
      name: "Courtyard Villa",
      client_name: "Atelier North",
      location: "Alibaug, Maharashtra",
      description:
        "Architecture-led villa with central courtyard and climate-responsive envelope. Virtual walkthrough for remote client reviews.",
      status: "completed",
      start_date: "2023-08-01",
      completion_date: "2025-06-30",
      cover_image_url: ARCH_PHOTOS[0],
      area_sqft: 6800,
      portfolio_category: "architecture",
      progress: 100,
      stage: "Completed",
      tourCount: studioTours.length,
      latestTour: studioTours[0],
      tours: studioTours,
      media: ARCH_PHOTOS.map((url, i) => ({
        id: `am-${i}`,
        type: "photo" as const,
        title: `Courtyard Villa — still ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
    {
      id: "exp-interior-boutique-lobby",
      name: "Indigo Boutique Lobby",
      client_name: "Atelier North",
      location: "Bandra Kurla Complex, Mumbai",
      description:
        "Boutique hospitality lobby and retail edge — material boards realized in-space for investor walkthroughs.",
      status: "completed",
      start_date: "2024-05-01",
      completion_date: "2024-12-15",
      cover_image_url: INTERIOR_PHOTOS[2],
      area_sqft: 1850,
      portfolio_category: "interior",
      progress: 100,
      stage: "Completed",
      tourCount: boutiqueTours.length,
      latestTour: boutiqueTours[0],
      tours: boutiqueTours,
      media: INTERIOR_PHOTOS.slice(2, 5).map((url, i) => ({
        id: `bm-${i}`,
        type: "photo" as const,
        title: `Indigo Lobby — still ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
  ];
}

export function getInteriorFixture(): PortfolioDashboardFixture {
  const projects = getInteriorProjects();
  return {
    mode: "portfolio",
    clientName: "Atelier North",
    firstName: "Meera",
    fullName: "Meera Kapoor",
    email: "meera@atelier-demo.buildview",
    stats: {
      completed: projects.filter((p) => p.status === "completed").length,
      locations: new Set(projects.map((p) => p.location.split(",").pop()?.trim())).size,
      walkthroughs: projects.reduce((n, p) => n + p.tourCount, 0),
    },
    projects,
    featuredProjectId: projects[0].id,
  };
}

export function getInteriorProject(id: string): DemoProject | undefined {
  return getInteriorProjects().find((p) => p.id === id);
}
