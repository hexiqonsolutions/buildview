import { z } from "zod";
import { LIMITS, optionalPhone, personName, uuid } from "@/lib/validations/primitives";

export const updateProfileSchema = z
  .object({
    full_name: personName("Full name", { min: 1, max: 120 }),
    phone: optionalPhone("Phone number"),
  })
  .strict();

const AVATAR_OBJECT_PATH = "storage/v1/object/public/avatars/";
const AVATAR_FILE_NAME = /^[A-Za-z0-9._-]{1,255}$/;

/** Public URL prefix of the avatars bucket, as built by supabase-js `getPublicUrl`. */
function avatarPublicUrlPrefix(supabaseUrl: string): string {
  const base = supabaseUrl.endsWith("/") ? supabaseUrl : `${supabaseUrl}/`;
  return new URL(AVATAR_OBJECT_PATH, base).href;
}

/**
 * Public avatar URL in this project's Supabase storage:
 * `<supabase>/storage/v1/object/public/avatars/<userId>/<file>`, no query or
 * fragment. Transforms to `{ url, userId }` so the caller can check ownership.
 */
export function avatarUrlSchema(supabaseUrl: string) {
  const prefix = avatarPublicUrlPrefix(supabaseUrl);
  const invalid = "Invalid photo URL.";
  const userIdSchema = uuid("Photo owner");

  return z
    .string({ required_error: invalid, invalid_type_error: invalid })
    .trim()
    .max(LIMITS.url, invalid)
    .refine((value) => value.startsWith(prefix), { message: invalid })
    .transform((value, ctx) => {
      const [userId, fileName, ...rest] = value.slice(prefix.length).split("/");
      if (
        rest.length > 0 ||
        !userIdSchema.safeParse(userId).success ||
        !fileName ||
        !AVATAR_FILE_NAME.test(fileName) ||
        /^\.{1,2}$/.test(fileName)
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalid });
        return z.NEVER;
      }
      return { url: value, userId: userId.toLowerCase() };
    });
}
