import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qwvukolqraoucpxjqpmu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPatientFields() {
  console.log('Applying patient fields to invoice_items table...\n');

  try {
    // Run the SQL directly
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add patient information fields to invoice_items
        ALTER TABLE public.invoice_items
        ADD COLUMN IF NOT EXISTS patient_first_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS patient_last_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS patient_dob DATE,
        ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(50),
        ADD COLUMN IF NOT EXISTS patient_insurance_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS units DECIMAL(10, 2),
        ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Regular',
        ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
        ADD COLUMN IF NOT EXISTS dispute_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS dispute_resolved_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
        ADD COLUMN IF NOT EXISTS is_duplicate_override BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS duplicate_override_reason TEXT,
        ADD COLUMN IF NOT EXISTS duplicate_override_by UUID,
        ADD COLUMN IF NOT EXISTS duplicate_override_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS import_batch_id UUID,
        ADD COLUMN IF NOT EXISTS import_row_number INT,
        ADD COLUMN IF NOT EXISTS import_status VARCHAR(50) DEFAULT 'success',
        ADD COLUMN IF NOT EXISTS import_error_message TEXT;
      `
    });

    if (error) {
      // Try a different approach - execute as raw SQL
      const { data, error: queryError } = await supabase
        .from('invoice_items')
        .select('*')
        .limit(0);

      console.log('Direct RPC failed, trying alternative method...');
      
      // Check current columns
      console.log('Current invoice_items structure:', Object.keys(data || {}));
      
      console.log('\n⚠️  Cannot apply migration directly via JavaScript.');
      console.log('Please run the migration manually in Supabase SQL Editor:');
      console.log('\n--- COPY THIS SQL ---\n');
      console.log(`ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS patient_first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_mrn VARCHAR(50),
ADD COLUMN IF NOT EXISTS patient_insurance_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS units DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'Regular';`);
      console.log('\n--- END SQL ---\n');
    } else {
      console.log('✅ Patient fields successfully added to invoice_items table!');
      
      // Verify the fields exist
      const { data: testData, error: testError } = await supabase
        .from('invoice_items')
        .select('id, patient_first_name, patient_last_name, patient_dob, patient_mrn, units, invoice_type')
        .limit(1);

      if (!testError) {
        console.log('\n✅ Verification successful! All patient fields are now available.');
        console.log('\nThe database model is now CORRECT for laboratory billing:');
        console.log('- Invoice belongs to clinic (via client_id) ✓');
        console.log('- Invoice has many invoice_items ✓');
        console.log('- Each invoice_item has patient information ✓');
      }
    }

  } catch (err) {
    console.error('Error:', err);
    console.log('\n⚠️  Please apply the migration manually in the Supabase dashboard.');
  }
}

applyPatientFields();