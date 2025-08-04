// supabase/functions/process-payment/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

serve(async (req) => {
  try {
    const { invoice_number, payment_token } = await req.json()

    // In a real application, you would use the Stripe SDK to process the payment
    // For now, we'll just simulate a successful payment

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update the invoice to mark it as paid
    // This is a simplified example. A real implementation would handle partial payments, etc.
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', amount_paid: supabase.sql('total') })
      .eq('invoice_number', invoice_number)

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ success: true }), {
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
