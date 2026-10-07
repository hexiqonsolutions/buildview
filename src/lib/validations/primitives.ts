import { z } from "zod";

/**
 * Strict building blocks for input schemas. Every value is checked for type,
 * length and format and rejected when it doesn't match — nothing is silently
 * stripped or escaped. Leading/trailing whitespace is trimmed before checks.
 *
 * Use these in every server action / route handler schema and wrap object
 * schemas in `.strict()` so unknown keys are rejected too.
 */

export const LIMITS = {
  shortText: 120,
  title: 200,
  name: 100,
  email: 254,
  phone: 20,
  url: 2048,
  description: 5000,
  longText: 20000,
  fileName: 255,
  mimeType: 127,
  storagePath: 1024,
  searchQuery: 100,
} as const;

// C0 control characters and DEL; multiline text may still contain \t \n \r.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_CHARS_SINGLE_LINE = /[\u0000-\u001F\u007F]/;

interface TextOptions {
  min?: number;
  max: number;
  multiline?: boolean;
  /** Optional format check applied after length checks. */
  pattern?: RegExp;
  patternMessage?: string;
}

/** Required trimmed string with length bounds and no control characters. */
export function text(label: string, options: TextOptions) {
  const { min = 1, max, multiline = false, pattern, patternMessage } = options;
  return z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be text`,
    })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .superRefine((value, ctx) => {
      if ((multiline ? CONTROL_CHARS : CONTROL_CHARS_SINGLE_LINE).test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} contains invalid characters` });
      } else if (pattern && !pattern.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: patternMessage ?? `${label} has an invalid format`,
        });
      }
    });
}

/**
 * Optional text: undefined, null or an empty/whitespace string become `null`;
 * anything else must satisfy `text()`.
 */
export function optionalText(label: string, options: Omit<TextOptions, "min"> & { min?: number }) {
  return z.preprocess(
    (value) => (value === undefined || value === null || (typeof value === "string" && value.trim() === "") ? null : value),
    text(label, options).nullable()
  );
}

/** Wraps any schema so undefined / null / "" become `null`. */
export function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? null : value),
    schema.nullable()
  );
}

export function uuid(label = "ID") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is invalid` })
    .uuid(`${label} is invalid`);
}

export function optionalUuid(label = "ID") {
  return optional(uuid(label));
}

export function uuidList(label: string, { min = 0, max = 100 }: { min?: number; max?: number } = {}) {
  return z
    .array(uuid(label), { invalid_type_error: `${label} must be a list` })
    .min(min, `Select at least ${min} ${label.toLowerCase()}`)
    .max(max, `At most ${max} ${label.toLowerCase()} allowed`)
    .refine((ids) => new Set(ids).size === ids.length, { message: `${label} contains duplicates` });
}

export function email(label = "Email") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .toLowerCase()
    .max(LIMITS.email, `${label} must be at most ${LIMITS.email} characters`)
    .email("Please enter a valid email address");
}

export function optionalEmail(label = "Email") {
  return optional(email(label));
}

/** Person or organisation display name: letters, digits, spaces and . , ' & ( ) - */
export function personName(label = "Name", { min = 2, max = LIMITS.name }: { min?: number; max?: number } = {}) {
  return text(label, {
    min,
    max,
    pattern: /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,'&()-]*$/u,
    patternMessage: `${label} may only contain letters, numbers, spaces and . , ' & ( ) -`,
  });
}

export function phone(label = "Phone number") {
  return text(label, {
    min: 7,
    max: LIMITS.phone,
    pattern: /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/,
    patternMessage: `${label} may only contain digits, spaces, ( ) - and a leading +`,
  });
}

export function optionalPhone(label = "Phone number") {
  return optional(phone(label));
}

/** Calendar date in YYYY-MM-DD form that exists (e.g. rejects 2026-02-30). */
export function isoDate(label = "Date") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a date` })
    .trim()
    .date(`${label} must be a valid date (YYYY-MM-DD)`);
}

export function optionalIsoDate(label = "Date") {
  return optional(isoDate(label));
}

/** ISO 8601 timestamp, e.g. 2026-10-06T09:30:00.000Z or with an offset. */
export function isoDateTime(label = "Date and time") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a timestamp` })
    .trim()
    .datetime({ offset: true, message: `${label} must be a valid ISO timestamp` });
}

export function httpsUrl(label = "URL") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .max(LIMITS.url, `${label} must be at most ${LIMITS.url} characters`)
    .url(`${label} must be a valid URL`)
    .refine((value) => value.startsWith("https://"), { message: `${label} must start with https://` });
}

export function optionalHttpsUrl(label = "URL") {
  return optional(httpsUrl(label));
}

export function int(label: string, { min, max }: { min: number; max: number }) {
  return z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);
}

