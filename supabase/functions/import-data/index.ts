// supabase/functions/import-data/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { parse } from 'https://deno.land/std@0.168.0/encoding/csv.ts'

// Function to check for duplicates
async function checkForDuplicate(supabase: SupabaseClient, row: any) {
  if (!row.accession_number || !row.cpt_code) {
    return false; // Cannot check for duplicates without these fields
  }

  const { data, error } = await supabase
    .from('invoices') // Assuming 'invoices' is the table to check
    .select('id')
    .eq('accession_number', row.accession_number)
    .eq('cpt_code', row.cpt_code)
    .limit(1);

  if (error) {
    console.error('Error checking for duplicates:', error);
    // Decide how to handle db errors; for now, we'll assume it's not a duplicate
    return false;
  }

  return data && data.length > 0;
}


serve(async (req) => {
  try {
    // Create a Supabase client with the user's authorization
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { file_content, commit, file_type } = await req.json();
    let data;

    if (file_type === 'text/csv') {
      data = await parse(file_content, {
        skipFirstRow: true,
        // Assuming the columns are in a specific order.
        // A more robust solution would be to read headers.
        columns: [
          'invoice_number', 'client', 'patient', 'accession_number', 
          'cpt_code', 'description', 'date_of_service', 'amount'
        ],
      });
    } else {
      data = JSON.parse(file_content);
    }


    const validatedData = await Promise.all(data.map(async (row: any, index: number) => {
      const errors = [];
      if (!row.client) {
        errors.push('Missing client information');
      }
      if (!row.cpt_code) {
        errors.push('Missing CPT code');
      }
      // Add more validation logic here...

      const isDuplicate = await checkForDuplicate(supabase, row);
      if (isDuplicate) {
        return {
          id: index + 1,
          status: 'duplicate',
          errors: ['Duplicate record found.'],
          data: row
        };
      }

      return { 
        id: index + 1,
        status: errors.length > 0 ? 'error' : 'valid',
        errors,
        data: row 
      };
    }));

    if (commit) {
      const recordsToInsert = validatedData
        .filter(item => item.status === 'valid')
        .map(item => item.data);

      if (recordsToInsert.length > 0) {
        const { error } = await supabase.from('invoices').insert(recordsToInsert);
        if (error) {
          throw new Error(`Error committing records: ${error.message}`);
        }
      }
    }

    return new Response(JSON.stringify({ data: validatedData }), {
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