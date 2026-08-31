/** Routes accessible when userLacksRoleAccess (no roll or empty permissions). */
export const ROLE_EXEMPT_PATHS = ["/forbidden", "/my-account", "/settings"];

export const ROLE_EXEMPT_PATH_SET = new Set(ROLE_EXEMPT_PATHS);
