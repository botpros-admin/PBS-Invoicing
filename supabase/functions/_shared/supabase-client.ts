import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// Memoize the client so it's only created once per function invocation
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client configured for admin operations
 * (using the service role key). Use this for operations
 * that require elevated privileges, like exchanging auth codes.
 */
export function createAdminClient(): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing environment variable SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Prevent client from persisting session locally in the function environment
      persistSession: false,
      // Automatically refresh tokens is not needed for admin client
      autoRefreshToken: false,
    },
  });

  return supabaseAdminClient;
}

/**
 * Creates a Supabase client configured for user-specific operations,
 * respecting RLS policies based on the provided JWT.
 * @param authHeader The 'Authorization: Bearer <token>' header value.
 */
export function createUserClient(authHeader?: string | null): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing environment variable SUPABASE_URL');
  }
  if (!anonKey) {
    throw new Error('Missing environment variable SUPABASE_ANON_KEY');
  }

  // Use different client instances for user requests to avoid context leakage
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Pass the Authorization header to ensure RLS is applied
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}
