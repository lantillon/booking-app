// Quick test script to check Supabase connection
// Run with: node test-supabase.js

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not found!');
  console.log('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✓ Environment variables found');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\nTesting Supabase connection...\n');
    
    // Test 1: Check if services table exists
    console.log('1. Checking if "services" table exists...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1);
    
    if (servicesError) {
      if (servicesError.code === 'PGRST116' || servicesError.message.includes('relation') || servicesError.message.includes('does not exist')) {
        console.error('❌ "services" table does not exist!');
        console.error('\n⚠️  You need to run the SQL schema in Supabase:');
        console.error('   1. Go to your Supabase project');
        console.error('   2. Open SQL Editor');
        console.error('   3. Copy/paste the contents of supabase-schema.sql');
        console.error('   4. Click Run\n');
        process.exit(1);
      } else {
        console.error('❌ Error:', servicesError.message);
        process.exit(1);
      }
    } else {
      console.log('✓ "services" table exists');
      console.log(`  Found ${services?.length || 0} services`);
    }
    
    // Test 2: Try to insert a test record (then delete it)
    console.log('\n2. Testing write access...');
    const testId = 'test-' + Date.now();
    const { error: insertError } = await supabase
      .from('services')
      .insert({
        id: testId,
        name: 'Test Service',
        description: 'Test',
        duration: 30,
        price: 10.00
      });
    
    if (insertError) {
      console.error('❌ Cannot insert into services table:', insertError.message);
      if (insertError.message.includes('permission') || insertError.message.includes('policy')) {
        console.error('\n⚠️  Row Level Security (RLS) policy issue!');
        console.error('   Check that the SQL schema policies were created correctly.\n');
      }
      process.exit(1);
    }
    
    console.log('✓ Write access works');
    
    // Clean up test record
    await supabase.from('services').delete().eq('id', testId);
    console.log('✓ Test record cleaned up');
    
    console.log('\n✅ All tests passed! Supabase is configured correctly.\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testConnection();


