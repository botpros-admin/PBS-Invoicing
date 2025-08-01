import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming cors.ts exists or will be created
import { createAdminClient } from '../_shared/supabase-client.ts';
import {
  COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../_shared/cookie-options.ts';
import { setCookie } from 'https://deno.land/std@0.177.0/http/cookie.ts';

console.log('Auth Callback function up!');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  // TODO: Get the redirect destination from state parameter or default
  const redirectTo = Deno.env.get('SITE_URL') || url.origin || 'http://localhost:5174'; // Default to common Vite port

  if (!code) {
    console.error('No code found in callback request');
    return new Response(JSON.stringify({ error: 'Authorization code missing.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error.message);
      // Redirect to an error page on the frontend?
      const errorRedirectUrl = new URL('/login?error=auth_callback_failed', redirectTo);
      errorRedirectUrl.searchParams.set('error_description', error.message);
      return Response.redirect(errorRedirectUrl.toString(), 303);
      // Or return an error response:
      // return new Response(JSON.stringify({ error: 'Failed to exchange code.', details: error.message }), {
      //   status: 500,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    if (!data.session) {
      console.error('No session received after code exchange');
      const errorRedirectUrl = new URL('/login?error=auth_callback_no_session', redirectTo);
      return Response.redirect(errorRedirectUrl.toString(), 303);
      // Or return an error response:
      // return new Response(JSON.stringify({ error: 'Failed to get session.' }), {
      //   status: 500,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    console.log('Session successfully exchanged.');

    // Create response and set cookies
    const response = new Response(null, {
      status: 303, // Use 303 See Other for redirection after code exchange
      headers: {
        ...corsHeaders,
        Location: redirectTo + '/dashboard', // Redirect to dashboard after successful login
      },
    });

    // Set access token cookie
    setCookie(response.headers, {
      name: ACCESS_TOKEN_COOKIE_NAME,
      value: data.session.access_token,
      ...COOKIE_OPTIONS,
    });

    // Set refresh token cookie
    setCookie(response.headers, {
      name: REFRESH_TOKEN_COOKIE_NAME,
      value: data.session.refresh_token,
      ...COOKIE_OPTIONS,
    });

    console.log('Cookies set, redirecting to:', response.headers.get('Location'));
    return response;

  } catch (err) {
    console.error('Unexpected error in auth-callback:', err);
    const errorRedirectUrl = new URL('/login?error=auth_callback_server_error', redirectTo);
    errorRedirectUrl.searchParams.set('error_description', err.message || 'Unknown server error');
    return Response.redirect(errorRedirectUrl.toString(), 303);
    // Or return an error response:
    // return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
    //   status: 500,
    //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    // });
  }
});
