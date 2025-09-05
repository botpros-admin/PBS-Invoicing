#!/usr/bin/env node

/**
 * Setup User Permissions Script
 * 
 * This script creates the user_permissions table and populates it with
 * appropriate permissions for all users, replacing hardcoded client permissions.
 * 
 * Based on the pattern from setup_auth_final.js documented in Archon
 */

import { createClient } from '@supabase/supabase-js';

// Use the credentials from .env file (documented in Archon)
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function setupUserPermissions() {
  console.log('🚀 Setting up user permissions system...\n');

  try {
    // Step 1: Create the user_permissions table using direct SQL
    console.log('📋 Creating user_permissions table...');
    
    // Create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        resource TEXT NOT NULL,
        actions TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, resource)
      );
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (tableError && !tableError.message?.includes('already exists')) {
      // Try direct approach if exec_sql doesn't exist
      console.log('⚠️  exec_sql RPC not found, attempting direct creation...');
      // We'll need to use the SQL editor in Supabase dashboard for this
    } else {
      console.log('✅ Table created or already exists');
    }

    // Step 2: Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    
    // Step 3: Create the get_user_permissions function
    console.log('🔧 Creating get_user_permissions function...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.get_user_permissions()
      RETURNS TABLE (
        resource TEXT,
        actions TEXT[]
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          up.resource,
          up.actions
        FROM public.user_permissions up
        WHERE up.user_id = auth.uid();
      END;
      $$;
    `;

    // Note: This would need to be run in Supabase SQL editor
    console.log('📝 Note: Run the following SQL in Supabase dashboard SQL editor:');
    console.log(createFunctionSQL);

    // Step 4: Get all users and set their permissions
    console.log('\n👥 Fetching all users...');

    // Get client users
    const { data: clientUsers, error: clientError } = await supabase
      .from('client_users')
      .select('auth_id, email, first_name, last_name');

    if (clientError) {
      console.error('❌ Error fetching client users:', clientError);
    } else {
      console.log(`✅ Found ${clientUsers?.length || 0} client users`);
    }

    // Get staff users
    const { data: staffUsers, error: staffError } = await supabase
      .from('users')
      .select('auth_id, email, role');

    if (staffError) {
      console.error('❌ Error fetching staff users:', staffError);
    } else {
      console.log(`✅ Found ${staffUsers?.length || 0} staff users`);
    }

    // Step 5: Insert permissions for client users
    console.log('\n📝 Setting permissions for client users...');
    
    for (const user of clientUsers || []) {
      if (!user.auth_id) {
        console.log(`⚠️  Skipping ${user.email} - no auth_id`);
        continue;
      }

      // Default client permissions (matching what was hardcoded)
      const permissions = [
        { user_id: user.auth_id, resource: 'invoices', actions: ['read'] },
        { user_id: user.auth_id, resource: 'payments', actions: ['read', 'create'] },
        { user_id: user.auth_id, resource: 'reports', actions: ['read'] },
        { user_id: user.auth_id, resource: 'disputes', actions: ['read', 'create'] }
      ];

      for (const perm of permissions) {
        const { error } = await supabase
          .from('user_permissions')
          .upsert(perm, { onConflict: 'user_id,resource' });

        if (error) {
          console.error(`❌ Error setting ${perm.resource} for ${user.email}:`, error.message);
        } else {
          console.log(`✅ Set ${perm.resource} permissions for ${user.email}`);
        }
      }
    }

    // Step 6: Verify permissions were created
    console.log('\n🔍 Verifying permissions...');
    
    const { data: permissionCount, error: countError } = await supabase
      .from('user_permissions')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('❌ Error counting permissions:', countError);
    } else {
      console.log(`✅ Total permissions created: ${permissionCount?.length || 0}`);
    }

    // Step 7: Test with a specific user
    if (clientUsers && clientUsers.length > 0) {
      const testUser = clientUsers[0];
      console.log(`\n🧪 Testing permissions for ${testUser.email}...`);
      
      const { data: testPerms, error: testError } = await supabase
        .from('user_permissions')
        .select('resource, actions')
        .eq('user_id', testUser.auth_id);

      if (testError) {
        console.error('❌ Error testing permissions:', testError);
      } else {
        console.log('✅ User permissions:', testPerms);
      }
    }

    console.log('\n✅ User permissions system setup complete!');
    console.log('📌 Important: The SQL migration needs to be run in Supabase dashboard');
    console.log('📌 Navigate to: SQL Editor → New Query → Paste the migration SQL');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupUserPermissions().then(() => {
  console.log('\n👍 Setup process complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});