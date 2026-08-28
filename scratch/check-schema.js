const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Check cases table structure
  const { data: cases, error: e1 } = await supabase.from('cases').select('*').limit(2);
  console.log('=== CASES TABLE SAMPLE ===');
  console.log(JSON.stringify(cases, null, 2));
  if (e1) console.log('Error:', e1);

  // Check total count
  const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true });
  console.log('\nTotal cases:', count);
}

checkSchema();
