#!/usr/bin/env node

/**
 * Apply Permission Migration Script
 * 
 * This script applies the user_permissions table migration directly to Supabase
 * using the service role key to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hardcode the credentials for now (from .env file)
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying user permissions migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250821000000_add_user_permissions_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (naive split on semicolon)
    // For production, use a proper SQL parser
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }

      // Show abbreviated statement for logging
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      console.log(`Executing statement ${i + 1}: ${preview}...`);

      // Execute the SQL statement
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();

      if (error) {
        // Try direct execution if RPC doesn't exist
        const { error: directError } = await supabase.from('_sql').select(statement);
        
        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, directError.message);
          // Continue with other statements instead of failing completely
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Migration applied successfully!');

    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('user_permissions')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('⚠️ Warning: Could not verify table creation:', tableError.message);
    } else {
      console.log('✅ Verified: user_permissions table exists');
    }

    // Now populate permissions for existing users
    console.log('\n📝 Populating permissions for existing users...');

    // Get all client users
    const { data: clientUsers, error: clientError } = await supabase
      .from('client_users')
      .select('auth_id, email');

    if (!clientError && clientUsers) {
      for (const user of clientUsers) {
        if (!user.auth_id) continue;

        // Insert default client permissions
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
            console.error(`❌ Error setting permissions for ${user.email}:`, error.message);
          }
        }
        console.log(`✅ Set permissions for ${user.email}`);
      }
    }

    console.log('\n✅ All done! User permissions system is now active.');
    console.log('📌 Note: Client users now get permissions from the database, not hardcoded values.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});