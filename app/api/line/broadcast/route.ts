import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');

export async function POST(req: Request) {
  try {
    const { title, content, imageUrl } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // 1. Fetch LINE Channel Access Token from system_settings or env
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'line_channel_access_token')
      .single();

    const accessToken = settingsData?.setting_value || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!accessToken) {
      console.warn('[LINE Broadcast Warning] No LINE Channel Access Token configured.');
      return NextResponse.json({ error: 'LINE Channel Access Token not configured' }, { status: 400 });
    }

    // 2. Build Flex Message Card
    const flexBodyContents: any[] = [
      {
        type: 'text',
        text: title,
        weight: 'bold',
        size: 'md',
        color: '#111827',
        wrap: true,
      },
      {
        type: 'text',
        text: content,
        size: 'sm',
        color: '#4B5563',
        wrap: true,
        margin: 'md',
      },
    ];

    if (imageUrl && imageUrl.startsWith('http')) {
      flexBodyContents.unshift({
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectMode: 'cover',
        aspectRatio: '20:11',
        margin: 'md',
      });
    }

    const flexMessage = {
      type: 'flex',
      altText: `🚨 ประกาศด่วน: ${title}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚨 ประกาศด่วนจากศูนย์อุ่นใจ (OonJai)',
              weight: 'bold',
              size: 'md',
              color: '#FFFFFF',
            },
          ],
          backgroundColor: '#DC2626',
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: flexBodyContents,
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#FF6600',
              action: {
                type: 'uri',
                label: 'เปิดดูข่าวสารใน OonJai',
                uri: `${BASE_URL}/info`,
              },
            },
          ],
        },
      },
    };

    // 3. Gather target LINE User IDs from line_users and cases tables (same source as LINE Users Log)
    const { data: dbLineUsers } = await supabase.from('line_users').select('line_user_id');
    const { data: caseLineUsers } = await supabase.from('cases').select('reporter_name').like('reporter_name', 'U%');

    const userIdsSet = new Set<string>();
    (dbLineUsers || []).forEach((u: any) => { if (u?.line_user_id) userIdsSet.add(u.line_user_id); });
    (caseLineUsers || []).forEach((c: any) => { if (c?.reporter_name) userIdsSet.add(c.reporter_name); });

    const targetUserIds = Array.from(userIdsSet).filter(id => typeof id === 'string' && id.startsWith('U') && id.length > 10);
    console.log(`[LINE Broadcast] Found ${targetUserIds.length} target LINE user IDs for Multicast.`);

    let multicastSuccess = false;
    let multicastError = null;

    // 4. Send via LINE Multicast API to all known LINE User IDs in batches of 500
    if (targetUserIds.length > 0) {
      try {
        for (let i = 0; i < targetUserIds.length; i += 500) {
          const batch = targetUserIds.slice(i, i + 500);
          const multiRes = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              to: batch,
              messages: [flexMessage],
            }),
          });

          if (multiRes.ok) {
            multicastSuccess = true;
          } else {
            const errText = await multiRes.text();
            console.error('[LINE Multicast Error]', multiRes.status, errText);
            multicastError = errText;
          }
        }
      } catch (err: any) {
        console.error('[LINE Multicast Exception]', err);
        multicastError = err.message;
      }
    }

    // 5. Also send via LINE Broadcast API as fallback
    let broadcastSuccess = false;
    let broadcastError = null;
    try {
      const broadRes = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: [flexMessage],
        }),
      });

      if (broadRes.ok) {
        broadcastSuccess = true;
      } else {
        const errText = await broadRes.text();
        console.error('[LINE Broadcast API Error]', broadRes.status, errText);
        broadcastError = errText;
      }
    } catch (err: any) {
      console.error('[LINE Broadcast Exception]', err);
      broadcastError = err.message;
    }

    if (multicastSuccess || broadcastSuccess) {
      return NextResponse.json({
        success: true,
        message: `ส่งการแจ้งเตือนสำเร็จ (Multicast: ${targetUserIds.length} รายชื่อ, Broadcast: ${broadcastSuccess ? 'สำเร็จ' : 'ไม่สำเร็จ'})`,
        recipientCount: targetUserIds.length
      }, { status: 200 });
    }

    return NextResponse.json({
      error: 'Failed to send LINE notification',
      multicastError,
      broadcastError
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error sending LINE notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
