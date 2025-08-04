// supabase/functions/invite-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

serve(async (req) => {
  try {
    const { email, role, lab_id, clinic_id } = await req.json()

    // Create a Supabase client with the service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Invite the user
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: role,
        lab_id: lab_id,
        clinic_id: clinic_id
      }
    })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})