const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRpc() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS email text;' });
  console.log('RPC exec_sql result:', data, error);
}

testRpc();
