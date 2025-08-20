import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function createTestUsers() {
  console.log('Creating test users...');

  // Test users to create
  const testUsers = [
    { email: 'admin@pbsmedical.com', password: 'TempPass123!', name: 'PBS Administrator' },
    { email: 'billing@pbsmedical.com', password: 'TempPass123!', name: 'Billing Specialist' },
    { email: 'claims@pbsmedical.com', password: 'TempPass123!', name: 'Claims Processor' },
    { email: 'test@test.com', password: 'Test123456!', name: 'Test User' }
  ];

  for (const user of testUsers) {
    try {
      // First, try to create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true // Auto-confirm email
      });

      if (authError) {
        console.log(`User ${user.email} might already exist:`, authError.message);
        
        // Try to update the user's password instead
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError) {
          const existingUser = users.users.find(u => u.email === user.email);
          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
              password: user.password
            });
            if (updateError) {
              console.error(`Failed to update password for ${user.email}:`, updateError);
            } else {
              console.log(`✓ Updated password for ${user.email}`);
            }
          }
        }
      } else {
        console.log(`✓ Created auth user: ${user.email}`);
        
        // Create user profile if auth user was created successfully
        if (authData?.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: authData.user.id,
              email: user.email,
              full_name: user.name,
              role: 'admin'
            });
          
          if (profileError) {
            console.error(`Failed to create profile for ${user.email}:`, profileError);
          } else {
            console.log(`✓ Created profile for ${user.email}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing ${user.email}:`, error);
    }
  }
}

async function checkAuthHealth() {
  console.log('\nChecking auth health...');
  
  // Test with anon key
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew';
  const anonClient = createClient(supabaseUrl, anonKey);

  // Try to sign in with test user
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: 'test@test.com',
    password: 'Test123456!'
  });

  if (error) {
    console.error('❌ Auth test failed:', error.message);
  } else {
    console.log('✓ Auth test successful!');
    console.log('  User ID:', data.user?.id);
    console.log('  Email:', data.user?.email);
    
    // Sign out
    await anonClient.auth.signOut();
  }
}

async function main() {
  try {
    await createTestUsers();
    await checkAuthHealth();
  } catch (error) {
    console.error('Main error:', error);
  }
}

main();