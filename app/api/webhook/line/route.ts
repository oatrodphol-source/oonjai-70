import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

// Helper for website base URL
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');
const REPORT_URL = process.env.NEXT_PUBLIC_LIFF_ID ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}` : `${BASE_URL}/report`;

// Trigger keywords that show the Emergency Flex Card (no DB insert)
const EMERGENCY_TRIGGER_KEYWORDS = ['แจ้งเหตุ', 'sos', 'สวัสดี', 'ช่วยด้วย', 'ขอความช่วยเหลือ', 'ฉุกเฉิน'];

// Calculate Case Severity based on AI Trigger & Triage Rules
function calculateCaseSeverity(waterLevel: string, bedridden: number, elderly: number, peopleCount: number, caseType: string): number {
  let score = 0;
  
  // 1. Water Level Score
  if (waterLevel === 'ท่วมมิดหลังคา') score += 5;
  else if (waterLevel === 'ระดับอก/ท่วมในบ้าน') score += 4;
  else if (waterLevel === 'ระดับเอว') score += 3;
  else if (waterLevel === 'ระดับเข่า') score += 2;
  else if (waterLevel === 'ข้อเท้า/ตาตุ่ม') score += 1;

  // 2. Vulnerability Weight
  if (bedridden === 1) score += 4;
  if (elderly === 1) score += 2;
  if (peopleCount > 5) score += 2;

  // 3. Emergency Type Boost
  if (caseType.includes('หมออาสา') || caseType.includes('ฉุกเฉิน')) score += 3;

  // Map total score to 1-5 Severity level
  if (score >= 8 || bedridden === 1 || waterLevel === 'ท่วมมิดหลังคา') return 5;
  if (score >= 6 || waterLevel === 'ระดับอก/ท่วมในบ้าน') return 4;
  if (score >= 4 || waterLevel === 'ระดับเอว') return 3;
  if (score >= 2 || waterLevel === 'ระดับเข่า') return 2;
  return 1;
}

// Helper: Save LINE User Profile Log
async function saveLineUserLog(userId: string, accessToken: string) {
  try {
    if (!userId || userId === 'Unknown' || !accessToken) return null;
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const profile = await res.json();
      try {
        await supabase.from('line_users').upsert({
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl || null,
          status_message: profile.statusMessage || null,
          last_active_at: new Date().toISOString()
        }, { onConflict: 'line_user_id' });
      } catch (dbErr) {}
      return profile;
    }
  } catch (e) {
    console.error('[LINE Log ERROR]', e);
  }
  return null;
}

// 1. Build Main Emergency Flex Card
function buildEmergencyFlexMessage(lineUserId?: string) {
  const targetUrl = lineUserId ? `${BASE_URL}/?line_uid=${lineUserId}` : `${BASE_URL}/`;
  return {
    type: 'flex',
    altText: 'ศูนย์รับแจ้งเหตุฉุกเฉิน อุ่นใจ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ศูนย์รับแจ้งเหตุฉุกเฉิน อุ่นใจ (OonJai)',
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
        contents: [
          {
            type: 'text',
            text: 'หากต้องการขอความช่วยเหลือผ่านแชท โปรดกดปุ่มตอบคำถามคัดกรองเหตุในแชทด้านล่างนี้',
            wrap: true,
            size: 'sm',
            color: '#374151',
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
            color: '#2563EB',
            action: {
              type: 'message',
              label: 'ตอบคำถามคัดกรองเหตุในแชท',
              text: 'ระบุสถานการณ์',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#FF6600',
            action: {
              type: 'uri',
              label: 'OonJai (เปิดเว็บไซต์หลัก)',
              uri: targetUrl,
            },
          },
        ],
      },
    },
  };
}

// Step 1: Quick Reply for Incident Type
function buildSituationQuickReply() {
  return {
    type: 'text',
    text: '[ขั้นตอนที่ 1/4]\nโปรดเลือกประเภทการขอความช่วยเหลือ:',
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: 'ฉุกเฉิน/หมออาสา', text: 'คัดกรอง:ประเภท:ฉุกเฉิน/ป่วยต้องการหมออาสา' } },
        { type: 'action', action: { type: 'message', label: 'อพยพ/เคลื่อนย้าย', text: 'คัดกรอง:ประเภท:อพยพ/เคลื่อนย้ายออกนอกพื้นที่' } },
        { type: 'action', action: { type: 'message', label: 'ต้องการน้ำ/อาหาร/ยา', text: 'คัดกรอง:ประเภท:ต้องการน้ำ/อาหาร/ยา' } },
        { type: 'action', action: { type: 'message', label: 'เตรียมอพยพ/เฝ้าระวัง', text: 'คัดกรอง:ประเภท:เตรียมอพยพ/เฝ้าระวัง' } },
        { type: 'action', action: { type: 'message', label: 'อพยพสัตว์', text: 'คัดกรอง:ประเภท:อพยพสัตว์' } },
      ],
    },
  };
}

// Step 2: Quick Reply for People Count
function buildPeopleCountQuickReply(caseType: string) {
  return {
    type: 'text',
    text: `บันทึกประเภท: ${caseType}\n\n[ขั้นตอนที่ 2/4]\nโปรดเลือกจำนวนผู้ประสบภัยในจุดเกิดเหตุ:`,
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: '1 คน', text: 'คัดกรอง:จำนวน:1' } },
        { type: 'action', action: { type: 'message', label: '2-4 คน', text: 'คัดกรอง:จำนวน:3' } },
        { type: 'action', action: { type: 'message', label: '5-7 คน', text: 'คัดกรอง:จำนวน:5' } },
        { type: 'action', action: { type: 'message', label: 'มากกว่า 7 คน', text: 'คัดกรอง:จำนวน:8' } },
      ],
    },
  };
}

// Step 3: Quick Reply for Water Level
function buildWaterLevelQuickReply(peopleCount: number) {
  return {
    type: 'text',
    text: `บันทึกจำนวนผู้ประสบภัย: ${peopleCount} คน\n\n[ขั้นตอนที่ 3/4]\nโปรดเลือกระดับน้ำปัจจุบันในพื้นที่:`,
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: 'ข้อเท้า/ตาตุ่ม', text: 'คัดกรอง:ระดับน้ำ:ข้อเท้า/ตาตุ่ม' } },
        { type: 'action', action: { type: 'message', label: 'ระดับเข่า', text: 'คัดกรอง:ระดับน้ำ:ระดับเข่า' } },
        { type: 'action', action: { type: 'message', label: 'ระดับเอว', text: 'คัดกรอง:ระดับน้ำ:ระดับเอว' } },
        { type: 'action', action: { type: 'message', label: 'ระดับอก/ท่วมในบ้าน', text: 'คัดกรอง:ระดับน้ำ:ระดับอก/ท่วมในบ้าน' } },
        { type: 'action', action: { type: 'message', label: 'ท่วมมิดหลังคา', text: 'คัดกรอง:ระดับน้ำ:ท่วมมิดหลังคา' } },
      ],
    },
  };
}

// Step 4: Quick Reply for Vulnerable Groups (AI Triage)
function buildVulnerableQuickReply(waterLevel: string) {
  return {
    type: 'text',
    text: `บันทึกระดับน้ำ: ${waterLevel}\n\n[ขั้นตอนที่ 4/4 - AI Triage]\nมีผู้ป่วยติดเตียง เด็กเล็ก หรือผู้สูงอายุ ในจุดเกิดเหตุหรือไม่:`,
    quickReply: {
      items: [
        { type: 'action', action: { type: 'message', label: 'มีผู้ป่วยติดเตียง', text: 'คัดกรอง:กลุ่มเปราะบาง:ติดเตียง' } },
        { type: 'action', action: { type: 'message', label: 'มีเด็กเล็ก / ผู้สูงอายุ', text: 'คัดกรอง:กลุ่มเปราะบาง:ผู้สูงอายุ' } },
        { type: 'action', action: { type: 'message', label: 'มีติดเตียงและผู้สูงอายุ', text: 'คัดกรอง:กลุ่มเปราะบาง:ทั้งสองกลุ่ม' } },
        { type: 'action', action: { type: 'message', label: 'ไม่มีกลุ่มเปราะบาง', text: 'คัดกรอง:กลุ่มเปราะบาง:ไม่มี' } },
      ],
    },
  };
}

// Step 5: Final Summary Flex Message Card
function buildScreeningSummaryFlexMessage(caseData: any, lineUserId?: string) {
  const caseId = String(caseData.id);
  const targetUrl = lineUserId ? `${BASE_URL}/?line_uid=${lineUserId}` : `${BASE_URL}/`;
  const severityLevel = Number(caseData.severity) || 1;
  const severityText = 
    severityLevel === 5 ? 'ระดับ 5 (วิกฤตด่วนที่สุด)' :
    severityLevel === 4 ? 'ระดับ 4 (เสี่ยงสูง)' :
    severityLevel === 3 ? 'ระดับ 3 (ปานกลาง)' :
    severityLevel === 2 ? 'ระดับ 2 (เฝ้าระวัง)' : 'ระดับ 1 (ปกติ)';

  const vulnerableText = 
    (caseData.bedridden === 1 && caseData.elderly === 1) ? 'มีผู้ป่วยติดเตียง + ผู้สูงอายุ/เด็ก' :
    caseData.bedridden === 1 ? 'มีผู้ป่วยติดเตียง' :
    caseData.elderly === 1 ? 'มีเด็กเล็ก/ผู้สูงอายุ' : 'ไม่มีกลุ่มเปราะบาง';

  return {
    type: 'flex',
    altText: `สรุปการคัดกรองเหตุ เคส #${caseId}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'สรุปข้อมูลคัดกรองเหตุฉุกเฉินสำเร็จ',
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: severityLevel >= 4 ? '#DC2626' : '#EA580C',
        paddingAll: 'md',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: `รหัสอ้างอิงเคส: #${caseId}`,
            weight: 'bold',
            size: 'sm',
            color: '#111827',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              { type: 'text', text: `ผู้แจ้งเหตุ: ${caseData.name || 'ผู้ใช้ LINE'}`, size: 'xs', color: '#111827', weight: 'bold' },
              { type: 'text', text: `ประเภทความช่วยเหลือ: ${caseData.type || '-'}`, size: 'xs', color: '#374151', weight: 'bold' },
              { type: 'text', text: `จำนวนผู้ประสบภัย: ${caseData.people_count || 1} คน`, size: 'xs', color: '#374151' },
              { type: 'text', text: `ระดับน้ำปัจจุบัน: ${caseData.water_level || '-'}`, size: 'xs', color: '#374151' },
              { type: 'text', text: `กลุ่มเปราะบาง: ${vulnerableText}`, size: 'xs', color: '#374151', weight: 'bold' },
              { type: 'text', text: `ประเมินความรุนแรง (AI Triage): ${severityText}`, size: 'xs', color: severityLevel >= 4 ? '#DC2626' : '#EA580C', weight: 'bold' },
            ],
          },
          {
            type: 'text',
            text: 'สำคัญมาก: โปรดกดปุ่ม "แชร์พิกัดตำแหน่ง (GPS)" ด้านล่าง เพื่อส่งตำแหน่งสถานที่เกิดเหตุให้ทีมกู้ภัยเข้าช่วยเหลือตรงจุด',
            size: 'xs',
            color: '#4B5563',
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
            color: '#2563EB',
            action: {
              type: 'uri',
              label: 'แชร์พิกัดตำแหน่ง (GPS)',
              uri: 'line://nv/location',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#FF6600',
            action: {
              type: 'uri',
              label: 'OonJai (เปิดเว็บไซต์หลัก)',
              uri: targetUrl,
            },
          },
        ],
      },
    },
  };
}

