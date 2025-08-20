import { createBrowserClient, type CookieOptions } from '@supabase/ssr';
import { Database } from '../types/supabase'; // Use relative path

// Environment variables (ensure they are loaded correctly, e.g., via Vite's define)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}

// Function to get the base URL for Edge Functions
// In development, this might point to the local Supabase CLI URL (e.g., http://localhost:54321)
// In production, it points to the deployed function URL (e.g., https://<project_ref>.supabase.co)
// We'll use the main Supabase URL as a base for now, assuming standard function routing.
const functionsUrl = supabaseUrl; // Adjust if your function URLs are different

// Create a singleton Supabase client for the browser
// Use createBrowserClient for client-side applications with cookie-based auth
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Use PKCE flow for better security
      flowType: 'pkce',
      // Auto refresh token is handled by the cookie mechanism
      // autoRefreshToken: true, // Default is true, keep it
      // persistSession: true, // Default is true, keep it
      // detectSessionInUrl: true, // Default is true, keep it for handling callbacks if needed client-side (though server should handle main callback)
    },
    // Custom cookie handling using fetch to interact with our Edge Functions
    cookies: {
      get(key: string): string | null | undefined {
        // Note: This simple implementation assumes cookies are accessible via document.cookie.
        // For HttpOnly cookies, the browser client CANNOT read them directly.
        // The primary way to get user state will be calling the /auth-user function.
        // This 'get' might be used internally by the library for non-HttpOnly cookies if any.
        if (typeof document === 'undefined') {
          return undefined; // Not in a browser environment
        }
        const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
        return match ? match[2] : null;
      },
      set(key: string, value: string, options: CookieOptions): void {
        // The browser client itself doesn't set the HttpOnly cookies.
        // This happens in the auth-callback Edge Function.
        // This 'set' might be used for other non-HttpOnly cookies if needed by the library.
        if (typeof document === 'undefined') {
          return; // Not in a browser environment
        }
        let cookieString = `${key}=${value}; path=${options.path || '/'}`;
        if (options.maxAge) {
          cookieString += `; max-age=${options.maxAge}`;
        }
        if (options.domain) {
          cookieString += `; domain=${options.domain}`;
        }
        if (options.sameSite) {
          cookieString += `; samesite=${options.sameSite}`;
        }
        if (options.secure) {
          cookieString += `; secure`;
        }
        // Note: Cannot set HttpOnly via document.cookie
        document.cookie = cookieString;
      },
      remove(key: string, options: CookieOptions): void {
        // Logout should primarily be handled by calling the /auth-logout Edge Function.
        // This 'remove' acts as a fallback or for non-HttpOnly cookies.
        if (typeof document === 'undefined') {
          return; // Not in a browser environment
        }
        let cookieString = `${key}=; path=${options.path || '/'}; max-age=-1`; // Expire immediately
        if (options.domain) {
          cookieString += `; domain=${options.domain}`;
        }
        // Note: Cannot remove HttpOnly via document.cookie
        document.cookie = cookieString;

        // Additionally, trigger the logout function to ensure HttpOnly cookies are cleared server-side
        fetch(`${functionsUrl}/functions/v1/auth-logout`, { method: 'POST' })
          .then(response => {
            if (!response.ok) {
              response.json().then(body => 
            } else {
            }
          })
          .catch(err => 
      },
    },
  }
);

// --- Debugging & Utility Functions ---

// Function to log authentication debug information
export const logAuthDebug = async () => {
  console.groupCollapsed('[AUTH DEBUG]');
  try {
    const session = await supabase.auth.getSession();
    const user = await supabase.auth.getUser();
    // Note: Cannot directly read HttpOnly cookies here
  } catch (error) {
  }
};

// Initial log on load
// logAuthDebug();

// Log state changes
// supabase.auth.onAuthStateChange((event, session) => {
//   
//   logAuthDebug();
// });
