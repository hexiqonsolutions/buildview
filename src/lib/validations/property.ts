import { z } from "zod";
import {
  LIMITS,
  fileName,
  httpsUrl,
  int,
  money,
  oneOf,
  optional,
  optionalEmail,
  optionalIsoDate,
  optionalPhone,
  optionalText,
  storagePath,
  text,
  uuid,
} from "@/lib/validations/primitives";
import { PROPERTY_SECTIONS, PROPERTY_SECTION_FIELDS, sectionHiddenKey } from "@/lib/property/fields";

/** Every key the eye toggles may write into hidden_fields. */
const HIDEABLE_KEYS = new Set<string>([
  ...PROPERTY_SECTIONS.map(sectionHiddenKey),
  ...Object.values(PROPERTY_SECTION_FIELDS).flat(),
]);

const count = (label: string) => optional(int(label, { min: 0, max: 100_000 }));
const amount = (label: string) => optional(money(label, { max: 1_000_000_000_000 }));
const area = (label: string) => optional(money(label, { max: 10_000_000 }));

export const PROPERTY_BROCHURE_MAX_BYTES = 50 * 1024 * 1024;

export const propertyNearbyPlaceSchema = z
  .object({
    name: text("Place name", { max: LIMITS.shortText }),
    type: optionalText("Place type", { max: 60 }),
    distance: optionalText("Distance", { max: 40 }),
  })
  .strict();

export const propertySpecificationSchema = z
  .object({
    label: text("Specification", { max: LIMITS.shortText }),
    value: text("Specification detail", { max: 500 }),
  })
  .strict();

export const propertyDetailsSchema = z
  .object({
    property_type: optional(
      oneOf("Property type", [
        "apartment",
        "villa",
        "row_house",
        "plot",
        "penthouse",
        "studio",
        "commercial",
        "office",
        "retail",
        "mixed_use",
      ])
    ),
    property_status: optional(
      oneOf("Property status", ["new_launch", "under_construction", "ready_to_move", "completed"])
    ),
    possession_date: optionalIsoDate("Possession date"),
    rera_number: optionalText("RERA number", { max: 80 }),
    towers: count("Towers"),
    floors: count("Floors"),
    total_units: count("Total units"),
    description: optionalText("Description", { max: LIMITS.description, multiline: true }),
    price_min: amount("Minimum price"),
    price_max: amount("Maximum price"),
    price_per_sqft: amount("Price per sq ft"),
    price_mode: optional(oneOf("Price display", ["show", "on_request", "hide"])),
    latitude: optional(z.number().finite().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90")),
    longitude: optional(z.number().finite().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180")),
    nearby_places: z.array(propertyNearbyPlaceSchema).max(50, "At most 50 nearby places").nullable(),
    amenities: z
      .array(text("Amenity", { max: 80 }))
      .max(100, "At most 100 amenities")
      .nullable(),
    specifications: z.array(propertySpecificationSchema).max(100, "At most 100 specifications").nullable(),
    video_url: optional(httpsUrl("Video link")),
    brochure_path: optional(storagePath("Brochure")),
    brochure_file_name: optional(fileName("Brochure file name")),
    enquiry_phone: optionalPhone("Enquiry phone"),
    whatsapp_number: optionalPhone("WhatsApp number"),
    enquiry_email: optionalEmail("Enquiry email"),
    hidden_fields: z
      .array(z.string().refine((key) => HIDEABLE_KEYS.has(key), { message: "Unknown hidden field" }))
      .max(200)
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.price_min != null && value.price_max != null && value.price_min > value.price_max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price_max"],
        message: "Maximum price must be at least the minimum price",
      });
    }
    if ((value.latitude == null) !== (value.longitude == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Enter both latitude and longitude, or neither",
      });
    }
  });

export const propertyUnitSchema = z
  .object({
    id: optional(uuid("Unit")),
    configuration: optionalText("Configuration", { max: 60 }),
    carpet_area_sqft: area("Carpet area"),
    built_up_area_sqft: area("Built-up area"),
    price: amount("Unit price"),
    units_available: count("Units available"),
    floor_plan_path: optional(storagePath("Floor plan")),
  })
  .strict();

export const savePropertyDetailsSchema = z
  .object({
    project_id: uuid("Project"),
    details: propertyDetailsSchema,
    units: z.array(propertyUnitSchema).max(50, "At most 50 unit types"),
  })
  .strict();

export type SavePropertyDetailsInput = z.input<typeof savePropertyDetailsSchema>;
