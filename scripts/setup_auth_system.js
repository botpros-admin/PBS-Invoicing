import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// User configurations for dual-user system
const userConfigurations = {
  // PBS Staff Users (public.users table)
  pbsStaff: [
    {
      email: 'superadmin@pbsmedical.com',
      password: 'SuperAdmin123!',
      metadata: {
        full_name: 'Super Administrator',
        user_type: 'pbs_staff'
      },
      profile: {
        first_name: 'Super',
        last_name: 'Administrator',
        role: 'super_admin',
        status: 'active',
        job_title: 'System Administrator',
        department: 'IT'
      }
    },
    {
      email: 'admin@pbsmedical.com',
      password: 'TempPass123!',
      metadata: {
        full_name: 'PBS Administrator',
        user_type: 'pbs_staff'
      },
      profile: {
        first_name: 'PBS',
        last_name: 'Administrator',
        role: 'admin',
        status: 'active',
        job_title: 'Administrator',
        department: 'Administration'
      }
    },
    {
      email: 'billing@pbsmedical.com',
      password: 'TempPass123!',
      metadata: {
        full_name: 'Billing Specialist',
        user_type: 'pbs_staff'
      },
      profile: {
        first_name: 'Billing',
        last_name: 'Specialist',
        role: 'user',
        status: 'active',
        job_title: 'Billing Specialist',
        department: 'Billing'
      }
    },
    {
      email: 'claims@pbsmedical.com',
      password: 'TempPass123!',
      metadata: {
        full_name: 'Claims Processor',
        user_type: 'pbs_staff'
      },
      profile: {
        first_name: 'Claims',
        last_name: 'Processor',
        role: 'user',
        status: 'active',
        job_title: 'Claims Processor',
        department: 'Claims'
      }
    }
  ],
  
  // Client Portal Users (public.client_users table)
  clientUsers: [
    {
      email: 'john.smith@questdiagnostics.com',
      password: 'ClientPass123!',
      metadata: {
        full_name: 'John Smith',
        user_type: 'client'
      },
      profile: {
        first_name: 'John',
        last_name: 'Smith',
        role: 'admin',
        status: 'active',
        job_title: 'Laboratory Administrator',
        department: 'Administration',
        can_view_all_clinics: true,
        can_upload_invoices: true,
        can_make_payments: true,
        can_dispute_invoices: true
      }
    },
    {
      email: 'sarah.jones@labcorp.com',
      password: 'ClientPass123!',
      metadata: {
        full_name: 'Sarah Jones',
        user_type: 'client'
      },
      profile: {
        first_name: 'Sarah',
        last_name: 'Jones',
        role: 'user',
        status: 'active',
        job_title: 'Billing Manager',
        department: 'Finance',
        can_view_all_clinics: true,
        can_upload_invoices: false,
        can_make_payments: true,
        can_dispute_invoices: true
      }
    },
    {
      email: 'mike.chen@northclinic.com',
      password: 'ClientPass123!',
      metadata: {
        full_name: 'Mike Chen',
        user_type: 'client'
      },
      profile: {
        first_name: 'Mike',
        last_name: 'Chen',
        role: 'user',
        status: 'active',
        job_title: 'Clinic Administrator',
        department: 'Administration',
        can_view_all_clinics: false,
        can_upload_invoices: false,
        can_make_payments: false,
        can_dispute_invoices: true
      }
    }
  ]
};

// Helper functions
async function ensureOrganizationExists() {
  const orgId = '11111111-1111-1111-1111-111111111111';
  
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

async function ensureClientExists(clientId, name, orgId) {
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single();
    
  if (!existingClient) {
    console.log(`Creating client: ${name}...`);
    const { error } = await supabase
      .from('clients')
      .insert({
        id: clientId,
        organization_id: orgId,
        name: name,
        code: name.toLowerCase().replace(/\s+/g, '-'),
        is_active: true,
        billing_terms: 30,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error(`Failed to create client ${name}:`, error);
      return null;
    }
  }
  
  return clientId;
}

async function createOrUpdateAuthUser(userConfig) {
  try {
    // Check if user exists
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === userConfig.email);
    
    let authUserId;
    
    if (existingUser) {
      console.log(`Updating existing auth user: ${userConfig.email}`);
      
      // Update the existing user
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: userConfig.password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            ...userConfig.metadata
          }
        }
      );
      
      if (updateError) {
        console.error(`Failed to update ${userConfig.email}:`, updateError);
        return null;
      }
      
      authUserId = existingUser.id;
    } else {
      console.log(`Creating new auth user: ${userConfig.email}`);
      
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userConfig.email,
        password: userConfig.password,
        email_confirm: true,
        user_metadata: userConfig.metadata
      });
      
      if (createError) {
        console.error(`Failed to create ${userConfig.email}:`, createError);
        return null;
      }
      
      authUserId = newUser.user.id;
    }
    
    console.log(`✓ Auth user ready: ${userConfig.email} (${authUserId})`);
    return authUserId;
    
  } catch (error) {
    console.error(`Error processing auth user ${userConfig.email}:`, error);
    return null;
  }
}