// Build Location Success Flex Message Card
function buildLocationSuccessFlexMessage(caseId: string, lineUserId?: string) {
  const trackingUrl = lineUserId ? `${BASE_URL}/tracking/${caseId}?line_uid=${lineUserId}` : `${BASE_URL}/tracking/${caseId}`;
  const homeUrl = lineUserId ? `${BASE_URL}/?line_uid=${lineUserId}` : `${BASE_URL}/`;

  return {
    type: 'flex',
    altText: 'บันทึกพิกัดตำแหน่งเรียบร้อยแล้ว',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'บันทึกพิกัดตำแหน่งสำเร็จ',
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
            text: 'ระบบได้รับพิกัดตำแหน่งของคุณเรียบร้อยแล้ว',
            weight: 'bold',
            size: 'sm',
            color: '#111827',
          },
          {
            type: 'text',
            text: 'เจ้าหน้าที่และทีมกู้ภัยได้รับพิกัดสถานที่ของคุณเรียบร้อยแล้ว กำลังดำเนินการประสานงานให้ความช่วยเหลือ',
            size: 'xs',
            color: '#4B5563',
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
            color: '#10B981',
            action: {
              type: 'uri',
              label: 'ติดตามสถานะการช่วยเหลือ',
              uri: trackingUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#FF6600',
            action: {
              type: 'uri',
              label: 'OonJai',
              uri: homeUrl,
            },
          },
        ],
      },
    },
  };
}

