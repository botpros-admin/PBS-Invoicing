// Common options for setting secure HttpOnly cookies
export const COOKIE_OPTIONS = {
  path: '/',
  secure: true, // Only send cookie over HTTPS
  httpOnly: true, // Prevent client-side JS access
  sameSite: 'Lax', // Protect against CSRF attacks
  maxAge: 60 * 60 * 24 * 30, // 30 days (adjust as needed, Supabase manages actual token expiry)
} as const;

// Options for clearing a cookie
export const CLEAR_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: -1, // Expire immediately
} as const;

export const ACCESS_TOKEN_COOKIE_NAME = 'sb-access-token';
export const REFRESH_TOKEN_COOKIE_NAME = 'sb-refresh-token';
