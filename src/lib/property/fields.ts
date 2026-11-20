import type {
  PropertyDetails,
  PropertyPriceMode,
  PropertyStatus,
  PropertyType,
  PropertyUnit,
} from "@/lib/types";

/**
 * Property details: field + section registry and the ONE display rule.
 *
 *   A field shows only if it has a value and isn't hidden.
 *   A section shows only if it isn't hidden and at least one of its fields shows.
 *
 * Shared by the admin editor (eye toggles, preview) and the buyer page.
 * Pure — safe on server and client.
 */

export const PROPERTY_SECTIONS = [
  "overview",
  "pricing",
  "units",
  "amenities",
  "specifications",
  "location",
  "media",
  "progress",
  "enquiry",
] as const;
export type PropertySection = (typeof PROPERTY_SECTIONS)[number];

export const PROPERTY_SECTION_LABELS: Record<PropertySection, string> = {
  overview: "Overview",
  pricing: "Pricing",
  units: "Unit types",
  amenities: "Amenities",
  specifications: "Specifications",
  location: "Location",
  media: "Media",
  progress: "Construction progress",
  enquiry: "Enquiry contacts",
};

/** Every hideable field key, grouped by the section it belongs to. */
export const PROPERTY_SECTION_FIELDS = {
  overview: [
    "property_type",
    "property_status",
    "possession_date",
    "rera_number",
    "towers",
    "floors",
    "total_units",
    "description",
  ],
  pricing: ["price_min", "price_max", "price_per_sqft"],
  units: [
    "units",
    "unit_carpet_area",
    "unit_built_up_area",
    "unit_price",
    "unit_availability",
    "unit_floor_plan",
  ],
  amenities: ["amenities"],
  specifications: ["specifications"],
  location: ["map", "nearby_places"],
  media: ["gallery", "videos", "video_url", "brochure"],
  progress: ["progress_updates"],
  enquiry: ["enquiry_phone", "whatsapp_number", "enquiry_email"],
} as const satisfies Record<PropertySection, readonly string[]>;

export type PropertyFieldKey = (typeof PROPERTY_SECTION_FIELDS)[PropertySection][number];

export function sectionHiddenKey(section: PropertySection): string {
  return `section:${section}`;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  villa: "Villa",
  row_house: "Row house",
  plot: "Plot",
  penthouse: "Penthouse",
  studio: "Studio",
  commercial: "Commercial",
  office: "Office",
  retail: "Retail",
  mixed_use: "Mixed use",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  new_launch: "New launch",
  under_construction: "Under construction",
  ready_to_move: "Ready to move",
  completed: "Completed",
};

export const PRICE_MODE_LABELS: Record<PropertyPriceMode, string> = {
  show: "Show prices",
  on_request: "Price on request",
  hide: "Hide prices",
};

export const COMMON_AMENITIES = [
  "Swimming pool",
  "Gymnasium",
  "Clubhouse",
  "Children's play area",
  "Landscaped garden",
  "Jogging track",
  "24×7 security",
  "CCTV surveillance",
  "Power backup",
  "Covered parking",
  "Lift",
  "Indoor games",
  "Multipurpose hall",
  "Rainwater harvesting",
  "EV charging",
  "Senior citizen area",
] as const;

// -----------------------------------------------------------------------------
// The display rule
// -----------------------------------------------------------------------------

/** True when a value carries content: not null/undefined, blank text, NaN, or an empty list/object. */
export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value as object).some(hasValue);
  return true;
}

export type HiddenSet = ReadonlySet<string>;

export function hiddenSet(hidden: readonly string[] | null | undefined): HiddenSet {
  return new Set(hidden ?? []);
}

export function isHidden(hidden: HiddenSet, key: string): boolean {
  return hidden.has(key);
}

/** Field rule: has a value and neither the field nor its section is hidden. */
export function showField(
  hidden: HiddenSet,
  section: PropertySection,
  key: string,
  value: unknown
): boolean {
  return !hidden.has(sectionHiddenKey(section)) && !hidden.has(key) && hasValue(value);
}

/** Section rule: not hidden and at least one of its (already-resolved) field values shows. */
export function showSection(
  hidden: HiddenSet,
  section: PropertySection,
  fieldValues: Partial<Record<string, unknown>>
): boolean {
  if (hidden.has(sectionHiddenKey(section))) return false;
  return Object.entries(fieldValues).some(
    ([key, value]) => !hidden.has(key) && hasValue(value)
  );
}

// -----------------------------------------------------------------------------
// Formatting (never returns placeholder text; callers drop null)
// -----------------------------------------------------------------------------

const inrFull = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹85 L, ₹1.25 Cr, ₹9,500 */
export function formatInrCompact(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= 1e7) return `₹${trimDecimals(value / 1e7)} Cr`;
  if (value >= 1e5) return `₹${trimDecimals(value / 1e5)} L`;
  return `₹${inrFull.format(value)}`;
}

function trimDecimals(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatPriceRange(min: number | null, max: number | null): string | null {
  const a = formatInrCompact(min);
  const b = formatInrCompact(max);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  if (a) return `From ${a}`;
  if (b) return `Up to ${b}`;
  return null;
}

export function formatArea(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${inrFull.format(value)} sq ft`;
}

export function formatMonthYear(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(parsed);
}

/** Digits only, India default (+91) when a bare 10-digit number is given. */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 8 ? digits : null;
}

export type EditableUnit = Pick<
  PropertyUnit,
  | "configuration"
  | "carpet_area_sqft"
  | "built_up_area_sqft"
  | "price"
  | "units_available"
  | "floor_plan_path"
>;

export type EditablePropertyDetails = Omit<
  PropertyDetails,
  "id" | "project_id" | "created_at" | "updated_at" | "created_by" | "updated_by"
>;

export function emptyPropertyDetails(): EditablePropertyDetails {
  return {
    property_type: null,
    property_status: null,
    possession_date: null,
    rera_number: null,
    towers: null,
    floors: null,
    total_units: null,
    description: null,
    price_min: null,
    price_max: null,
    price_per_sqft: null,
    price_mode: null,
    latitude: null,
    longitude: null,
    nearby_places: null,
    amenities: null,
    specifications: null,
    video_url: null,
    brochure_path: null,
    brochure_file_name: null,
    enquiry_phone: null,
    whatsapp_number: null,
    enquiry_email: null,
    hidden_fields: null,
  };
}
