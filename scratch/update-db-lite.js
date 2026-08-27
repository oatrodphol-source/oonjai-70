const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDb() {
  const { data, error } = await supabase
    .from('ai_settings')
    .update({
      ai_vision_model_name: 'gemini-3.5-flash-lite',
      ai_model_name: 'gemini-3.5-flash-lite',
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  console.log('Update result:', data, error);
}

updateDb();
