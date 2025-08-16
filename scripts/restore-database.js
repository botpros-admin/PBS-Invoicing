#!/usr/bin/env node

/**
 * Database Restore Script for PBS Invoicing
 * Restores database from backup files in case of emergency
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listAvailableBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('❌ No backup directory found');
    return [];
  }
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(f => 
    f.startsWith('backup_') && 
    (f.endsWith('.sql') || f.endsWith('.sql.7z') || f.endsWith('.sql.tar.gz'))
  );
  
  const backupsWithInfo = backupFiles.map(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const manifestFile = file.replace(/\.(sql|7z|tar\.gz).*$/, '').replace('backup_', 'manifest_') + '.json';
    const manifestPath = path.join(BACKUP_DIR, manifestFile);
    
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        // Ignore manifest errors
      }
    }
    
    return {
      filename: file,
      path: filePath,
      size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
      created: stats.mtime,
      manifest
    };
  }).sort((a, b) => b.created - a.created);
  
  return backupsWithInfo;
}

async function decompressBackup(backupPath) {
  console.log('🗜️  Decompressing backup...');
  
  let decompressedPath = backupPath;
  
  if (backupPath.endsWith('.7z')) {
    try {
      await execPromise(`7z x "${backupPath}" -o"${BACKUP_DIR}" -y`);
      decompressedPath = backupPath.replace('.7z', '');
      console.log('✅ Backup decompressed');
    } catch (error) {
      throw new Error(`Failed to decompress 7z file: ${error.message}`);
    }
  } else if (backupPath.endsWith('.tar.gz')) {
    try {
      await execPromise(`tar -xzf "${backupPath}" -C "${BACKUP_DIR}"`);
      decompressedPath = backupPath.replace('.tar.gz', '');
      console.log('✅ Backup decompressed');
    } catch (error) {
      throw new Error(`Failed to decompress tar.gz file: ${error.message}`);
    }
  }
  
  if (!fs.existsSync(decompressedPath)) {
    throw new Error('Decompressed file not found');
  }
  
  return decompressedPath;
}

async function parseSQLFile(sqlPath) {
  console.log('📖 Parsing SQL file...');
  
  const content = fs.readFileSync(sqlPath, 'utf8');
  const lines = content.split('\n');
  
  const statements = [];
  let currentStatement = '';
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('--') || line.trim() === '') {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // Check if statement is complete (ends with semicolon)
    if (line.trim().endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  console.log(`✅ Parsed ${statements.length} SQL statements`);
  return statements;
}

async function executeStatement(statement) {
  // Parse the statement to determine the operation
  if (statement.startsWith('DELETE FROM')) {
    const match = statement.match(/DELETE FROM (\w+)/);
    if (match) {
      const tableName = match[1];
      const { error } = await supabase.from(tableName).delete().neq('id', 0);
      if (error) throw error;
    }
  } else if (statement.startsWith('INSERT INTO')) {
    // Parse INSERT statement
    const match = statement.match(/INSERT INTO (\w+) \((.*?)\) VALUES \((.*?)\)/s);
    if (match) {
      const tableName = match[1];
      const columns = match[2].split(',').map(c => c.trim());
      const valuesStr = match[3];
      
      // Parse values (this is simplified - may need enhancement for complex data)
      const values = [];
      let currentValue = '';
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        
        if (escapeNext) {
          currentValue += char;
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === "'" && !escapeNext) {
          if (inString) {
            // Check if it's an escaped quote
            if (i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
              currentValue += "'";
              i++; // Skip next quote
              continue;
            }
          }
          inString = !inString;
          continue;
        }
        
        if (char === ',' && !inString) {
          values.push(parseValue(currentValue.trim()));
          currentValue = '';
          continue;
        }
        
        currentValue += char;
      }
      
      if (currentValue.trim()) {
        values.push(parseValue(currentValue.trim()));
      }
      
      // Create object from columns and values
      const record = {};
      columns.forEach((col, index) => {
        record[col] = values[index];
      });
      
      const { error } = await supabase.from(tableName).insert(record);
      if (error) throw error;
    }
  } else if (statement.startsWith('SELECT setval')) {
    // Sequence updates - Supabase handles this automatically
    console.log('   ⏭️  Skipping sequence update (handled by Supabase)');
  } else if (statement.startsWith('SET')) {
    // Configuration statements - skip
    console.log('   ⏭️  Skipping SET statement');
  }
}

function parseValue(valueStr) {
  if (valueStr === 'NULL') return null;
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  if (valueStr.endsWith('::jsonb')) {
    return JSON.parse(valueStr.slice(0, -7));
  }
  if (!isNaN(valueStr) && valueStr !== '') {
    return Number(valueStr);
  }
  return valueStr;
}

async function confirmRestore(backup) {
  console.log('\n⚠️  WARNING: Database restore will DELETE all current data!');
  console.log('📦 Selected backup:', backup.filename);
  console.log('📅 Created:', backup.created.toLocaleString());
  console.log('📊 Size:', backup.size);
  
  if (backup.manifest) {
    console.log('📋 Manifest:');
    console.log('   - Tables:', backup.manifest.tables.length);
    console.log('   - Total rows:', backup.manifest.totalRows);
    console.log('   - Environment:', backup.manifest.environment);
  }
  
  const answer = await question('\n❓ Are you SURE you want to restore from this backup? (type "yes" to confirm): ');
  return answer.toLowerCase() === 'yes';
}

async function restoreDatabase(sqlPath) {
  console.log('\n🔄 Starting database restore...');
  
  const statements = await parseSQLFile(sqlPath);
  
  let completed = 0;
  let failed = 0;
  
  console.log('\n📝 Executing SQL statements...');
  
  for (const statement of statements) {
    try {
      process.stdout.write(`\r   Progress: ${completed}/${statements.length} statements`);
      await executeStatement(statement);
      completed++;
    } catch (error) {
      failed++;
      console.error(`\n   ❌ Failed statement: ${statement.substring(0, 50)}...`);
      console.error(`      Error: ${error.message}`);
    }
  }
  
  console.log(`\n\n✅ Restore completed: ${completed} successful, ${failed} failed`);
  
  if (failed > 0) {
    console.warn('⚠️  Some statements failed. Database may be in an inconsistent state.');
    console.warn('   Consider running migrations or checking error logs.');
  }
}

async function createPreRestoreBackup() {
  console.log('\n💾 Creating pre-restore backup...');
  
  try {
    const backupScript = require('./backup-database');
    await backupScript.main();
    console.log('✅ Pre-restore backup created');
  } catch (error) {
    console.warn('⚠️  Could not create pre-restore backup:', error.message);
    const answer = await question('Continue without pre-restore backup? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      throw new Error('Restore cancelled');
    }
  }
}

async function main() {
  console.log('🔄 PBS Invoicing Database Restore Script');
  console.log('========================================');
  console.log('⚠️  This script will REPLACE all data in the database');
  console.log('');
  
  try {
    // Step 1: List available backups
    const backups = await listAvailableBackups();
    
    if (backups.length === 0) {
      console.error('❌ No backup files found');
      process.exit(1);
    }
    
    console.log('📦 Available backups:\n');
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename}`);
      console.log(`   📅 Created: ${backup.created.toLocaleString()}`);
      console.log(`   📊 Size: ${backup.size}`);
      if (backup.manifest) {
        console.log(`   📋 Tables: ${backup.manifest.tables.length}, Rows: ${backup.manifest.totalRows}`);
      }
      console.log('');
    });
    
    // Step 2: Select backup
    const selection = await question('Select backup number (or "q" to quit): ');
    
    if (selection.toLowerCase() === 'q') {
      console.log('Restore cancelled');
      process.exit(0);
    }
    
    const backupIndex = parseInt(selection) - 1;
    if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backups.length) {
      console.error('❌ Invalid selection');
      process.exit(1);
    }
    
    const selectedBackup = backups[backupIndex];
    
    // Step 3: Confirm restore
    const confirmed = await confirmRestore(selectedBackup);
    if (!confirmed) {
      console.log('Restore cancelled');
      process.exit(0);
    }
    
    // Step 4: Create pre-restore backup
    await createPreRestoreBackup();
    
    // Step 5: Decompress if needed
    let sqlPath = selectedBackup.path;
    if (sqlPath.endsWith('.7z') || sqlPath.endsWith('.tar.gz')) {
      sqlPath = await decompressBackup(sqlPath);
    }
    
    // Step 6: Restore database
    await restoreDatabase(sqlPath);
    
    // Step 7: Cleanup temporary files
    if (sqlPath !== selectedBackup.path && fs.existsSync(sqlPath)) {
      fs.unlinkSync(sqlPath);
      console.log('🧹 Cleaned up temporary files');
    }
    
    console.log('\n========================================');
    console.log('✅ RESTORE COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('\n📋 Next steps:');
    console.log('1. Verify data integrity');
    console.log('2. Run any pending migrations');
    console.log('3. Test application functionality');
    console.log('4. Clear application caches if needed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RESTORE FAILED');
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the restore
if (require.main === module) {
  main();
}

module.exports = { main };