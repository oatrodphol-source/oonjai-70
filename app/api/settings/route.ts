import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) {
      throw error;
    }

    const settings: Record<string, string> = {};
    if (rows && rows.length > 0) {
      for (const row of rows) {
        settings[row.setting_key] = row.setting_value;
      }
    }

    const defaultSettings: Record<string, string> = {
      system_title: 'ศูนย์บรรเทาสาธารณภัย อุ่นใจ (OonJai)',
      agency_name: 'ศูนย์กู้ภัยฉุกเฉินส่วนกลาง',
      maintenance_mode: 'false',
      show_announcement: 'false',
      announcement_banner: 'ประกาศ: ทีมกู้ภัยกำลังเร่งเข้าช่วยเหลือในพื้นที่เสี่ยง โปรดติดตามข้อมูลอย่างใกล้ชิด',
      emergency_contact: '1669',
      volunteer_contact: '02-123-4567',
      default_lat: '18.7883',
      default_lng: '98.9853',
      heatmap_history_days: '7',
      proximity_radius_meters: '500',
      max_cases_per_volunteer: '3'
    };

    return NextResponse.json({ ...defaultSettings, ...settings }, { status: 200 });
  } catch (error) {
    console.error('Fetch system settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate body
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Upsert each setting
    const updates = [];
    for (const [key, value] of Object.entries(body)) {
      updates.push({
        setting_key: key,
        setting_value: value !== null && value !== undefined ? String(value) : null
      });
    }

    if (updates.length > 0) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update system settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
