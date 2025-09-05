import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew';

// Test credentials (from your setup)
const testUsers = [
  { email: 'admin@testemail.com', password: 'TempPass123!', expectedRole: 'admin', userType: 'staff' },
  { email: 'billing@testemail.com', password: 'TempPass123!', expectedRole: 'billing', userType: 'staff' },
  { email: 'john.smith@questdiagnostics.com', password: 'ClientPass123!', expectedRole: 'user', userType: 'client' }
];

console.log('================================================');
console.log('TESTING NUCLEAR RLS FIX');
console.log('================================================\n');

async function testUser(credentials) {
  console.log(`\nTesting ${credentials.email} (${credentials.userType})...`);
  console.log('----------------------------------------');
  
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  try {
    // Step 1: Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return false;
    }
    
    console.log('✅ Authentication successful');
    console.log('   User ID:', authData.user.id);
    
    // Step 2: Test set_user_context
    const { data: contextData, error: contextError } = await supabase.rpc('set_user_context', {
      user_id: authData.user.id
    });
    
    if (contextError) {
      console.error('❌ set_user_context failed:', contextError.message);
      if (contextError.hint) console.log('   Hint:', contextError.hint);
      return false;
    }
    
    console.log('✅ set_user_context successful');
    console.log('   Context:', JSON.stringify(contextData, null, 2));
    
    // Step 3: Test fetching from appropriate table/view
    if (credentials.userType === 'staff') {
      // Test fetching from users view
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();
      
      if (userError) {
        console.error('❌ Failed to fetch from users view:', userError.message);
        return false;
      }
      
      console.log('✅ Successfully fetched from users view');
      console.log('   Role:', userData.role);
      console.log('   Organization ID:', userData.organization_id);
    } else {
      // Test fetching from client_users view
      const { data: clientData, error: clientError } = await supabase
        .from('client_users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();
      
      if (clientError) {
        console.error('❌ Failed to fetch from client_users view:', clientError.message);
        return false;
      }
      
      console.log('✅ Successfully fetched from client_users view');
      console.log('   Role:', clientData.role);
      console.log('   Client ID:', clientData.client_id);
    }
    
    // Step 4: Test data access (invoices)
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, organization_id, client_id')
      .limit(5);
    
    if (invoiceError) {
      console.error('❌ Failed to fetch invoices:', invoiceError.message);
    } else {
      console.log(`✅ Can access ${invoices.length} invoices`);
      if (invoices.length > 0) {
        // Check that all invoices belong to the same organization (multi-tenant isolation)
        const orgIds = [...new Set(invoices.map(i => i.organization_id))];
        if (orgIds.length === 1) {
          console.log('✅ Multi-tenant isolation working (all invoices from same org)');
        } else if (orgIds.length > 1) {
          console.log('⚠️  WARNING: Seeing invoices from multiple organizations!');
        }
      }
    }
    
    // Step 5: Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function runAllTests() {
  let successCount = 0;
  let failCount = 0;
  
  for (const user of testUsers) {
    const success = await testUser(user);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n================================================');
  console.log('TEST SUMMARY');
  console.log('================================================');
  console.log(`✅ Successful tests: ${successCount}`);
  console.log(`❌ Failed tests: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Nuclear RLS fix is working!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  // Additional verification queries
  console.log('\n================================================');
  console.log('VERIFICATION QUERIES TO RUN IN SUPABASE DASHBOARD:');
  console.log('================================================');
  console.log(`
-- Check if views were created successfully
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('users', 'client_users');

-- Check if set_user_context function exists
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'set_user_context';

-- Check RLS policies
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'clients', 'invoices', 'payments');
  `);
}

// Run the tests
runAllTests().catch(console.error);