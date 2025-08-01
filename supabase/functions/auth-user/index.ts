import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { getCookies } from 'https://deno.land/std@0.177.0/http/cookie.ts';
import { ACCESS_TOKEN_COOKIE_NAME } from '../_shared/cookie-options.ts';

console.log('Auth User function up!');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cookies = getCookies(req.headers);
    const accessToken = cookies[ACCESS_TOKEN_COOKIE_NAME];

    if (!accessToken) {
      console.log('No access token cookie found.');
      return new Response(JSON.stringify({ user: null, error: 'No session cookie found.' }), {
        status: 401, // Unauthorized
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's auth context
    const supabaseUserClient = createUserClient(`Bearer ${accessToken}`);

    // Fetch user data using the access token
    const { data: { user }, error } = await supabaseUserClient.auth.getUser();

    if (error) {
      console.error('Error fetching user:', error.message);
      // Potentially distinguish between invalid token and other errors
      return new Response(JSON.stringify({ user: null, error: 'Failed to fetch user.', details: error.message }), {
        status: 401, // Unauthorized or Internal Server Error depending on cause
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user) {
       console.log('No user found for the provided token.');
       return new Response(JSON.stringify({ user: null, error: 'No user found for session.' }), {
        status: 401, // Unauthorized
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User fetched successfully:', user.email);
    // Return only the user object, session details are handled by cookies
    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Unexpected error in auth-user:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
