import type {
  PropertyDetails,
  PropertyUnit,
  ProjectStatus,
} from "@/lib/types";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatInrCompact,
  formatMonthYear,
  formatPriceRange,
  hasValue,
  hiddenSet,
  sectionHiddenKey,
  showField,
  showSection,
  toWhatsAppDigits,
  type HiddenSet,
  type PropertySection,
} from "@/lib/property/fields";

/**
 * Buyer view: the stripped, render-ready shape of a property page.
 *
 * Built server-side from raw rows (and already-signed file URLs). Hidden or
 * empty fields are dropped here, so components only map over what exists and
 * hidden values never reach the browser on the public share page.
 */

export type BuyerFact = { key: string; label: string; value: string };

export type BuyerUnit = {
  id: string;
  configuration: string | null;
  carpetArea: string | null;
  builtUpArea: string | null;
  price: string | null;
  availability: string | null;
  floorPlanUrl: string | null;
};

export type BuyerNearby = { name: string; type: string | null; distance: string | null };

export type BuyerMediaItem = { id: string; url: string; title: string; kind: "photo" | "video" };

export type BuyerProgressUpdate = { id: string; title: string; date: string | null; note: string | null };

export type BuyerProperty = {
  project: { name: string; location: string | null; coverUrl: string | null };
  keyFacts: BuyerFact[];
  overview: { description: string | null; facts: BuyerFact[] } | null;
  units: { rows: BuyerUnit[]; hasFloorPlans: boolean } | null;
  amenities: string[] | null;
  specifications: { label: string; value: string }[] | null;
  location: { map: { lat: number; lng: number } | null; nearby: BuyerNearby[] } | null;
  gallery: { photos: BuyerMediaItem[]; videos: BuyerMediaItem[]; videoEmbedUrl: string | null; videoLinkUrl: string | null } | null;
  progress: {
    status: string | null;
    possession: string | null;
    percent: number | null;
    updates: BuyerProgressUpdate[];
  } | null;
  cta: {
    brochureUrl: string | null;
    whatsappDigits: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

export type BuyerViewInput = {
  project: { name: string; location: string | null; status: ProjectStatus; coverUrl: string | null };
  details: PropertyDetails | null;
  units: (PropertyUnit & { floorPlanUrl: string | null })[];
  photos: { id: string; url: string | null; title: string }[];
  videos: { id: string; url: string | null; title: string }[];
  brochureUrl: string | null;
  timeline: { id: string; title: string; event_date: string | null; progress_note: string | null; progress_percent?: number | null }[];
  /** Fallback WhatsApp (BuildView sales) when the developer has none. */
  fallbackWhatsApp: string | null;
};

function fact(hidden: HiddenSet, section: PropertySection, key: string, label: string, value: string | null): BuyerFact | null {
  return value != null && showField(hidden, section, key, value) ? { key, label, value } : null;
}

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item != null);
}

function intLabel(value: number | null): string | null {
  return value == null ? null : new Intl.NumberFormat("en-IN").format(value);
}

