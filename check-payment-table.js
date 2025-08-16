import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaymentTable() {
  console.log('Checking payments table structure...\n');
  
  // Try to fetch a payment with no filters to see the structure
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Sample payment record:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\nColumns found:', Object.keys(data[0]));
  } else {
    console.log('No payments found in table');
    
    // Try to list all payments without filters
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('*');
      
    if (allError) {
      console.error('Error fetching all:', allError);
    } else {
      console.log('Total payments in table:', allPayments?.length || 0);
    }
  }
}

checkPaymentTable().catch(console.error);