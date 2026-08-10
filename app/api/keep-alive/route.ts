import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // ทำการ query เบาๆ เพื่อให้เกิด Database Activity ป้องกัน Supabase Free Plan ถูก Pause
    const { data, error } = await supabase.from('admins').select('id').limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { 
        status: 'ok', 
        message: 'Supabase is awake', 
        timestamp: new Date().toISOString() 
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: `Keep-alive failed: ${error.message}` 
      }, 
      { status: 500 }
    );
  }
}
// เพิ่มฟังก์ชันนี้เพื่อรับแขกจาก UptimeRobot แบบฟรี (HEAD request)
export async function HEAD() {
  return GET(); 
}