async function createPBSStaffProfile(authUserId, userConfig, orgId) {
  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .single();
    
    if (existingProfile) {
      console.log(`PBS staff profile already exists for ${userConfig.email}`);
      return true;
    }
    
    console.log(`Creating PBS staff profile for ${userConfig.email}...`);
    
    const { error } = await supabase
      .from('users')
      .insert({
        auth_id: authUserId,
        email: userConfig.email,
        first_name: userConfig.profile.first_name,
        last_name: userConfig.profile.last_name,
        role: userConfig.profile.role,
        status: userConfig.profile.status,
        job_title: userConfig.profile.job_title,
        department: userConfig.profile.department,
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Failed to create PBS staff profile for ${userConfig.email}:`, error);
      return false;
    }
    
    console.log(`✓ PBS staff profile created for ${userConfig.email}`);
    
    // Also create user_profiles entry for new system
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUserId,
        organization_id: orgId,
        role: userConfig.profile.role,
        permissions: [],
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError && !profileError.message.includes('duplicate')) {
      console.warn(`Warning: Could not create user_profiles entry for ${userConfig.email}:`, profileError);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error creating PBS staff profile for ${userConfig.email}:`, error);
    return false;
  }
}

async function createClientUserProfile(authUserId, userConfig, clientId, orgId) {
  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('client_users')
      .select('id')
      .eq('auth_id', authUserId)
      .single();
    
    if (existingProfile) {
      console.log(`Client user profile already exists for ${userConfig.email}`);
      return true;
    }
    
    console.log(`Creating client user profile for ${userConfig.email}...`);
    
    const { error } = await supabase
      .from('client_users')
      .insert({
        auth_id: authUserId,
        client_id: clientId,
        email: userConfig.email,
        first_name: userConfig.profile.first_name,
        last_name: userConfig.profile.last_name,
        role: userConfig.profile.role,
        status: userConfig.profile.status,
        job_title: userConfig.profile.job_title,
        department: userConfig.profile.department,
        can_view_all_clinics: userConfig.profile.can_view_all_clinics,
        can_upload_invoices: userConfig.profile.can_upload_invoices,
        can_make_payments: userConfig.profile.can_make_payments,
        can_dispute_invoices: userConfig.profile.can_dispute_invoices,
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`Failed to create client user profile for ${userConfig.email}:`, error);
      return false;
    }
    
    console.log(`✓ Client user profile created for ${userConfig.email}`);
    
    // Also create user_profiles entry for new system
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authUserId,
        organization_id: orgId,
        role: userConfig.profile.role,
        permissions: [],
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError && !profileError.message.includes('duplicate')) {
      console.warn(`Warning: Could not create user_profiles entry for ${userConfig.email}:`, profileError);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error creating client user profile for ${userConfig.email}:`, error);
    return false;
  }
}

async function testLogin(email, password) {
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew';
  const anonClient = createClient(supabaseUrl, anonKey);
  
  try {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error(`❌ Login failed for ${email}:`, error.message);
      return false;
    }
    
    console.log(`✅ Login successful for ${email}`);
    
    // Try to fetch profile from both tables
    const [pbsResult, clientResult] = await Promise.allSettled([
      anonClient.from('users').select('*').eq('auth_id', data.user.id).single(),
      anonClient.from('client_users').select('*').eq('auth_id', data.user.id).single()
    ]);
    
    if (pbsResult.status === 'fulfilled' && pbsResult.value.data) {
      console.log(`   Profile found in users table (PBS staff)`);
      console.log(`   Role: ${pbsResult.value.data.role}`);
    } else if (clientResult.status === 'fulfilled' && clientResult.value.data) {
      console.log(`   Profile found in client_users table`);
      console.log(`   Role: ${clientResult.value.data.role}`);
    } else {
      console.log(`   ⚠️ Warning: No profile found in either table`);
    }
    
    await anonClient.auth.signOut();
    return true;
    
  } catch (error) {
    console.error(`Error testing login for ${email}:`, error);
    return false;
  }
}

// Main setup function
async function setupAuthSystem() {
  console.log('=== PBS Invoicing Authentication System Setup ===\n');
  
  // Step 1: Ensure organization exists
  console.log('Step 1: Setting up organization...');
  const orgId = await ensureOrganizationExists();
  if (!orgId) {
    console.error('Failed to set up organization. Aborting.');
    return;
  }
  console.log(`✓ Organization ready: ${orgId}\n`);
  
  // Step 2: Set up clients for client users
  console.log('Step 2: Setting up client organizations...');
  const clients = {
    quest: await ensureClientExists('22222222-2222-2222-2222-222222222222', 'Quest Diagnostics', orgId),
    labcorp: await ensureClientExists('33333333-3333-3333-3333-333333333333', 'LabCorp', orgId),
    northclinic: await ensureClientExists('44444444-4444-4444-4444-444444444444', 'North Clinic', orgId)
  };
  console.log('✓ Client organizations ready\n');
  
  // Step 3: Process PBS Staff Users
  console.log('Step 3: Setting up PBS Staff Users...');
  for (const userConfig of userConfigurations.pbsStaff) {
    console.log(`\nProcessing PBS staff: ${userConfig.email}`);
    
    const authUserId = await createOrUpdateAuthUser(userConfig);
    if (!authUserId) {
      console.error(`Failed to create auth user for ${userConfig.email}`);
      continue;
    }
    
    const profileCreated = await createPBSStaffProfile(authUserId, userConfig, orgId);
    if (!profileCreated) {
      console.error(`Failed to create PBS staff profile for ${userConfig.email}`);
      continue;
    }
    
    console.log(`✅ PBS staff user fully configured: ${userConfig.email}`);
  }
  
  // Step 4: Process Client Portal Users
  console.log('\n\nStep 4: Setting up Client Portal Users...');
  const clientMapping = {
    'questdiagnostics.com': clients.quest,
    'labcorp.com': clients.labcorp,
    'northclinic.com': clients.northclinic
  };
  
  for (const userConfig of userConfigurations.clientUsers) {
    console.log(`\nProcessing client user: ${userConfig.email}`);
    
    // Determine which client this user belongs to
    const domain = userConfig.email.split('@')[1];
    let clientId = Object.entries(clientMapping).find(([key]) => domain.includes(key.split('.')[0]))?.[1];
    
    if (!clientId) {
      console.error(`Could not determine client for ${userConfig.email}`);
      clientId = clients.quest; // Default to Quest
    }
    
    const authUserId = await createOrUpdateAuthUser(userConfig);
    if (!authUserId) {
      console.error(`Failed to create auth user for ${userConfig.email}`);
      continue;
    }
    
    const profileCreated = await createClientUserProfile(authUserId, userConfig, clientId, orgId);
    if (!profileCreated) {
      console.error(`Failed to create client user profile for ${userConfig.email}`);
      continue;
    }
    
    console.log(`✅ Client user fully configured: ${userConfig.email}`);
  }
  
  // Step 5: Test all logins
  console.log('\n\nStep 5: Testing Authentication...');
  console.log('=' .repeat(50));
  
  const testCredentials = [
    { email: 'superadmin@pbsmedical.com', password: 'SuperAdmin123!', type: 'Super Admin' },
    { email: 'admin@pbsmedical.com', password: 'TempPass123!', type: 'PBS Admin' },
    { email: 'billing@pbsmedical.com', password: 'TempPass123!', type: 'PBS Billing' },
    { email: 'claims@pbsmedical.com', password: 'TempPass123!', type: 'PBS Claims' },
    { email: 'john.smith@questdiagnostics.com', password: 'ClientPass123!', type: 'Client Admin' },
    { email: 'sarah.jones@labcorp.com', password: 'ClientPass123!', type: 'Client User' },
    { email: 'mike.chen@northclinic.com', password: 'ClientPass123!', type: 'Clinic Admin' },
    { email: 'test@test.com', password: 'Test123456!', type: 'Test User' }
  ];
  
  let successCount = 0;
  for (const creds of testCredentials) {
    console.log(`\nTesting ${creds.type}: ${creds.email}`);
    const success = await testLogin(creds.email, creds.password);
    if (success) successCount++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('=== SETUP COMPLETE ===');
  console.log(`Successfully tested: ${successCount}/${testCredentials.length} users`);
  console.log('\nYou can now login with the following credentials:\n');
  console.log('PBS Staff Users:');
  console.log('  - superadmin@pbsmedical.com / SuperAdmin123!');
  console.log('  - admin@pbsmedical.com / TempPass123!');
  console.log('  - billing@pbsmedical.com / TempPass123!');
  console.log('  - claims@pbsmedical.com / TempPass123!');
  console.log('\nClient Portal Users:');
  console.log('  - john.smith@questdiagnostics.com / ClientPass123!');
  console.log('  - sarah.jones@labcorp.com / ClientPass123!');
  console.log('  - mike.chen@northclinic.com / ClientPass123!');
  console.log('\nTest User:');
  console.log('  - test@test.com / Test123456!');
  console.log('\n' + '=' .repeat(50));
}

// Run the setup
setupAuthSystem().catch(console.error);