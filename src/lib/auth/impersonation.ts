/** Display name of the staff member impersonating a client; read by the portal banner. */
export const IMPERSONATOR_COOKIE = "bv_impersonator";

/** httpOnly: the super admin's refresh token, used to restore their session on "Return to admin". */
export const ADMIN_RESTORE_COOKIE = "bv_admin_restore";

export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60 * 8;
