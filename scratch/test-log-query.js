const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testActivityLogQuery() {
  console.log('Testing activity_logs select for /users page:');
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
  } else {
    console.log(`Fetched ${data.length} logs successfully:`);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
}

testActivityLogQuery();
