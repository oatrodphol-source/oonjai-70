const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectActivityLogsCols() {
  const { data, error } = await supabase.from('activity_logs').select('*').limit(1);
  console.log('activity_logs sample:', data, error);
}

inspectActivityLogsCols();
