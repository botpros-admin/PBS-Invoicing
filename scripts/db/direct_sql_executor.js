// PBS Invoicing Direct SQL Executor
// This script allows executing SQL queries directly against the Supabase PostgreSQL database
// Run with: node direct_sql_executor.js "YOUR SQL QUERY HERE"

import pg from 'pg';
const { Pool } = pg;

// Configuration from .env file
const config = {
  user: 'postgres',
  password: 'PFUj63Bwj37nV1hz', // Database password from environment
  host: 'db.qwvukolqraoucpxjqpmu.supabase.co',
  port: 5432, // Default PostgreSQL port
  database: 'postgres',
  ssl: { rejectUnauthorized: false } // Required for Supabase
};

// Get SQL query from command line argument
const sqlQuery = process.argv.slice(2).join(' ') || 'SELECT NOW() as current_time';

// Create a new pool and connect
const pool = new Pool(config);

async function executeQuery() {
  console.log(`PBS Invoicing Direct SQL Executor`);
  console.log(`----------------------------------`);
  console.log(`Connecting to: ${config.host}`);
  console.log(`Executing query: ${sqlQuery}`);
  console.log(`----------------------------------`);

  try {
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      console.log('Connection established successfully');
      
      // Execute the query
      console.log('Executing query...');
      const result = await client.query(sqlQuery);
      
      // Print the result
      console.log(`Query completed successfully. ${result.rowCount} rows returned.`);
      console.table(result.rows);
      
      // If this is a diagnostic query, add some analysis
      if (sqlQuery.toLowerCase().includes('select') && !sqlQuery.toLowerCase().includes('limit')) {
        console.log(`\nQuery Analysis:`);
        console.log(`--------------`);
        console.log(`Total rows: ${result.rowCount}`);
        if (result.rows.length > 0) {
          console.log(`Columns: ${Object.keys(result.rows[0]).join(', ')}`);
        }
      }
    } finally {
      // Make sure to release the client before leaving the function
      client.release();
      console.log('Database connection released');
    }
  } catch (err) {
    console.error('Error executing query:', err.message);
    
    // Add more context for common errors
    if (err.message.includes('password authentication failed')) {
      console.error('\nThis error suggests that the database password is incorrect.');
      console.error('Check your .env file and verify the database password.');
    } else if (err.message.includes('connect ETIMEDOUT')) {
      console.error('\nConnection timed out. This suggests either:');
      console.error('1. The database server is not reachable (network issue)');
      console.error('2. The database server is not accepting connections (firewall issue)');
      console.error('3. The hostname or port is incorrect');
    } else if (err.message.includes('permission denied')) {
      console.error('\nPermission denied error. This suggests:');
      console.error('1. The user does not have access to the requested resource');
      console.error('2. Row Level Security (RLS) policies are blocking the query');
    }
  } finally {
    // Close the pool
    pool.end();
    console.log('Pool closed');
  }
}

// Run the query
executeQuery().catch(err => {
  console.error('Unhandled error:', err);
});
