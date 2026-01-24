require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  // Try to get table structure by selecting from it
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .limit(0);
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Table structure check completed');
    console.log('If you see column errors, the table schema may not match.');
  }
}

checkSchema();
