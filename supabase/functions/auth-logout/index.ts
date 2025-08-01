import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  CLEAR_COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../_shared/cookie-options.ts';
import { setCookie } from 'https://deno.land/std@0.177.0/http/cookie.ts';

console.log('Auth Logout function up!');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST method should be used for logout for security reasons (prevents CSRF via GET)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Logout request received. Clearing cookies.');

    // Create response and clear cookies by setting expiry to the past
    const response = new Response(JSON.stringify({ message: 'Logged out' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

    // Clear access token cookie
    setCookie(response.headers, {
      name: ACCESS_TOKEN_COOKIE_NAME,
      value: '', // Set value to empty
      ...CLEAR_COOKIE_OPTIONS,
    });

    // Clear refresh token cookie
    setCookie(response.headers, {
      name: REFRESH_TOKEN_COOKIE_NAME,
      value: '', // Set value to empty
      ...CLEAR_COOKIE_OPTIONS,
    });

    return response;

  } catch (err) {
    console.error('Unexpected error in auth-logout:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
