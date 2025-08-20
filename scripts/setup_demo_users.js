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

async function ensureOrganizationExists() {
  const orgId = '11111111-1111-1111-1111-111111111111';
  
  // Check if organization exists
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .single();
    
  if (!existingOrg) {
    console.log('Creating PBS Medical organization...');
    const { error } = await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: 'PBS Medical',
        slug: 'pbs-medical',
        type: 'billing_company',
        is_active: true,
        subscription_tier: 'premium',
        subscription_status: 'active',
        settings: {},
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Failed to create organization:', error);
      return null;
    }
  }
  
  return orgId;
}

async function createOrUpdateUser(email, password, name) {
  try {
    // First, check if user exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === email);
    
    let userId;
    
    if (existingUser) {
      console.log(`User ${email} already exists, updating password...`);
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.error(`Failed to update ${email}:`, updateError);
        return null;
      }
      userId = existingUser.id;
    } else {
      console.log(`Creating new user ${email}...`);
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name
        }
      });
      
      if (createError) {
        console.error(`Failed to create ${email}:`, createError);
        return null;
      }
      userId = newUser.user.id;
    }
    
    console.log(`✓ User ${email} is ready`);
    return userId;
    
  } catch (error) {
    console.error(`Error processing ${email}:`, error);
    return null;
  }
}

async function createUserProfile(userId, orgId, role) {
  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
    
  if (!existingProfile) {
    console.log(`Creating profile for user ${userId}...`);
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: role,
        permissions: [],
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Failed to create profile:', error);
      return false;
    }
    console.log('✓ Profile created');
  } else {
    console.log('✓ Profile already exists');
  }
  
  return true;
}

async function setupDemoUsers() {
  console.log('=== Setting up Demo Users ===\n');
  
  // Ensure organization exists
  const orgId = await ensureOrganizationExists();
  if (!orgId) {
    console.error('Failed to ensure organization exists');
    return;
  }
  console.log(`✓ Organization ready: ${orgId}\n`);
  
  // Define all demo users
  const demoUsers = [
    // Test user (already working)
    { email: 'test@test.com', password: 'Test123456!', name: 'Test User', role: 'user' },
    
    // PBS Staff
    { email: 'admin@pbsmedical.com', password: 'TempPass123!', name: 'PBS Administrator', role: 'admin' },
    { email: 'billing@pbsmedical.com', password: 'TempPass123!', name: 'Billing Specialist', role: 'billing' },
    { email: 'claims@pbsmedical.com', password: 'TempPass123!', name: 'Claims Processor', role: 'claims' },
    
    // Client users
    { email: 'john.smith@questdiagnostics.com', password: 'ClientPass123!', name: 'John Smith', role: 'client_admin' },
    { email: 'sarah.jones@labcorp.com', password: 'ClientPass123!', name: 'Sarah Jones', role: 'client_billing' },
    { email: 'mike.chen@northclinic.com', password: 'ClientPass123!', name: 'Mike Chen', role: 'clinic_admin' },
    
    // Super admin
    { email: 'superadmin@pbsmedical.com', password: 'SuperAdmin123!', name: 'Super Administrator', role: 'super_admin' }
  ];
  
  // Process each user
  for (const user of demoUsers) {
    console.log(`\nProcessing ${user.email}...`);
    
    // Create or update auth user
    const userId = await createOrUpdateUser(user.email, user.password, user.name);
    if (!userId) {
      console.error(`Failed to process ${user.email}`);
      continue;
    }
    
    // Create user profile
    const profileCreated = await createUserProfile(userId, orgId, user.role);
    if (!profileCreated) {
      console.error(`Failed to create profile for ${user.email}`);
      continue;
    }
    
    console.log(`✅ ${user.email} is fully set up`);
  }
  
  console.log('\n=== Testing Authentication ===\n');
  
  // Test login with each user type
  const testUsers = [
    { email: 'test@test.com', password: 'Test123456!' },
    { email: 'admin@pbsmedical.com', password: 'TempPass123!' },
    { email: 'superadmin@pbsmedical.com', password: 'SuperAdmin123!' }
  ];
  
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew';
  
  for (const testUser of testUsers) {
    const anonClient = createClient(supabaseUrl, anonKey);
    
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (error) {
      console.error(`❌ Login failed for ${testUser.email}:`, error.message);
    } else {
      console.log(`✅ Login successful for ${testUser.email}`);
      
      // Check profile
      const { data: profile } = await anonClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
        
      if (profile) {
        console.log(`   Profile: ${profile.role} in org ${profile.organization_id}`);
      }
      
      await anonClient.auth.signOut();
    }
  }
  
  console.log('\n=== Setup Complete ===');
  console.log('\nYou can now login with any of these demo users:');
  console.log('- test@test.com / Test123456!');
  console.log('- admin@pbsmedical.com / TempPass123!');
  console.log('- superadmin@pbsmedical.com / SuperAdmin123!');
  console.log('- And all other demo users listed above');
}

// Run setup
setupDemoUsers().catch(console.error);