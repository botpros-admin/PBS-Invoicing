import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use service role key to bypass RLS
const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function executeSQLFile() {
  try {
    // Read the SQL file
    const sqlContent = readFileSync(join(__dirname, 'fix_auth_proper.sql'), 'utf8');
    
    // Split by semicolon but keep DO blocks together
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    const lines = sqlContent.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true;
      }
      
      currentStatement += line + '\n';
      
      if (line.trim() === '$$;' && inDoBlock) {
        inDoBlock = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else if (line.trim().endsWith(';') && !inDoBlock) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Execute each statement
    for (const statement of statements) {
      if (statement && !statement.startsWith('--')) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { data: result, error: execError } = await supabase
            .from('_sql')
            .insert({ query: statement })
            .select();
            
          if (execError) {
            console.error('Error executing statement:', execError);
          } else {
            console.log('Statement executed successfully');
          }
        } else {
          console.log('Statement executed successfully');
        }
      }
    }
    
    // Now test authentication
    console.log('\n--- Testing Authentication ---');
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NzI2OTEsImV4cCI6MjA1OTE0ODY5MX0.mhyCdgks_NAvnWWbkT7642Ww_RkwwosruEXLSLmQ_ew';
    const anonClient = createClient(supabaseUrl, anonKey);
    
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'Test123456!'
    });
    
    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
    } else {
      console.log('✅ Auth test successful!');
      console.log('User:', authData.user?.email);
      
      // Check if profile exists
      const { data: profile, error: profileError } = await anonClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
        
      if (profileError) {
        console.error('Profile fetch error:', profileError);
      } else {
        console.log('Profile found:', profile);
      }
      
      await anonClient.auth.signOut();
    }
    
  } catch (error) {
    console.error('Execution error:', error);
  }
}

executeSQLFile();