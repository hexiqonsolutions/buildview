import { realEstateTourUrl, thumbFor } from "./matterport";
import type { DemoProject, PortfolioDashboardFixture } from "./types";

const MP = realEstateTourUrl();
const THUMB = thumbFor(MP);

const LISTING_PHOTOS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=700&fit=crop",
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

export function getRealEstateProjects(): DemoProject[] {
  const skylineTours = [
    {
      id: "re-tour-1",
      name: "Full apartment walkthrough",
      matterport_url: MP,
      capture_date: "2026-02-10",
      description: "3BHK skyline residence — living to terraces",
      thumbnail_url: THUMB,
      building: "Skyline Residences",
      floor: "Floor 18",
      sort_order: 0,
    },
    {
      id: "re-tour-2",
      name: "Evening listing capture",
      matterport_url: MP,
      capture_date: "2026-02-10",
      description: "Staged evening lighting for listing portal",
      thumbnail_url: THUMB,
      building: "Skyline Residences",
      floor: "Floor 18",
      sort_order: 1,
    },
  ];

  const villaTours = [
    {
      id: "re-tour-v1",
      name: "Villa arrival to courtyard",
      matterport_url: MP,
      capture_date: "2025-10-04",
      description: "Premium villa listing walkthrough",
      thumbnail_url: THUMB,
      building: "Lakeview Villa",
      floor: "Ground",
      sort_order: 0,
    },
  ];

  const penthouseTours = [
    {
      id: "re-tour-p1",
      name: "Penthouse & terrace",
      matterport_url: MP,
      capture_date: "2025-12-19",
      description: "Duplex penthouse digital listing",
      thumbnail_url: THUMB,
      building: "Harbour One",
      floor: "PH",
      sort_order: 0,
    },
    {
      id: "re-tour-p2",
      name: "Terrace entertaining zone",
      matterport_url: MP,
      capture_date: "2025-12-19",
      description: "Outdoor kitchen and lounge",
      thumbnail_url: THUMB,
      building: "Harbour One",
      floor: "Roof",
      sort_order: 1,
    },
  ];

  return [
    {
      id: "exp-re-skyline-18",
      name: "Skyline Residences — 18B",
      client_name: "Harbour Estates",
      location: "Worli, Mumbai",
      description:
        "3 bed · 3 bath · 1,850 sq ft · sea-facing Grade-A residence. Instant buyer walkthrough with Matterport and listing photography.",
      status: "completed",
      start_date: "2026-01-15",
      completion_date: "2026-02-12",
      cover_image_url: LISTING_PHOTOS[0],
      area_sqft: 1850,
      portfolio_category: "real_estate",
      progress: 100,
      stage: "Listed",
      tourCount: skylineTours.length,
      latestTour: skylineTours[0],
      tours: skylineTours,
      media: LISTING_PHOTOS.slice(0, 4).map((url, i) => ({
        id: `re-m-${i}`,
        type: "photo" as const,
        title: `Skyline 18B — photo ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
    {
      id: "exp-re-lakeview-villa",
      name: "Lakeview Villa",
      client_name: "Harbour Estates",
      location: "Powai, Mumbai",
      description:
        "4 bed villa · private courtyard · 4,100 sq ft. Broker-ready twin for remote private showings.",
      status: "completed",
      start_date: "2025-09-01",
      completion_date: "2025-10-08",
      cover_image_url: LISTING_PHOTOS[5],
      area_sqft: 4100,
      portfolio_category: "real_estate",
      progress: 100,
      stage: "Listed",
      tourCount: villaTours.length,
      latestTour: villaTours[0],
      tours: villaTours,
      media: LISTING_PHOTOS.slice(3, 6).map((url, i) => ({
        id: `re-v-${i}`,
        type: "photo" as const,
        title: `Lakeview Villa — photo ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
    {
      id: "exp-re-harbour-penthouse",
      name: "Harbour One Penthouse",
      client_name: "Harbour Estates",
      location: "Colaba, Mumbai",
      description:
        "Duplex penthouse · entertainment terrace · 3,250 sq ft. Premium listing twin for international buyers.",
      status: "completed",
      start_date: "2025-11-01",
      completion_date: "2025-12-22",
      cover_image_url: LISTING_PHOTOS[4],
      area_sqft: 3250,
      portfolio_category: "real_estate",
      progress: 100,
      stage: "Listed",
      tourCount: penthouseTours.length,
      latestTour: penthouseTours[0],
      tours: penthouseTours,
      media: LISTING_PHOTOS.slice(1, 5).map((url, i) => ({
        id: `re-p-${i}`,
        type: "photo" as const,
        title: `Harbour Penthouse — photo ${i + 1}`,
        url,
        sort_order: i,
      })),
      ...emptyOps(),
    },
  ];
}

export function getRealEstateFixture(): PortfolioDashboardFixture {
  const projects = getRealEstateProjects();
  return {
    mode: "portfolio",
    clientName: "Harbour Estates",
    firstName: "Kabir",
    fullName: "Kabir Mehta",
    email: "kabir@harbour-demo.buildview",
    stats: {
      completed: projects.length,
      locations: new Set(projects.map((p) => p.location)).size,
      walkthroughs: projects.reduce((n, p) => n + p.tourCount, 0),
    },
    projects,
    featuredProjectId: projects[0].id,
  };
}

export function getRealEstateProject(id: string): DemoProject | undefined {
  return getRealEstateProjects().find((p) => p.id === id);
}
