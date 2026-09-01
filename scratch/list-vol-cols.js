const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectVolunteers() {
  const { data } = await supabase.from('volunteers').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columns in volunteers table:', Object.keys(data[0]));
  }
}

inspectVolunteers();
