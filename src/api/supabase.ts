/**
 * STUB: Supabase Client
 *
 * This is a stub implementation to prevent import errors while the application
 * transitions to using the Cloudflare Workers API directly.
 *
 * The actual authentication now uses /api/auth/* endpoints via the Workers API.
 */

// Create a comprehensive stub to handle all Supabase methods
const noop = () => {};
const noopAsync = async () => ({ data: null, error: null });
const noopChannel = {
  on: () => noopChannel,
  subscribe: () => noopChannel,
  unsubscribe: noop,
};

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase is disabled. Use Workers API instead.') }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: noop } } }),
    refreshSession: async () => ({ data: { session: null }, error: null }),
    mfa: {
      listFactors: async () => ({ data: null, error: new Error('MFA not supported') }),
    },
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error('Supabase is disabled') }),
      }),
    }),
    insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Supabase is disabled') }) }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('Supabase is disabled') }) }) }) }),
    delete: () => ({ eq: async () => ({ data: null, error: new Error('Supabase is disabled') }) }),
  }),
  rpc: async () => ({ data: null, error: new Error('Supabase is disabled') }),
  // Realtime stub
  channel: () => noopChannel,
  removeChannel: noop,
  removeAllChannels: noop,
  getChannels: () => [],
};

// Re-export for compatibility
export default supabase;

// Log a warning when this stub is imported
console.warn('[STUB] Supabase client is disabled. Using Cloudflare Workers API instead.');
