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

    // Provide defaults if table is empty
    if (Object.keys(settings).length === 0) {
      return NextResponse.json({
        line_channel_access_token: '',
        line_channel_secret: '',
        line_auto_reply_template: 'รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย...',
        maintenance_mode: 'false',
        emergency_contact: '1669',
        heatmap_history_days: '7'
      }, { status: 200 });
    }

    return NextResponse.json(settings, { status: 200 });
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