// Helper: send reply to LINE
async function sendLineReply(
  replyToken: string,
  messages: Record<string, unknown>[],
  accessToken: string
) {
  const replyPayload = { replyToken, messages };
  const lineRes = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(replyPayload),
  });

  if (!lineRes.ok) {
    const errorText = await lineRes.text();
    console.error('[LINE Reply ERROR]', lineRes.status, errorText);
  } else {
    console.log('[LINE Reply] Successfully sent reply message.');
  }
}

// Helper: Get Active Pending Case OR Create New Case
async function getOrCreateActiveCase(reporterUserId: string, initialData: Record<string, any> = {}, accessToken: string = '') {
  // Find most recent pending case for this LINE user
  const { data: existingCase } = await supabase
    .from('cases')
    .select('*')
    .eq('reporter_name', reporterUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingCase) {
    return existingCase;
  }

  // Fetch LINE Profile Display Name if available
  let lineDisplayName = 'ผู้ใช้ LINE';
  if (reporterUserId !== 'Unknown' && accessToken) {
    try {
      const profile = await saveLineUserLog(reporterUserId, accessToken);
      if (profile && profile.displayName) {
        lineDisplayName = profile.displayName;
      }
    } catch (e) {}
  }

  // Create new active pending case
  const newCaseData = {
    name: lineDisplayName,
    reporter_name: reporterUserId,
    phone: '-',
    type: initialData.type || 'ฉุกเฉิน/ป่วยต้องการหมออาสา',
    severity: initialData.severity || 3,
    people_count: initialData.people_count || 1,
    water_level: initialData.water_level || '-',
    bedridden: initialData.bedridden || 0,
    elderly: initialData.elderly || 0,
    details: 'แจ้งเหตุผ่าน LINE Official Account',
    status: 'pending',
    created_at: new Date().toISOString(),
    ...initialData
  };

  const { data: inserted, error } = await supabase
    .from('cases')
    .insert([newCaseData])
    .select()
    .single();

  if (error || !inserted) {
    console.error('[DB ERROR] Failed to create active case:', error);
    return null;
  }

  return inserted;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('--------------------------------------------------');
    console.log('1. [LINE Webhook] Received payload:', JSON.stringify(body, null, 2));

    let accessToken = '';
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'line_channel_access_token')
        .single();

      if (settingsData) {
        accessToken = settingsData.setting_value || '';
      }
    } catch (dbError) {
      console.error('2. [DB] Error fetching system settings from Supabase:', dbError);
    }

    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        const reporterUserId = event.source?.userId || 'Unknown';

        // Log LINE User Profile
        if (reporterUserId !== 'Unknown' && accessToken) {
          saveLineUserLog(reporterUserId, accessToken);
        }

        // ==================== FOLLOW / ADD FRIEND EVENT ====================
        if (event.type === 'follow' && event.replyToken && accessToken) {
          await sendLineReply(
            event.replyToken,
            [
              {
                type: 'text',
                text: 'ยินดีต้อนรับสู่ ศูนย์รับแจ้งเหตุฉุกเฉิน อุ่นใจ (OonJai)\n\nหากคุณต้องการขอความช่วยเหลือ โปรดกดปุ่มตอบคำถามคัดกรองเหตุผ่านแชทด้านล่างนี้'
              },
              buildEmergencyFlexMessage(reporterUserId)
            ],
            accessToken
          );
          continue;
        }

        // ==================== MESSAGE EVENT ====================
        if (event.type === 'message' && event.message && event.replyToken && accessToken) {

          // ==================== TEXT MESSAGE ====================
          if (event.message.type === 'text') {
            const text: string = (event.message.text || '').trim();
            const textLower = text.toLowerCase();
            console.log(`4. [Text] User text: "${text}"`);

            // 1. TEST BACKUP COMMAND: "รีเซ็ต" / "reset" / "ทดสอบใหม่"
            if (['รีเซ็ต', 'reset', 'ทดสอบใหม่', 'เริ่มใหม่', 'ยกเลิกเคส'].includes(textLower)) {
              await supabase
                .from('cases')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('reporter_name', reporterUserId)
                .eq('status', 'pending');

              await sendLineReply(
                event.replyToken,
                [{ type: 'text', text: 'เคลียร์สถานะเคสสำหรับการทดสอบเรียบร้อยแล้ว คุณสามารถเริ่มพิมพ์ "แจ้งเหตุ" เพื่อทดสอบสร้างเคสใหม่เสมือนจริงได้ทันทีครับ' }],
                accessToken
              );
              continue;
            }

            // 2. STEP 1 ANSWER: Incident Type ("คัดกรอง:ประเภท:...") -> MUST CHECK BEFORE KEYWORDS!
            if (text.startsWith('คัดกรอง:ประเภท:')) {
              const selectedType = text.replace('คัดกรอง:ประเภท:', '').trim();
              const activeCase = await getOrCreateActiveCase(reporterUserId, { type: selectedType }, accessToken);

              if (activeCase) {
                const updatedSeverity = calculateCaseSeverity(
                  activeCase.water_level || '-',
                  activeCase.bedridden || 0,
                  activeCase.elderly || 0,
                  activeCase.people_count || 1,
                  selectedType
                );

                await supabase.from('cases').update({
                  type: selectedType,
                  severity: updatedSeverity,
                  details: `ประเภท: ${selectedType}`
                }).eq('id', activeCase.id);

                await sendLineReply(
                  event.replyToken,
                  [buildPeopleCountQuickReply(selectedType)],
                  accessToken
                );
              }
              continue;
            }

            // 3. STEP 2 ANSWER: People Count ("คัดกรอง:จำนวน:...")
            if (text.startsWith('คัดกรอง:จำนวน:')) {
              const countVal = parseInt(text.replace('คัดกรอง:จำนวน:', '').trim(), 10) || 1;
              const activeCase = await getOrCreateActiveCase(reporterUserId, { people_count: countVal }, accessToken);

              if (activeCase) {
                const updatedSeverity = calculateCaseSeverity(
                  activeCase.water_level || '-',
                  activeCase.bedridden || 0,
                  activeCase.elderly || 0,
                  countVal,
                  activeCase.type || 'ฉุกเฉิน/ป่วยต้องการหมออาสา'
                );

                await supabase.from('cases').update({
                  people_count: countVal,
                  severity: updatedSeverity
                }).eq('id', activeCase.id);

                await sendLineReply(
                  event.replyToken,
                  [buildWaterLevelQuickReply(countVal)],
                  accessToken
                );
              }
              continue;
            }

            // 4. STEP 3 ANSWER: Water Level ("คัดกรอง:ระดับน้ำ:...")
            if (text.startsWith('คัดกรอง:ระดับน้ำ:')) {
              const waterLevelVal = text.replace('คัดกรอง:ระดับน้ำ:', '').trim();
              const activeCase = await getOrCreateActiveCase(reporterUserId, { water_level: waterLevelVal }, accessToken);

              if (activeCase) {
                const updatedSeverity = calculateCaseSeverity(
                  waterLevelVal,
                  activeCase.bedridden || 0,
                  activeCase.elderly || 0,
                  activeCase.people_count || 1,
                  activeCase.type || 'ฉุกเฉิน/ป่วยต้องการหมออาสา'
                );

                await supabase.from('cases').update({
                  water_level: waterLevelVal,
                  severity: updatedSeverity
                }).eq('id', activeCase.id);

                await sendLineReply(
                  event.replyToken,
                  [buildVulnerableQuickReply(waterLevelVal)],
                  accessToken
                );
              }
              continue;
            }

            // 5. STEP 4 ANSWER: Vulnerable Group / AI Triage ("คัดกรอง:กลุ่มเปราะบาง:...")
            if (text.startsWith('คัดกรอง:กลุ่มเปราะบาง:')) {
              const vulnerableVal = text.replace('คัดกรอง:กลุ่มเปราะบาง:', '').trim();
              let bedridden = 0;
              let elderly = 0;

              if (vulnerableVal === 'ติดเตียง') { bedridden = 1; }
              else if (vulnerableVal === 'ผู้สูงอายุ') { elderly = 1; }
              else if (vulnerableVal === 'ทั้งสองกลุ่ม') { bedridden = 1; elderly = 1; }

              const activeCase = await getOrCreateActiveCase(reporterUserId, { bedridden, elderly }, accessToken);

              if (activeCase) {
                const finalSeverity = calculateCaseSeverity(
                  activeCase.water_level || '-',
                  bedridden,
                  elderly,
                  activeCase.people_count || 1,
                  activeCase.type || 'ฉุกเฉิน/ป่วยต้องการหมออาสา'
                );

                const { data: updatedCase } = await supabase
                  .from('cases')
                  .update({
                    bedridden,
                    elderly,
                    severity: finalSeverity,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', activeCase.id)
                  .select()
                  .single();

                const finalData = updatedCase || { ...activeCase, bedridden, elderly, severity: finalSeverity };

                await sendLineReply(
                  event.replyToken,
                  [buildScreeningSummaryFlexMessage(finalData, reporterUserId)],
                  accessToken
                );
              }
              continue;
            }

            // 6. START SCREENING TRIGGER ("ระบุสถานการณ์") -> Step 1 Quick Reply
            if (textLower === 'ระบุสถานการณ์' || textLower === 'คัดกรอง' || textLower.includes('คัดกรองเหตุ')) {
              await sendLineReply(
                event.replyToken,
                [buildSituationQuickReply()],
                accessToken
              );
              continue;
            }

            // 7. EMERGENCY TRIGGER KEYWORDS -> Main Emergency Flex Card
            const isEmergencyTrigger = EMERGENCY_TRIGGER_KEYWORDS.some(
              keyword => textLower.includes(keyword.toLowerCase())
            );

            if (isEmergencyTrigger) {
              await sendLineReply(
                event.replyToken,
                [buildEmergencyFlexMessage(reporterUserId)],
                accessToken
              );
              continue;
            }

            // 8. Phone Number Input ("0812345678")
            if (/^0\d{9}$/.test(text)) {
              const activeCase = await getOrCreateActiveCase(reporterUserId, { phone: text }, accessToken);
              if (activeCase) {
                await supabase.from('cases').update({ phone: text }).eq('id', activeCase.id);
                await sendLineReply(
                  event.replyToken,
                  [{ type: 'text', text: `บันทึกเบอร์โทรศัพท์ ${text} เรียบร้อยแล้ว` }, buildScreeningSummaryFlexMessage({ ...activeCase, phone: text }, reporterUserId)],
                  accessToken
                );
              }
              continue;
            }

            // 9. Regular text input: Gemini AI Extraction -> Update Active Case
            if (text.length > 3) {
              const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
              let activeCase = await getOrCreateActiveCase(reporterUserId, { details: text }, accessToken);
              let updatedCaseData = activeCase;

              if (geminiApiKey && activeCase) {
                try {
                  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                  const systemPrompt = `You are a disaster relief AI assistant. Extract information from user text into JSON format with keys: "type" (string), "details" (string), "people_count" (integer), "bedridden" (integer 0 or 1), "elderly" (integer 0 or 1), "phone" (string), "water_level" (string), "severity" (integer 1-5). Return ONLY valid JSON.`;

                  let rawText = '';
                  const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'];
                  for (const mName of modelsToTry) {
                    try {
                      const result = await ai.models.generateContent({
                        model: mName,
                        contents: [systemPrompt, text]
                      });
                      if (result.text) {
                        rawText = result.text;
                        break;
                      }
                    } catch (mErr) {}
                  }
                  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

                  try {
                    const parsed = JSON.parse(rawText);
                    const bCount = Number(parsed.bedridden) || activeCase.bedridden || 0;
                    const eCount = Number(parsed.elderly) || activeCase.elderly || 0;
                    const pCount = Number(parsed.people_count) || activeCase.people_count || 1;
                    const wLevel = parsed.water_level || activeCase.water_level || '-';
                    const cType = parsed.type || activeCase.type || 'ฉุกเฉิน/ป่วยต้องการหมออาสา';

                    const calcSeverity = calculateCaseSeverity(wLevel, bCount, eCount, pCount, cType);

                    const { data: dbUpdated } = await supabase.from('cases').update({
                      type: cType,
                      details: `${activeCase.details || ''}\n${parsed.details || text}`.trim(),
                      people_count: pCount,
                      bedridden: bCount,
                      elderly: eCount,
                      water_level: wLevel,
                      severity: calcSeverity,
                      phone: parsed.phone && parsed.phone !== '-' ? parsed.phone : activeCase.phone
                    }).eq('id', activeCase.id).select().single();

                    if (dbUpdated) updatedCaseData = dbUpdated;
                  } catch (e) {
                    console.error('Gemini text parse error:', e);
                  }
                } catch (aiErr) {
                  console.error('Gemini text processing error:', aiErr);
                }
              }

              if (updatedCaseData) {
                await sendLineReply(
                  event.replyToken,
                  [buildScreeningSummaryFlexMessage(updatedCaseData, reporterUserId)],
                  accessToken
                );
              }
              continue;
            }

            // Fallback for short text
            await sendLineReply(
              event.replyToken,
              [buildEmergencyFlexMessage(reporterUserId)],
              accessToken
            );
            continue;
          }

          // ==================== IMAGE MESSAGE ====================
          else if (event.message.type === 'image') {
            console.log(`4. [Image] Received image message ID: ${event.message.id}`);
            const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
            const lineFetchToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || accessToken;
            let activeCase = await getOrCreateActiveCase(reporterUserId, { details: 'ส่งรูปภาพหน้างาน' }, accessToken);
            let updatedCaseData = activeCase;

            if (geminiApiKey && lineFetchToken && activeCase) {
              try {
                const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                  headers: { Authorization: `Bearer ${lineFetchToken}` }
                });

                if (imageRes.ok) {
                  const arrayBuffer = await imageRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  const base64Data = buffer.toString('base64');
                  const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
                  
                  let imageUrl: string | null = null;
                  try {
                    const fileName = `line-img-${event.message.id}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabase
                      .storage
                      .from('images')
                      .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });
                      
                    if (!uploadError && uploadData) {
                      imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
                    }
                  } catch (e) {
                    console.log('[Storage ERROR] Upload error:', e);
                  }

                  let aiExtracted = { risk_level: 3, situation_summary: 'ภาพถ่ายภัยพิบัติ', recommended_action: 'เร่งส่งทีมเข้าตรวจสอบ' };
                  try {
                    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                    const systemPrompt = `You are an expert Disaster Triage AI. Analyze this image and return strictly JSON with keys: "situation_summary" (string in Thai), "recommended_action" (string in Thai), "risk_level" (integer 1-5). Return ONLY valid JSON.`;

                    let rawText = '';
                    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'];
                    for (const mName of modelsToTry) {
                      try {
                        const result = await ai.models.generateContent({
                          model: mName,
                          contents: [
                            systemPrompt,
                            { inlineData: { data: base64Data, mimeType } }
                          ]
                        });
                        if (result.text) {
                          rawText = result.text;
                          break;
                        }
                      } catch (mErr) {}
                    }
                    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    try {
                      aiExtracted = { ...aiExtracted, ...JSON.parse(rawText) };
                    } catch (e) {}
                  } catch (aiErr) {
                    console.error('Gemini image analysis error:', aiErr);
                  }

                  const aiSeverity = Number(aiExtracted.risk_level) || 3;
                  const finalSeverity = Math.max(activeCase.severity || 1, aiSeverity);
                  const updatedDetails = `${activeCase.details || ''}\n[AI Vision (${aiSeverity}/5): ${aiExtracted.situation_summary} | คำแนะนำ: ${aiExtracted.recommended_action}]`.trim();

                  const { data: dbUpdated } = await supabase
                    .from('cases')
                    .update({
                      image_url: imageUrl || activeCase.image_url,
                      details: updatedDetails,
                      severity: finalSeverity,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', activeCase.id)
                    .select()
                    .single();

                  if (dbUpdated) updatedCaseData = dbUpdated;
                }
              } catch (generalError) {
                console.error('Error processing image message:', generalError);
              }
            }

            if (updatedCaseData) {
              await sendLineReply(
                event.replyToken,
                [buildScreeningSummaryFlexMessage(updatedCaseData, reporterUserId)],
                accessToken
              );
            }
            continue;
          }

          // ==================== LOCATION MESSAGE ====================
          else if (event.message.type === 'location') {
            const { latitude, longitude, address } = event.message;
            console.log(`4. [Location] Location: ${latitude}, ${longitude}, address: ${address || 'N/A'}`);

            const activeCase = await getOrCreateActiveCase(reporterUserId, {
              latitude,
              longitude,
              details: `พิกัดจาก LINE: ${address || ''}`
            }, accessToken);

            if (activeCase) {
              const caseId = String(activeCase.id);
              await supabase
                .from('cases')
                .update({
                  latitude,
                  longitude,
                  details: `${activeCase.details || ''}\n[พิกัด GPS: ${address || ''}]`.trim()
                })
                .eq('id', activeCase.id);

              await sendLineReply(
                event.replyToken,
                [buildLocationSuccessFlexMessage(caseId, reporterUserId)],
                accessToken
              );
            }
            continue;
          }
        }
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('CRITICAL Webhook processing error:', error);
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  }
}
