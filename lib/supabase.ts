import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 ฐานข้อมูลมีปัญหา: ไม่พบ URL หรือ Key ของ Supabase ในไฟล์ .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);