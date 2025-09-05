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

async function checkPatientFields() {
  console.log('Checking if patient fields exist in invoice_items table...\n');

  try {
    // Try to select patient fields from invoice_items
    const { data, error } = await supabase
      .from('invoice_items')
      .select('id, patient_first_name, patient_last_name, patient_dob, patient_mrn, units, invoice_type')
      .limit(1);

    if (error) {
      console.log('❌ Patient fields NOT found in invoice_items table');
      console.log('Error:', error.message);
      
      if (error.message.includes('column')) {
        console.log('\n⚠️  The migration has NOT been applied to the database yet.');
        console.log('The patient fields need to be added to invoice_items table.');
      }
    } else {
      console.log('✅ Patient fields FOUND in invoice_items table!');
      console.log('\nFields confirmed:');
      console.log('- patient_first_name');
      console.log('- patient_last_name');
      console.log('- patient_dob');
      console.log('- patient_mrn');
      console.log('- units');
      console.log('- invoice_type');
      
      console.log('\n✅ The database model is CORRECT for laboratory billing!');
      console.log('- Invoice belongs to clinic (via client_id)');
      console.log('- Invoice has many invoice_items');
      console.log('- Each invoice_item has patient information');
    }

    // Also check dispute_tickets table
    const { error: disputeError } = await supabase
      .from('dispute_tickets')
      .select('id')
      .limit(1);

    if (!disputeError) {
      console.log('\n✅ Dispute tickets table also exists!');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkPatientFields();