// Test database connection and basic operations
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  try {
    // Test 1: Check organizations table
    console.log('1. Testing organizations table...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);
    
    if (orgError) {
      console.error('   ❌ Error:', orgError.message);
    } else {
      console.log(`   ✅ Found ${orgs?.length || 0} organizations`);
    }

    // Test 2: Check clients table
    console.log('\n2. Testing clients table...');
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientError) {
      console.error('   ❌ Error:', clientError.message);
    } else {
      console.log(`   ✅ Found ${clients?.length || 0} clients`);
    }

    // Test 3: Check invoices table
    console.log('\n3. Testing invoices table...');
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .limit(5);
    
    if (invoiceError) {
      console.error('   ❌ Error:', invoiceError.message);
    } else {
      console.log(`   ✅ Found ${invoices?.length || 0} invoices`);
    }

    // Test 4: Check CPT codes table
    console.log('\n4. Testing cpt_codes table...');
    const { data: cptCodes, error: cptError } = await supabase
      .from('cpt_codes')
      .select('*')
      .limit(5);
    
    if (cptError) {
      console.error('   ❌ Error:', cptError.message);
    } else {
      console.log(`   ✅ Found ${cptCodes?.length || 0} CPT codes`);
    }

    // Test 5: Check user_profiles table
    console.log('\n5. Testing user_profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profileError) {
      console.error('   ❌ Error:', profileError.message);
    } else {
      console.log(`   ✅ Found ${profiles?.length || 0} user profiles`);
    }

    console.log('\n✅ Database connection test complete!');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

testConnection();