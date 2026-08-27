import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await req.json();
    const { id } = await params;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Map frontend status string back to DB enum if needed
    let dbStatus = status;
    if (status === 'รอการช่วยเหลือ') dbStatus = 'wait';
    if (status === 'รับเรื่องแล้ว') dbStatus = 'accepted';
    if (status === 'กำลังช่วยเหลือ') dbStatus = 'in_progress';
    if (status === 'เสร็จสิ้น') dbStatus = 'completed';
    if (status === 'ยกเลิก') dbStatus = 'cancelled';

    let caseId = id;
    if (id.startsWith('CAS-')) {
      caseId = id.replace('CAS-', '');
    }

    const { data, error } = await supabase
      .from('cases')
      .update({ status: dbStatus })
      .eq('id', Number(caseId))
      .select();

    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Auto-trigger LINE Push notification to reporter if status is in_progress or accepted
    if (['in_progress', 'accepted', 'completed', 'cancelled'].includes(dbStatus)) {
      try {
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        fetch(`${protocol}://${host}/api/line/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: caseId,
            status: dbStatus,
            volunteerName: data[0]?.volunteer_name || data[0]?.assigned_volunteer_name,
            volunteerPhone: data[0]?.assigned_volunteer_phone || data[0]?.rescuer_phone,
            volunteerUnit: data[0]?.assigned_volunteer_unit
          })
        }).catch(err => console.error("Line push trigger error:", err));
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: 'Status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update case status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