/** YouTube / Vimeo watch links → embeddable URL. Other links stay plain links. */
export function toVideoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = parsed.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildBuyerProperty(input: BuyerViewInput): BuyerProperty {
  const d = input.details;
  const hidden = hiddenSet(d?.hidden_fields);
  const priceMode = d?.price_mode ?? "show";
  const pricingHidden = hidden.has(sectionHiddenKey("pricing")) || priceMode === "hide";
  const showPrices = !pricingHidden && priceMode === "show";

  // ---- Units -----------------------------------------------------------------
  const unitsSectionOpen =
    !hidden.has(sectionHiddenKey("units")) && !hidden.has("units");
  const unitRows: BuyerUnit[] = unitsSectionOpen
    ? compact(
        input.units.map((unit) => {
          const row: BuyerUnit = {
            id: unit.id,
            configuration: hasValue(unit.configuration) ? unit.configuration!.trim() : null,
            carpetArea: hidden.has("unit_carpet_area") ? null : formatArea(unit.carpet_area_sqft),
            builtUpArea: hidden.has("unit_built_up_area") ? null : formatArea(unit.built_up_area_sqft),
            price: showPrices && !hidden.has("unit_price") ? formatInrCompact(unit.price) : null,
            availability:
              hidden.has("unit_availability") || unit.units_available == null
                ? null
                : unit.units_available === 0
                  ? "Sold out"
                  : `${intLabel(unit.units_available)} available`,
            floorPlanUrl: hidden.has("unit_floor_plan") ? null : unit.floorPlanUrl,
          };
          const { id: _id, ...content } = row;
          return hasValue(content) ? row : null;
        })
      )
    : [];

  const configurations = Array.from(
    new Set(unitRows.map((row) => row.configuration).filter((c): c is string => Boolean(c)))
  );

  // ---- Pricing (feeds the key facts strip) ----------------------------------
  let priceFact: BuyerFact | null = null;
  if (!pricingHidden && d) {
    if (priceMode === "on_request") {
      priceFact = { key: "price", label: "Price", value: "Price on request" };
    } else {
      const range = formatPriceRange(
        hidden.has("price_min") ? null : d.price_min,
        hidden.has("price_max") ? null : d.price_max
      );
      if (range) priceFact = { key: "price", label: "Price", value: range };
    }
  }
  const perSqft =
    showPrices && d
      ? fact(hidden, "pricing", "price_per_sqft", "Price per sq ft", formatInrCompact(d.price_per_sqft))
      : null;

  // ---- Key facts strip -------------------------------------------------------
  const typeFact = d?.property_type
    ? fact(hidden, "overview", "property_type", "Type", PROPERTY_TYPE_LABELS[d.property_type])
    : null;
  const statusFact = d?.property_status
    ? fact(hidden, "overview", "property_status", "Status", PROPERTY_STATUS_LABELS[d.property_status])
    : null;
  const possessionFact = fact(hidden, "overview", "possession_date", "Possession", formatMonthYear(d?.possession_date));
  const reraFact = fact(hidden, "overview", "rera_number", "RERA", d?.rera_number?.trim() || null);

  const keyFacts = compact([
    priceFact,
    configurations.length > 0
      ? { key: "configurations", label: "Configurations", value: configurations.join(", ") }
      : null,
    typeFact,
    statusFact,
    possessionFact,
    reraFact,
  ]);

  // ---- Overview --------------------------------------------------------------
  const description = d && showField(hidden, "overview", "description", d.description) ? d.description!.trim() : null;
  const overviewFacts = compact([
    fact(hidden, "overview", "towers", "Towers", intLabel(d?.towers ?? null)),
    fact(hidden, "overview", "floors", "Floors", intLabel(d?.floors ?? null)),
    fact(hidden, "overview", "total_units", "Total units", intLabel(d?.total_units ?? null)),
    perSqft,
  ]);
  const overview =
    description || overviewFacts.length > 0 ? { description, facts: overviewFacts } : null;

  // ---- Amenities / specifications -------------------------------------------
  const amenityList = (d?.amenities ?? []).map((a) => a.trim()).filter(Boolean);
  const amenities = showField(hidden, "amenities", "amenities", amenityList) ? amenityList : null;

  const specList = (d?.specifications ?? [])
    .map((s) => ({ label: (s?.label ?? "").trim(), value: (s?.value ?? "").trim() }))
    .filter((s) => s.label && s.value);
  const specifications = showField(hidden, "specifications", "specifications", specList) ? specList : null;

  // ---- Location --------------------------------------------------------------
  const coords =
    d?.latitude != null && d?.longitude != null ? { lat: d.latitude, lng: d.longitude } : null;
  const nearbyList: BuyerNearby[] = (d?.nearby_places ?? [])
    .map((p) => ({
      name: (p?.name ?? "").trim(),
      type: p?.type?.trim() || null,
      distance: p?.distance?.trim() || null,
    }))
    .filter((p) => p.name);
  const location = showSection(hidden, "location", { map: coords, nearby_places: nearbyList })
    ? {
        map: showField(hidden, "location", "map", coords) ? coords : null,
        nearby: showField(hidden, "location", "nearby_places", nearbyList) ? nearbyList : [],
      }
    : null;

  // ---- Gallery ---------------------------------------------------------------
  const photos: BuyerMediaItem[] = input.photos
    .filter((p): p is typeof p & { url: string } => Boolean(p.url))
    .map((p) => ({ id: p.id, url: p.url, title: p.title, kind: "photo" }));
  const videos: BuyerMediaItem[] = input.videos
    .filter((v): v is typeof v & { url: string } => Boolean(v.url))
    .map((v) => ({ id: v.id, url: v.url, title: v.title, kind: "video" }));
  const videoUrl = d?.video_url?.trim() || null;
  const galleryValues = {
    gallery: photos,
    videos,
    video_url: videoUrl,
  };
  const gallery = showSection(hidden, "media", galleryValues)
    ? {
        photos: showField(hidden, "media", "gallery", photos) ? photos : [],
        videos: showField(hidden, "media", "videos", videos) ? videos : [],
        videoEmbedUrl: showField(hidden, "media", "video_url", videoUrl) ? toVideoEmbedUrl(videoUrl) : null,
        videoLinkUrl:
          showField(hidden, "media", "video_url", videoUrl) && !toVideoEmbedUrl(videoUrl) ? videoUrl : null,
      }
    : null;

  // ---- Construction progress (only while not completed) ---------------------
  const isCompleted = d?.property_status === "completed" || input.project.status === "completed";
  let progress: BuyerProperty["progress"] = null;
  if (!isCompleted && !hidden.has(sectionHiddenKey("progress"))) {
    const updates: BuyerProgressUpdate[] = hidden.has("progress_updates")
      ? []
      : input.timeline.slice(0, 4).map((event) => ({
          id: event.id,
          title: event.title,
          date: formatMonthYear(event.event_date),
          note: event.progress_note?.trim() || null,
        }));
    const percent =
      hidden.has("progress_updates")
        ? null
        : input.timeline.find((e) => e.progress_percent != null)?.progress_percent ?? null;
    const candidate = {
      status: statusFact?.value ?? null,
      possession: possessionFact?.value ?? null,
      percent,
      updates,
    };
    progress = hasValue(candidate) ? candidate : null;
  }

  // ---- Enquiry / brochure ----------------------------------------------------
  const enquiryOpen = !hidden.has(sectionHiddenKey("enquiry"));
  const brochureUrl =
    showField(hidden, "media", "brochure", input.brochureUrl) ? input.brochureUrl : null;
  const developerWhatsApp =
    enquiryOpen && !hidden.has("whatsapp_number") ? toWhatsAppDigits(d?.whatsapp_number) : null;
  const phone =
    enquiryOpen && showField(hidden, "enquiry", "enquiry_phone", d?.enquiry_phone) ? d!.enquiry_phone!.trim() : null;
  const email =
    enquiryOpen && showField(hidden, "enquiry", "enquiry_email", d?.enquiry_email) ? d!.enquiry_email!.trim() : null;
  const whatsappDigits =
    developerWhatsApp ?? (enquiryOpen && !hidden.has("whatsapp_number") ? toWhatsAppDigits(input.fallbackWhatsApp) : null);
  const ctaCandidate = { brochureUrl, whatsappDigits, phone, email };
  const cta = hasValue(ctaCandidate) ? ctaCandidate : null;

  return {
    project: {
      name: input.project.name,
      location: input.project.location?.trim() || null,
      coverUrl: input.project.coverUrl,
    },
    keyFacts,
    overview,
    units: unitRows.length > 0 ? { rows: unitRows, hasFloorPlans: unitRows.some((r) => r.floorPlanUrl) } : null,
    amenities,
    specifications,
    location,
    gallery,
    progress,
    cta,
  };
}

/** True when staff have entered anything worth a dedicated property page. */
export function hasPropertyContent(view: BuyerProperty): boolean {
  return Boolean(
    view.keyFacts.length ||
      view.overview ||
      view.units ||
      view.amenities ||
      view.specifications ||
      view.location
  );
}
