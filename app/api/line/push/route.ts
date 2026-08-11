import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');

export async function POST(req: Request) {
  try {
    const { caseId, status, volunteerName, volunteerPhone, volunteerUnit } = await req.json();

    if (!caseId || !status) {
      return NextResponse.json({ error: 'caseId and status are required' }, { status: 400 });
    }

    // 1. Fetch case to get reporter_name (LINE User ID)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', Number(caseId))
      .single();

    if (caseError || !caseData || !caseData.reporter_name || !caseData.reporter_name.startsWith('U')) {
      return NextResponse.json({ message: 'No valid LINE User ID for this case' }, { status: 200 });
    }

    const lineUserId = caseData.reporter_name;

    // 2. Fetch LINE Channel Access Token
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'line_channel_access_token')
      .single();

    const accessToken = settingsData?.setting_value || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!accessToken) {
      return NextResponse.json({ error: 'LINE Channel Access Token not configured' }, { status: 400 });
    }

    // 3. Build Push Message Flex Card based on Status
    let flexMessage: any = null;

    if (status === 'in_progress' || status === 'กำลังช่วยเหลือ' || status === 'accepted') {
      flexMessage = {
        type: 'flex',
        altText: `แจ้งเตือนสถานะ: ทีมกู้ภัยกำลังเดินทางช่วยเหลือเคส #${caseId}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'อัปเดตสถานะ: เจ้าหน้าที่กำลังเดินทาง',
                weight: 'bold',
                size: 'md',
                color: '#FFFFFF',
              },
            ],
            backgroundColor: '#2563EB',
            paddingAll: 'md',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `รหัสเคส: #${caseId}`,
                weight: 'bold',
                size: 'sm',
                color: '#111827',
              },
              {
                type: 'text',
                text: `ผู้รับผิดชอบ: ${volunteerName || caseData.assigned_volunteer_name || 'เจ้าหน้าที่ทีมกู้ภัย'}`,
                size: 'xs',
                color: '#374151',
                weight: 'bold',
              },
              {
                type: 'text',
                text: `หน่วยงาน: ${volunteerUnit || caseData.assigned_volunteer_unit || 'ศูนย์กู้ภัยฉุกเฉิน'}`,
                size: 'xs',
                color: '#4B5563',
              },
              {
                type: 'text',
                text: `เบอร์ติดต่อเจ้าหน้าที่: ${volunteerPhone || caseData.assigned_volunteer_phone || caseData.phone || 'ไม่ระบุ'}`,
                size: 'xs',
                color: '#2563EB',
                weight: 'bold',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#059669',
                action: {
                  type: 'uri',
                  label: 'ติดตามสถานะการช่วยเหลือ',
                  uri: `${BASE_URL}/tracking/${caseId}`,
                },
              },
              {
                type: 'button',
                style: 'secondary',
                color: '#FF6600',
                action: {
                  type: 'uri',
                  label: 'OonJai',
                  uri: `${BASE_URL}/`,
                },
              },
            ],
          },
        },
      };
    } else if (status === 'resolved' || status === 'เสร็จสิ้นแล้ว' || status === 'completed') {
      flexMessage = {
        type: 'flex',
        altText: `แจ้งเตือนสถานะ: การช่วยเหลือเคส #${caseId} สำเร็จแล้ว`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'การช่วยเหลือดำเนินการสำเร็จเรียบร้อย',
                weight: 'bold',
                size: 'md',
                color: '#FFFFFF',
              },
            ],
            backgroundColor: '#10B981',
            paddingAll: 'md',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `รหัสเคส: #${caseId}`,
                weight: 'bold',
                size: 'sm',
                color: '#111827',
              },
              {
                type: 'text',
                text: 'ทีมเจ้าหน้าที่และอาสาสมัครได้ดำเนินการช่วยเหลือเสร็จสิ้นแล้ว ขอบคุณที่ไว้วางใจให้ศูนย์อุ่นใจดูแลคุณ',
                size: 'xs',
                color: '#4B5563',
                wrap: true,
              },
              {
                type: 'text',
                text: 'โปรดร่วมประเมินความพึงพอใจและให้คะแนนการปฏิบัติงานของทีมกู้ภัย',
                size: 'xs',
                color: '#D97706',
                weight: 'bold',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#D97706',
                action: {
                  type: 'uri',
                  label: 'ประเมินและให้คะแนนอาสาสมัคร',
                  uri: `${BASE_URL}/tracking/${caseId}`,
                },
              },
              {
                type: 'button',
                style: 'secondary',
                color: '#FF6600',
                action: {
                  type: 'uri',
                  label: 'OonJai',
                  uri: `${BASE_URL}/`,
                },
              },
            ],
          },
        },
      };
    }

    if (!flexMessage) {
      return NextResponse.json({ message: 'No message template for this status' }, { status: 200 });
    }

    // 4. Send LINE Push Message
    const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage],
      }),
    });

    if (!pushRes.ok) {
      const errText = await pushRes.text();
      console.error('[LINE Push Error]', pushRes.status, errText);
      return NextResponse.json({ error: errText }, { status: pushRes.status });
    }

    return NextResponse.json({ success: true, message: 'Push notification sent' }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending LINE push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
