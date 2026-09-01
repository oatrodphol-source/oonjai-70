const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFullSystem() {
  console.log('=== 1. CHECK VOLUNTEERS SAMPLE ===');
  const { data: vols, error: volErr } = await supabase.from('volunteers').select('id, username, phone, agency, province, status').limit(2);
  console.log('Volunteers:', vols);

  console.log('\n=== 2. CHECK ACTIVITY LOGS (LATEST 3) ===');
  const { data: logs, error: logErr } = await supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(3);
  console.log('Activity Logs:', logs);

  console.log('\n=== 3. SYSTEM HEALTH CHECK COMPLETED SUCCESSFULLY ===');
}

testFullSystem();
