import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestData() {
  console.log('🔍 Checking test data availability...\n');
  
  // Check invoices
  console.log('📄 Invoices:');
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, balance_due, status, client_id')
    .limit(5);
  
  if (invError) {
    console.error('Error:', invError);
  } else if (invoices && invoices.length > 0) {
    invoices.forEach(inv => {
      console.log(`  - ${inv.invoice_number}: $${inv.total_amount} (Balance: $${inv.balance_due || 0}) - Status: ${inv.status}`);
    });
    console.log(`  Total: ${invoices.length} invoice(s)\n`);
  } else {
    console.log('  No invoices found\n');
  }
  
  // Check clients
  console.log('👥 Clients:');
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name, code')
    .limit(5);
  
  if (clientError) {
    console.error('Error:', clientError);
  } else if (clients && clients.length > 0) {
    clients.forEach(client => {
      console.log(`  - ${client.name} (${client.code || 'no code'})`);
    });
    console.log(`  Total: ${clients.length} client(s)\n`);
  } else {
    console.log('  No clients found\n');
  }
  
  // Check organizations
  console.log('🏢 Organizations:');
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(5);
  
  if (orgError) {
    console.error('Error:', orgError);
  } else if (orgs && orgs.length > 0) {
    orgs.forEach(org => {
      console.log(`  - ${org.name} (ID: ${org.id})`);
    });
    console.log(`  Total: ${orgs.length} organization(s)\n`);
  } else {
    console.log('  No organizations found\n');
  }
  
  // Check if payments table columns exist
  console.log('💳 Checking payments table columns:');
  const { data: onePayment, error: payError } = await supabase
    .from('payments')
    .select('*')
    .limit(1);
    
  if (payError && payError.message.includes('does not exist')) {
    console.log('  ❌ Payments table or some columns may not exist');
    console.log('  Error:', payError.message);
  } else {
    console.log('  ✅ Payments table exists and is accessible');
  }
  
  console.log('\n📊 Summary:');
  if (clients?.length > 0 && invoices?.length > 0) {
    console.log('  ✅ Test data is available - you can test the payment workflow!');
    console.log('\n💡 Next steps:');
    console.log('  1. Go to http://localhost:5181/payments');
    console.log('  2. Click "Record Payment" to add a test payment');
    console.log('  3. Select a client and enter an amount');
    console.log('  4. Save the payment');
    console.log('  5. Click "Allocate" to link it to an invoice');
  } else {
    console.log('  ⚠️  Need to create test data first');
    if (!clients?.length) console.log('     - Create at least one client');
    if (!invoices?.length) console.log('     - Create and finalize at least one invoice');
  }
}

checkTestData().catch(console.error);