import { z } from "zod";
import {
  LIMITS,
  fileName,
  fileSize,
  int,
  mimeType,
  optional,
  optionalIsoDate,
  optionalText,
  optionalUuid,
  searchQuery,
  storagePath,
  text,
  uuid,
} from "@/lib/validations/primitives";

export const projectIdSchema = uuid("Project ID");
export const clientIdSchema = uuid("Client ID");
export const userIdSchema = uuid("User ID");
export const reportIdSchema = uuid("Report ID");
export const documentIdSchema = uuid("Document ID");
export const documentGroupIdSchema = uuid("Document group ID");

/**
 * Search text that is safe to interpolate into PostgREST filter strings:
 * letters, numbers, spaces and - ' . @ & only. Filter syntax such as , ( ) : *
 * and LIKE wildcards (% _) are rejected rather than escaped.
 */
const SAFE_SEARCH_PATTERN = /^[\p{L}\p{M}\p{N} .'@&-]+$/u;

export const globalSearchQuerySchema = searchQuery("Search").refine(
  (value) => value === "" || SAFE_SEARCH_PATTERN.test(value),
  { message: "Search may only contain letters, numbers, spaces and - ' . @ &" }
);

const ENTITY_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;

function entityType(label = "Entity type") {
  return text(label, {
    max: 50,
    pattern: ENTITY_TYPE_PATTERN,
    patternMessage: `${label} may only contain lowercase letters, numbers and _`,
  });
}

export const activityLogFiltersSchema = z
  .object({
    projectId: optionalUuid("Project ID"),
    userId: optionalUuid("User ID"),
    entityType: optional(entityType()),
    query: optionalText("Search", { max: LIMITS.searchQuery }),
    fromDate: optionalIsoDate("From date"),
    toDate: optionalIsoDate("To date"),
    limit: int("Limit", { min: 1, max: 500 }).optional(),
  })
  .strict();

const METADATA_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_METADATA_ENTRIES = 50;

const auditMetadataSchema = z
  .record(
    z.string().regex(METADATA_KEY_PATTERN, "Metadata keys must be lowercase snake_case"),
    z.union([
      text("Metadata value", { min: 0, max: LIMITS.description }),
      z.number().finite("Metadata value must be a finite number"),
      z.boolean(),
      z.null(),
    ])
  )
  .refine((value) => Object.keys(value).length <= MAX_METADATA_ENTRIES, {
    message: `Metadata may have at most ${MAX_METADATA_ENTRIES} entries`,
  });

export const auditEventSchema = z
  .object({
    action: text("Action", { max: 500 }),
    entityType: entityType(),
    entityId: optionalUuid("Entity ID"),
    projectId: optionalUuid("Project ID"),
    metadata: auditMetadataSchema.optional(),
    userId: optionalUuid("User ID"),
  })
  .strict();

const MAX_DOCUMENT_VERSION_BYTES = 100 * 1024 * 1024;

const UUID_PREFIX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

export const replaceDocumentVersionSchema = z
  .object({
    document_group_id: documentGroupIdSchema,
    storage_path: storagePath("Storage path").refine((value) => UUID_PREFIX_PATTERN.test(value), {
      message: "Storage path is outside the allowed folder",
    }),
    file_name: fileName("File name"),
    file_size: optional(fileSize("File size", { max: MAX_DOCUMENT_VERSION_BYTES })),
    mime_type: optional(mimeType("File type")),
    change_note: optionalText("Change note", { max: LIMITS.description, multiline: true }),
  })
  .strict();
