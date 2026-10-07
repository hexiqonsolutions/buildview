import { z } from "zod";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Thrown by `parseOrThrow` for actions whose contract is to throw on bad input. */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

function describeIssue(issue: z.ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    return `Unexpected field${issue.keys.length === 1 ? "" : "s"}: ${issue.keys.join(", ")}`;
  }
  const path = issue.path.join(".");
  // Zod's built-in messages don't name the field; custom ones from primitives do.
  const generic = /^(Required|Invalid input|Expected .+, received .+|Invalid enum value.*|String must contain .*|Number must be .*|Invalid (uuid|email|url|date|datetime))$/i;
  return path && generic.test(issue.message) ? `${path}: ${issue.message}` : issue.message;
}

/** Validates `input` against `schema`; returns the parsed data or the first error message. */
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  const issue = result.error.issues[0];
  return { success: false, error: issue ? describeIssue(issue) : "Invalid input" };
}

/** Like `validate`, but throws `InvalidInputError` on failure. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = validate(schema, input);
  if (!result.success) throw new InvalidInputError(result.error);
  return result.data;
}

/**
 * Converts FormData to a plain object for strict schema validation.
 * - React/Next internal fields ($ACTION_*) are ignored.
 * - A field may only appear once unless listed in `arrays`, in which case it
 *   is always returned as an array.
 * Pair with a `.strict()` schema so unexpected fields are rejected.
 */
export function formDataToObject(
  formData: FormData,
  { arrays = [] }: { arrays?: readonly string[] } = {}
): ValidationResult<Record<string, FormDataEntryValue | FormDataEntryValue[]>> {
  const output: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key);
    if (arrays.includes(key)) {
      output[key] = values;
    } else if (values.length > 1) {
      return { success: false, error: `Field "${key}" was submitted more than once` };
    } else {
      output[key] = values[0];
    }
  }

  for (const key of arrays) {
    if (!(key in output)) output[key] = [];
  }

  return { success: true, data: output };
}

/** `formDataToObject` + `validate` in one step. */
export function validateFormData<S extends z.ZodTypeAny>(
  schema: S,
  formData: FormData,
  options?: { arrays?: readonly string[] }
): ValidationResult<z.output<S>> {
  if (!(formData instanceof FormData)) {
    return { success: false, error: "Invalid form submission" };
  }
  const object = formDataToObject(formData, options);
  if (!object.success) return object;
  return validate(schema, object.data);
}
