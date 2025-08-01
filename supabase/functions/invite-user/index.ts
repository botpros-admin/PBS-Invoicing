import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log('Invite User Function Initializing');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received request:', req.method);
    const { email, role } = await req.json();
    console.log(`Attempting to invite user: ${email} with role: ${role}`);

    if (!email || !role) {
      console.error('Missing email or role in request body');
      return new Response(JSON.stringify({ error: 'Email and role are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role key
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Edge Function settings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('Supabase admin client created');

    // Define a simple placeholder redirection URL for testing
    const redirectTo = 'http://localhost:5173/welcome'; // Using a fixed value for now
    console.log(`Using fixed redirectTo: ${redirectTo}`);

    // Invite the user
    console.log('Attempting supabaseAdmin.auth.admin.inviteUserByEmail...');
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo,
      data: { role: role } // Include role in user metadata
    });
    console.log('inviteUserByEmail call completed.');

    if (error) {
      console.error('Error inviting user:', error.message);
      // Check for specific common errors
      if (error.message.includes('User already registered')) {
         return new Response(JSON.stringify({ error: 'User already exists with this email.' }), {
           status: 409, // Conflict
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }
      // Generic internal server error for other issues
      return new Response(JSON.stringify({ error: `Failed to invite user: ${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User invited successfully:', data);
    return new Response(JSON.stringify({ message: 'Invitation sent successfully', user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in Edge Function:', error);
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log('Invite User Function Ready');