/** Non-negative amount with at most 2 decimal places. */
export function money(label = "Amount", { max = 1_000_000_000 }: { max?: number } = {}) {
  return z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .finite(`${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} is too large`)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
      message: `${label} can have at most 2 decimal places`,
    });
}

/** Number arriving as a FormData string ("12", "12.5"); rejects anything else. */
export function numericString(label: string) {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, `${label} must be a number`)
    .transform(Number);
}

/** Boolean arriving from a form ("true"/"false"/"on"/"1"/"0") or a real boolean. */
export function formBoolean(label = "Value") {
  return z.union([
    z.boolean(),
    z
      .enum(["true", "false", "on", "off", "1", "0"], {
        errorMap: () => ({ message: `${label} must be true or false` }),
      })
      .transform((value) => value === "true" || value === "on" || value === "1"),
  ]);
}

export function oneOf<const T extends readonly [string, ...string[]]>(label: string, values: T) {
  return z.enum(values, {
    errorMap: () => ({ message: `${label} must be one of: ${values.join(", ")}` }),
  });
}

/** Bare file name (no directories), e.g. "Floor plan v2.pdf". */
export function fileName(label = "File name") {
  return text(label, {
    max: LIMITS.fileName,
    pattern: /^(?!\.{1,2}$)[^/\\:*?"<>|]+$/,
    patternMessage: `${label} must not contain / \\ : * ? " < > |`,
  });
}

export function mimeType(label = "File type") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .toLowerCase()
    .max(LIMITS.mimeType, `${label} is too long`)
    .regex(/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/, `${label} is invalid`);
}

export function fileSize(label = "File size", { max }: { max: number }) {
  return z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be greater than 0`)
    .max(max, `File must be at most ${Math.round(max / 1024 / 1024)} MB`);
}

/**
 * Relative storage object path: segments of [A-Za-z0-9 _.()-] separated by
 * "/", no leading slash, no "." / ".." segments. Optionally must start with
 * `prefix` (e.g. "<projectId>/").
 */
export function storagePath(label = "Storage path", { prefix }: { prefix?: string } = {}) {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .max(LIMITS.storagePath, `${label} is too long`)
    .regex(/^(?!\/)(?:(?!\.{1,2}(?:\/|$))[A-Za-z0-9 _.()+-]+)(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9 _.()+-]+)*$/, `${label} is invalid`)
    .refine((value) => !prefix || value.startsWith(prefix), { message: `${label} is outside the allowed folder` });
}

export function searchQuery(label = "Search") {
  return z
    .string({ invalid_type_error: `${label} must be text` })
    .trim()
    .max(LIMITS.searchQuery, `${label} must be at most ${LIMITS.searchQuery} characters`)
    .refine((value) => !CONTROL_CHARS_SINGLE_LINE.test(value), { message: `${label} contains invalid characters` });
}

/** Page size / result limit. */
export function limit(label = "Limit", { max = 100 }: { max?: number } = {}) {
  return int(label, { min: 1, max });
}

interface FileRules {
  maxBytes: number;
  /** Allowed MIME types; omit to allow any type. */
  mimeTypes?: readonly string[];
  /** Blocked lowercase extensions including the dot, e.g. ".exe". */
  blockedExtensions?: readonly string[];
}

/** A `File` from FormData with size, type and name checks. */
export function file(label: string, rules: FileRules) {
  // Duck-typed: FormData files may come from a different File implementation than globalThis.File.
  return z
    .custom<File>(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as File).arrayBuffer === "function" &&
        typeof (value as File).size === "number" &&
        typeof (value as File).name === "string" &&
        typeof (value as File).type === "string",
      { message: `${label} must be a file` }
    )
    .refine((value) => value.size > 0, { message: `${label} is empty` })
    .refine((value) => value.size <= rules.maxBytes, {
      message: `${label} must be at most ${Math.round(rules.maxBytes / 1024 / 1024)} MB`,
    })
    .refine((value) => value.name.length > 0 && value.name.length <= LIMITS.fileName && !CONTROL_CHARS_SINGLE_LINE.test(value.name), {
      message: `${label} has an invalid file name`,
    })
    .refine((value) => !rules.mimeTypes || rules.mimeTypes.includes(value.type), {
      message: `${label} has an unsupported file type`,
    })
    .refine(
      (value) => {
        if (!rules.blockedExtensions) return true;
        const dot = value.name.lastIndexOf(".");
        return dot === -1 || !rules.blockedExtensions.includes(value.name.slice(dot).toLowerCase());
      },
      { message: `${label} has a blocked file type` }
    );
}

export function fileList(label: string, rules: FileRules & { min?: number; maxFiles: number }) {
  return z
    .array(file(label, rules))
    .min(rules.min ?? 0, `Select at least ${rules.min ?? 0} file(s)`)
    .max(rules.maxFiles, `You can upload up to ${rules.maxFiles} files at once`);
}
