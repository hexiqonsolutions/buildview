import { z } from "zod";
import { email, personName } from "@/lib/validations/primitives";

/** Supabase hashes passwords with bcrypt, which only uses the first 72 bytes. */
const PASSWORD_MAX_BYTES = 72;

function newPassword(label = "Password") {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .min(8, `${label} must be at least 8 characters`)
    .regex(/[A-Za-z]/, `${label} must contain at least one letter`)
    .regex(/[0-9]/, `${label} must contain at least one number`)
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
      message: `${label} must be at most ${PASSWORD_MAX_BYTES} characters`,
    })
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), {
      message: `${label} contains invalid characters`,
    });
}

/**
 * Same-site path to return to after auth, e.g. "/dashboard/projects?tab=docs".
 * Rejects absolute URLs, protocol-relative "//host" and "/\host" forms.
 */
const redirectPathSchema = z
  .string({ invalid_type_error: "Redirect must be a path" })
  .max(512, "Redirect path is too long")
  .regex(
    /^\/(?![/\\])[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/,
    "Redirect must be a path on this site"
  );

export const loginSchema = z
  .object({
    email: email(),
    // Existing accounts may predate the current password policy, so only bound it here.
    password: z
      .string({ required_error: "Password is required", invalid_type_error: "Password must be text" })
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be at most 128 characters"),
    redirect: redirectPathSchema.optional(),
  })
  .strict();

export const registerSchema = z
  .object({
    fullName: personName("Full name"),
    email: email(),
    password: newPassword(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: email(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    password: newPassword(),
    confirmPassword: z
      .string({ required_error: "Please confirm your password", invalid_type_error: "Password must be text" })
      .max(128, "Password must be at most 128 characters"),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const googleSignInSchema = z
  .object({
    redirect: redirectPathSchema.optional(),
  })
  .strict();

/**
 * Query string of /auth/callback (Supabase PKCE code + our return path).
 * Not strict: Supabase appends its own params (type, error, error_description).
 */
export const authCallbackSchema = z.object({
  code: z
    .string()
    .min(8)
    .max(512)
    .regex(/^[A-Za-z0-9._~-]+$/),
  next: redirectPathSchema.optional(),
});
