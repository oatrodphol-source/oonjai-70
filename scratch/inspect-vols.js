const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectVolunteers() {
  const { data, error } = await supabase.from('volunteers').select('*').limit(10);
  console.log('Volunteers:', JSON.stringify(data, null, 2));
}

inspectVolunteers();
