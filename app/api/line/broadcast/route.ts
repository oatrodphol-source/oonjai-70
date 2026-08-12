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

    // 3. Call LINE Messaging API Broadcast Endpoint
    const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messages: [flexMessage],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[LINE Broadcast Error]', res.status, errText);
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: 'Broadcast sent successfully to all LINE followers' }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending LINE broadcast:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
