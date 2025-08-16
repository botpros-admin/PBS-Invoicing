#!/usr/bin/env node

/**
 * Database Backup Script for PBS Invoicing
 * Creates timestamped backups of the production database before deployments
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Backup configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const BACKUP_FILENAME = `backup_${TIMESTAMP}.sql`;
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_FILENAME);

// Tables to backup (in dependency order)
const TABLES_TO_BACKUP = [
  // Core tables
  'users',
  'laboratories',
  'hospitals',
  'lab_hospital_associations',
  
  // Patient data
  'patients',
  'insurance_providers',
  'patient_insurance',
  
  // Billing data
  'cpt_codes',
  'invoices',
  'invoice_items',
  'payments',
  'payment_allocations',
  'payment_credits',
  
  // Additional tables
  'audit_logs',
  'error_logs',
  'email_templates',
  'fee_schedules',
  'disputes'
];

async function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function getTableRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn(`⚠️  Could not get row count for ${tableName}: ${error.message}`);
    return 'unknown';
  }
}

async function backupTable(tableName) {
  console.log(`📊 Backing up table: ${tableName}`);
  
  try {
    // Get row count
    const rowCount = await getTableRowCount(tableName);
    console.log(`   - Rows to backup: ${rowCount}`);
    
    // Fetch all data from the table
    let allData = [];
    let rangeStart = 0;
    const rangeSize = 1000; // Fetch 1000 rows at a time
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(rangeStart, rangeStart + rangeSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        rangeStart += rangeSize;
        hasMore = data.length === rangeSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`   ✅ Fetched ${allData.length} rows`);
    return { tableName, data: allData };
  } catch (error) {
    console.error(`   ❌ Failed to backup ${tableName}: ${error.message}`);
    throw error;
  }
}

async function createSQLDump(backupData) {
  console.log('\n📝 Creating SQL dump file...');
  
  let sqlContent = `-- PBS Invoicing Database Backup
-- Created: ${new Date().toISOString()}
-- Environment: ${process.env.NODE_ENV || 'production'}
-- Tables: ${TABLES_TO_BACKUP.join(', ')}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- Disable triggers and foreign key checks for import
SET session_replication_role = 'replica';

`;

  for (const { tableName, data } of backupData) {
    if (data.length === 0) {
      sqlContent += `\n-- Table ${tableName} is empty\n`;
      continue;
    }

    sqlContent += `\n-- Table: ${tableName}\n`;
    sqlContent += `DELETE FROM ${tableName};\n`;
    
    // Generate INSERT statements
    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') {
          // Escape single quotes and backslashes
          return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
        }
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        return value;
      });
      
      sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
  }

  sqlContent += `
-- Re-enable triggers and foreign key checks
SET session_replication_role = 'origin';

-- Update sequences
`;

  // Add sequence updates for tables with auto-incrementing IDs
  for (const tableName of TABLES_TO_BACKUP) {
    sqlContent += `SELECT setval('${tableName}_id_seq', (SELECT COALESCE(MAX(id), 0) FROM ${tableName}), true);\n`;
  }

  sqlContent += `
-- Backup completed successfully
`;

  // Write to file
  fs.writeFileSync(BACKUP_PATH, sqlContent, 'utf8');
  console.log(`✅ SQL dump created: ${BACKUP_PATH}`);
  
  // Get file size
  const stats = fs.statSync(BACKUP_PATH);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Backup size: ${fileSizeInMB} MB`);
  
  return BACKUP_PATH;
}

async function verifyBackup() {
  console.log('\n🔍 Verifying backup...');
  
  if (!fs.existsSync(BACKUP_PATH)) {
    throw new Error('Backup file not found');
  }
  
  const content = fs.readFileSync(BACKUP_PATH, 'utf8');
  const lines = content.split('\n');
  const insertCount = lines.filter(line => line.startsWith('INSERT INTO')).length;
  
  console.log(`✅ Backup verified: ${insertCount} INSERT statements`);
  return true;
}

async function compressBackup() {
  console.log('\n🗜️  Compressing backup...');
  
  try {
    // Check if 7z is available (Windows)
    const { stdout } = await execPromise('where 7z');
    if (stdout) {
      await execPromise(`7z a -t7z "${BACKUP_PATH}.7z" "${BACKUP_PATH}"`);
      console.log(`✅ Compressed backup created: ${BACKUP_PATH}.7z`);
      
      // Remove uncompressed file
      fs.unlinkSync(BACKUP_PATH);
      return `${BACKUP_PATH}.7z`;
    }
  } catch (error) {
    // 7z not available, try tar (cross-platform)
    try {
      await execPromise(`tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_FILENAME}"`);
      console.log(`✅ Compressed backup created: ${BACKUP_PATH}.tar.gz`);
      
      // Remove uncompressed file
      fs.unlinkSync(BACKUP_PATH);
      return `${BACKUP_PATH}.tar.gz`;
    } catch (tarError) {
      console.warn('⚠️  Compression failed, keeping uncompressed backup');
      return BACKUP_PATH;
    }
  }
}

async function cleanOldBackups() {
  console.log('\n🧹 Cleaning old backups...');
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(f => f.startsWith('backup_'));
  
  // Keep only the last 10 backups
  if (backupFiles.length > 10) {
    backupFiles
      .sort()
      .slice(0, -10)
      .forEach(file => {
        const filePath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`   🗑️  Deleted old backup: ${file}`);
      });
  }
  
  console.log(`✅ Cleanup complete. ${Math.min(backupFiles.length, 10)} backups retained`);
}

async function main() {
  console.log('🚀 PBS Invoicing Database Backup Script');
  console.log('========================================');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔗 Database: ${SUPABASE_URL}`);
  console.log(`📁 Backup location: ${BACKUP_PATH}`);
  console.log('');
  
  try {
    // Step 1: Ensure backup directory exists
    await ensureBackupDirectory();
    
    // Step 2: Backup all tables
    console.log('\n📊 Starting backup process...');
    const backupData = [];
    let totalRows = 0;
    
    for (const tableName of TABLES_TO_BACKUP) {
      const tableData = await backupTable(tableName);
      backupData.push(tableData);
      totalRows += tableData.data.length;
    }
    
    console.log(`\n✅ Backed up ${TABLES_TO_BACKUP.length} tables with ${totalRows} total rows`);
    
    // Step 3: Create SQL dump
    const dumpPath = await createSQLDump(backupData);
    
    // Step 4: Verify backup
    await verifyBackup();
    
    // Step 5: Compress backup
    const finalPath = await compressBackup();
    
    // Step 6: Clean old backups
    await cleanOldBackups();
    
    // Summary
    console.log('\n========================================');
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log(`📦 Final backup: ${finalPath}`);
    console.log(`📊 Tables backed up: ${TABLES_TO_BACKUP.length}`);
    console.log(`📝 Total rows: ${totalRows}`);
    console.log('========================================');
    
    // Create a backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      filename: path.basename(finalPath),
      tables: TABLES_TO_BACKUP,
      totalRows,
      environment: process.env.NODE_ENV || 'production',
      supabaseUrl: SUPABASE_URL,
    };
    
    fs.writeFileSync(
      path.join(BACKUP_DIR, `manifest_${TIMESTAMP}.json`),
      JSON.stringify(manifest, null, 2)
    );
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ BACKUP FAILED');
    console.error(error);
    process.exit(1);
  }
}

// Run the backup
if (require.main === module) {
  main();
}

module.exports = { main };