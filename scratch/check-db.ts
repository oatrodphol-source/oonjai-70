import { supabase } from '../lib/supabase';

async function checkDb() {
  const { data, error } = await supabase.from('ai_settings').select('*');
  console.log('ai_settings in DB:', data, error);
}

checkDb();
