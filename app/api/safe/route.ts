import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, caseIds, area } = body;

    console.log("🔥 SAFE API RECEIVED:", { phone, caseIds, area });

    // 1. Record the safe report
    if (phone || area) {
      await supabase.from('safe_reports').insert({
        phone: phone || '',
        area: area || '',
        timestamp: new Date().toISOString()
      });
    }

    // Step A: Close by IDs
    if (Array.isArray(caseIds) && caseIds.length > 0) {
      const ids = caseIds.map(id => {
        if (typeof id === 'string' && id.startsWith('CAS-')) {
          return Number(id.replace('CAS-', ''));
        }
        return Number(id);
      }).filter(id => !isNaN(id));

      if (ids.length > 0) {
        await supabase.from('cases').update({
          status: 'ปลอดภัยแล้ว', 
          updated_at: new Date().toISOString()
        }).in('id', ids);
      }
    }

    // Step B: Close by Phone
    if (phone && typeof phone === 'string' && phone.trim() !== '') {
      await supabase.from('cases').update({
        status: 'ปลอดภัยแล้ว',
        updated_at: new Date().toISOString()
      })
      .eq('phone', phone.trim())
      .not('status', 'in', '("completed","cancelled","ปลอดภัยแล้ว")');
    }

    return NextResponse.json({ success: true, message: 'บันทึกข้อมูลสำเร็จ! ระบบได้ทำการอัปเดตสถานะการขอความช่วยเหลือของคุณเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error("Error in Safe API:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
