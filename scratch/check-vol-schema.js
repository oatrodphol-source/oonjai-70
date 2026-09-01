const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVolunteerSchema() {
  const { data: vols } = await supabase.from('volunteers').select('*').limit(2);
  console.log('VOLUNTEERS SAMPLE:', vols);
  const { data: admins } = await supabase.from('admins').select('*').limit(2);
  console.log('ADMINS SAMPLE:', admins);
}

checkVolunteerSchema();
