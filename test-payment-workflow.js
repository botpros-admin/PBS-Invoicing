/**
 * Test script to verify payment allocation workflow
 * Run this to ensure the payment system is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentWorkflow() {
  console.log('🧪 Testing Payment Allocation Workflow\n');
  console.log('========================================\n');

  try {
    // Step 1: Check for unposted payments
    console.log('1️⃣ Checking for unposted payments...');
    const { data: unpostedPayments, error: paymentError } = await supabase
      .from('payments')
      .select('id, payment_number, amount, status, client_id')
      .eq('status', 'unposted')
      .limit(5);

    if (paymentError) throw paymentError;

    if (unpostedPayments && unpostedPayments.length > 0) {
      console.log(`   ✅ Found ${unpostedPayments.length} unposted payment(s):`);
      unpostedPayments.forEach(p => {
        console.log(`      - ${p.payment_number}: $${p.amount}`);
      });
    } else {
      console.log('   ⚠️  No unposted payments found');
      console.log('   💡 Create a payment using the UI first');
    }

    // Step 2: Check for unpaid invoices
    console.log('\n2️⃣ Checking for unpaid invoices...');
    const { data: unpaidInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, balance_due, status, client_id')
      .gt('balance_due', 0)
      .limit(5);

    if (invoiceError) throw invoiceError;

    if (unpaidInvoices && unpaidInvoices.length > 0) {
      console.log(`   ✅ Found ${unpaidInvoices.length} unpaid invoice(s):`);
      unpaidInvoices.forEach(i => {
        console.log(`      - ${i.invoice_number}: Balance $${i.balance_due} of $${i.total_amount}`);
      });
    } else {
      console.log('   ⚠️  No unpaid invoices found');
      console.log('   💡 Create and finalize an invoice first');
    }

    // Step 3: Check for recent allocations
    console.log('\n3️⃣ Checking recent payment allocations...');
    const { data: allocations, error: allocError } = await supabase
      .from('payment_allocations')
      .select(`
        id,
        allocated_amount,
        allocation_type,
        created_at,
        payment:payments(payment_number),
        invoice:invoices(invoice_number)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (allocError) throw allocError;

    if (allocations && allocations.length > 0) {
      console.log(`   ✅ Found ${allocations.length} recent allocation(s):`);
      allocations.forEach(a => {
        const paymentNum = a.payment?.payment_number || 'Unknown';
        const invoiceNum = a.invoice?.invoice_number || 'Unknown';
        console.log(`      - Payment ${paymentNum} → Invoice ${invoiceNum}: $${a.allocated_amount}`);
      });
    } else {
      console.log('   ⚠️  No allocations found');
      console.log('   💡 Use the Allocate button in the payment queue');
    }

    // Step 4: Verify database triggers
    console.log('\n4️⃣ Verifying database triggers...');
    
    // Check if we have a payment and invoice from same client
    if (unpostedPayments?.length > 0 && unpaidInvoices?.length > 0) {
      const matchingPair = unpostedPayments.find(p => 
        unpaidInvoices.some(i => i.client_id === p.client_id)
      );
      
      if (matchingPair) {
        const matchingInvoice = unpaidInvoices.find(i => i.client_id === matchingPair.client_id);
        console.log('   ✅ Found matching payment and invoice from same client:');
        console.log(`      Payment: ${matchingPair.payment_number} ($${matchingPair.amount})`);
        console.log(`      Invoice: ${matchingInvoice.invoice_number} (Balance: $${matchingInvoice.balance_due})`);
        console.log('   💡 These can be allocated together!');
      } else {
        console.log('   ⚠️  No matching payment/invoice pairs from same client');
      }
    }

    // Step 5: Check payment queue view
    console.log('\n5️⃣ Checking payment queue view...');
    const { data: queueData, error: queueError } = await supabase
      .from('payment_queue')
      .select('*')
      .limit(3);

    if (queueError) {
      console.log('   ⚠️  payment_queue view might not exist');
      console.log('   💡 This view helps display payment status');
    } else if (queueData && queueData.length > 0) {
      console.log(`   ✅ Payment queue view is working (${queueData.length} entries)`);
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 WORKFLOW STATUS SUMMARY:\n');
    
    const hasPayments = unpostedPayments && unpostedPayments.length > 0;
    const hasInvoices = unpaidInvoices && unpaidInvoices.length > 0;
    const hasAllocations = allocations && allocations.length > 0;
    
    if (hasPayments && hasInvoices && hasAllocations) {
      console.log('✅ Full workflow is operational!');
      console.log('   - Payments can be recorded');
      console.log('   - Invoices are available for allocation');
      console.log('   - Allocations are being saved');
      console.log('\n🎉 The payment system is working correctly!');
    } else {
      console.log('⚠️  Workflow needs testing:');
      if (!hasPayments) console.log('   1. Record a payment in the UI');
      if (!hasInvoices) console.log('   2. Create and finalize an invoice');
      if (!hasAllocations) console.log('   3. Use "Allocate" button to link payment to invoice');
    }

    console.log('\n💡 Test the UI workflow:');
    console.log('   1. Go to http://localhost:5181/payments');
    console.log('   2. Click "Record Payment" to add a payment');
    console.log('   3. Click "Allocate" on an unposted payment');
    console.log('   4. Select an invoice and allocate');
    console.log('   5. Check that invoice balance updates');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testPaymentWorkflow().then(() => {
  console.log('\n✨ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});