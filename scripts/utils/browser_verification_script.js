/**
 * PBS Invoicing Browser Verification Script
 * 
 * This script helps diagnose and fix common issues with the PBS Invoicing
 * application, particularly related to authentication and local storage.
 * 
 * Usage: Copy and paste this entire script into your browser console when
 * experiencing authentication or infinite loading issues.
 */

(function() {
  console.log('==========================================');
  console.log('PBS Invoicing Verification Script');
  console.log('==========================================');
  
  // Check Supabase session
  const supabaseSession = localStorage.getItem('sb-' + (window.SUPABASE_URL || '').split('//')[1] + '-auth-token');
  console.log('Supabase Session Present:', !!supabaseSession);
  
  // Check PBS Invoicing auth
  const pbsAuth = localStorage.getItem('pbs_invoicing_auth');
  console.log('PBS Invoicing Auth Present:', !!pbsAuth);
  
  if (pbsAuth) {
    try {
      const parsedAuth = JSON.parse(pbsAuth);
      console.log('PBS Auth User Email:', parsedAuth.user?.email || 'not found');
      console.log('PBS Auth User Role:', parsedAuth.user?.role || 'not found');
      console.log('PBS Auth Token Present:', !!parsedAuth.token);
    } catch (e) {
      console.error('Error parsing PBS auth data:', e);
    }
  }
  
  // Provide options to fix issues
  console.log('==========================================');
  console.log('TROUBLESHOOTING OPTIONS:');
  console.log('==========================================');
  console.log('1. To clear only PBS auth data, run:');
  console.log('   localStorage.removeItem("pbs_invoicing_auth");');
  console.log('   location.reload();');
  console.log('');
  console.log('2. To clear all local storage (complete reset), run:');
  console.log('   localStorage.clear();');
  console.log('   location.reload();');
  console.log('');
  console.log('3. To check schema configuration, run SQL from:');
  console.log('   utils/migrate_to_api_schema.sql in Supabase SQL Editor');
  console.log('==========================================');
  
  // Help with fixing schema issues
  console.log('SCHEMA TIPS:');
  console.log('- If queries fail with "schema must be: api" errors, your Supabase');
  console.log('  database needs the schema migration script to be executed.');
  console.log('- Refer to SCHEMA_MIGRATION_GUIDE.md for instructions.');
  console.log('==========================================');
  
  return {
    fixAuth: function() {
      localStorage.removeItem('pbs_invoicing_auth');
      console.log('✅ PBS auth data cleared. Reloading page...');
      setTimeout(() => location.reload(), 1000);
    },
    resetAll: function() {
      localStorage.clear();
      console.log('✅ All local storage cleared. Reloading page...');
      setTimeout(() => location.reload(), 1000);
    }
  };
})();

// Helper functions provided - run these directly:
// fixAuth() - Clears only PBS auth data
// resetAll() - Clears all localStorage data
