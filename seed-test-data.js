/**
 * Seed test data for payment workflow testing
 * Creates: Organization, Client, Invoice with items
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTestData() {
  console.log('🌱 Seeding test data for payment workflow...\n');
  
  try {
    // First, sign in as test user
    console.log('0️⃣ Signing in as test user...');
    const testEmail = 'test.payment@pbslabs.org';
    const testPassword = 'TestPayment123!';
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (authError) {
      console.log('   Could not sign in, trying to create test user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        console.error('   ❌ Could not create test user:', signUpError.message);
        console.log('\n💡 Please sign up or sign in through the UI first:');
        console.log('   1. Go to http://localhost:5181');
        console.log(`   2. Sign up with email: ${testEmail}`);
        console.log('   3. Then run this script again');
        process.exit(1);
      }
      
      console.log('   ✅ Created test user');
      authData = signUpData;
    } else {
      console.log('   ✅ Signed in as:', authData.user.email);
    }
    // Step 1: Create organization
    console.log('1️⃣ Creating test organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Lab Billing Company',
        type: 'billing_company'
      })
      .select()
      .single();
    
    if (orgError) {
      // Try to fetch existing
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', 'Test Lab Billing Company')
        .single();
      
      if (existingOrg) {
        console.log('   Using existing organization:', existingOrg.name);
        org = existingOrg;
      } else {
        throw orgError;
      }
    } else {
      console.log('   ✅ Created organization:', org.name);
    }
    
    // Step 2: Create laboratory
    console.log('\n2️⃣ Creating test laboratory...');
    const { data: lab, error: labError } = await supabase
      .from('laboratories')
      .insert({
        organization_id: org.id,
        name: 'Quest Diagnostics Test Lab',
        code: 'QUEST',
        is_active: true
      })
      .select()
      .single();
    
    if (labError) {
      // Try to fetch existing
      const { data: existingLab } = await supabase
        .from('laboratories')
        .select('*')
        .eq('organization_id', org.id)
        .eq('name', 'Quest Diagnostics Test Lab')
        .single();
      
      if (existingLab) {
        console.log('   Using existing laboratory:', existingLab.name);
        lab = existingLab;
      } else {
        // Labs might not be required, continue without
        console.log('   ⚠️  Could not create lab (might not be required)');
      }
    } else {
      console.log('   ✅ Created laboratory:', lab.name);
    }
    
    // Step 3: Create client
    console.log('\n3️⃣ Creating test client...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: org.id,
        laboratory_id: lab?.id || null,
        name: 'Test Medical Clinic',
        code: 'TMC001',
        is_active: true,
        payment_terms: 30,
        billing_address: '123 Test Street',
        billing_city: 'Test City',
        billing_state: 'TX',
        billing_zip: '12345'
      })
      .select()
      .single();
    
    if (clientError) {
      // Try to fetch existing
      const { data: existingClient } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', org.id)
        .eq('name', 'Test Medical Clinic')
        .single();
      
      if (existingClient) {
        console.log('   Using existing client:', existingClient.name);
        client = existingClient;
      } else {
        throw clientError;
      }
    } else {
      console.log('   ✅ Created client:', client.name);
    }
    
    // Step 4: Create CPT codes if they don't exist
    console.log('\n4️⃣ Creating test CPT codes...');
    const cptCodes = [
      { code: '80061', description: 'Lipid Panel', default_price: 45.00 },
      { code: '85025', description: 'Complete Blood Count', default_price: 35.00 },
      { code: '83036', description: 'Hemoglobin A1C', default_price: 40.00 }
    ];
    
    for (const cpt of cptCodes) {
      const { error: cptError } = await supabase
        .from('cpt_codes')
        .insert({
          organization_id: org.id,
          ...cpt
        });
      
      if (!cptError) {
        console.log(`   ✅ Created CPT code: ${cpt.code}`);
      }
    }
    
    // Step 5: Create an invoice
    console.log('\n5️⃣ Creating test invoice...');
    const invoiceNumber = `INV-${Date.now()}`;
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: org.id,
        client_id: client.id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'sent', // Make it ready for payment
        payment_status: 'unpaid',
        subtotal: 120.00,
        total_amount: 120.00,
        balance_due: 120.00,
        amount_paid: 0
      })
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    console.log('   ✅ Created invoice:', invoice.invoice_number);
    
    // Step 6: Add line items to invoice
    console.log('\n6️⃣ Adding line items to invoice...');
    const lineItems = [
      { 
        invoice_id: invoice.id,
        organization_id: org.id,
        description: 'Lipid Panel',
        cpt_code: '80061',
        quantity: 1,
        unit_price: 45.00,
        amount: 45.00
      },
      {
        invoice_id: invoice.id,
        organization_id: org.id,
        description: 'Complete Blood Count',
        cpt_code: '85025',
        quantity: 1,
        unit_price: 35.00,
        amount: 35.00
      },
      {
        invoice_id: invoice.id,
        organization_id: org.id,
        description: 'Hemoglobin A1C',
        cpt_code: '83036',
        quantity: 1,
        unit_price: 40.00,
        amount: 40.00
      }
    ];
    
    const { error: itemError } = await supabase
      .from('invoice_line_items')
      .insert(lineItems);
    
    if (itemError) {
      console.log('   ⚠️  Could not add line items (might not be required)');
    } else {
      console.log('   ✅ Added 3 line items to invoice');
    }
    
    // Summary
    console.log('\n========================================');
    console.log('✅ TEST DATA CREATED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   Organization: ${org.name} (ID: ${org.id})`);
    console.log(`   Client: ${client.name} (ID: ${client.id})`);
    console.log(`   Invoice: ${invoice.invoice_number}`);
    console.log(`   Amount Due: $${invoice.balance_due}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to http://localhost:5181/payments');
    console.log('2. Click "Record Payment"');
    console.log(`3. Select client: ${client.name}`);
    console.log('4. Enter amount: $120.00 (or partial amount)');
    console.log('5. Save the payment');
    console.log('6. Click "Allocate" on the payment');
    console.log(`7. Select invoice: ${invoice.invoice_number}`);
    console.log('8. Complete allocation');
    
    console.log('\n✨ Ready to test the payment workflow!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the seeder
seedTestData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});