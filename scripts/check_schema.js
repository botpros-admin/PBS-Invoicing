import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwvukolqraoucpxjqpmu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dnVrb2xxcmFvdWNweGpxcG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU3MjY5MSwiZXhwIjoyMDU5MTQ4NjkxfQ.drlF5JNBEwLIVzFV_sO667Tq3wu2gXP5tHfyZ8kxAP0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function checkSchema() {
  try {
    // Check column information
    const { data: columnsInfo, error } = await supabase
      .rpc('query_db', {
        query_text: `
          SELECT 
            c.table_name,
            c.column_name,
            c.data_type,
            c.udt_name
          FROM information_schema.columns c
          WHERE c.table_schema = 'public'
          AND c.table_name IN ('users', 'client_users')
          AND c.column_name IN ('id', 'auth_id', 'user_id')
          ORDER BY c.table_name, c.ordinal_position
        `
      });

    if (error) {
      // Try a simpler approach
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      const { data: clientUsersData } = await supabase
        .from('client_users')
        .select('*')
        .limit(1);

      console.log('Sample users row:', usersData?.[0]);
      console.log('Sample client_users row:', clientUsersData?.[0]);
    } else {
      console.log('Column Information:');
      console.table(columnsInfo);
    }

  } catch (err) {
    console.error('Error:', err);
  }
  
  process.exit(0);
}

checkSchema();