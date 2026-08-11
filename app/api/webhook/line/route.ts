import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

// Helper for website base URL
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');
const REPORT_URL = process.env.NEXT_PUBLIC_LIFF_ID ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}` : `${BASE_URL}/report`;

// Trigger keywords that show the Emergency Flex Card (no DB insert)
const EMERGENCY_TRIGGER_KEYWORDS = ['แจ้งเหตุ', 'sos', 'สวัสดี', 'ช่วยด้วย', 'ขอความช่วยเหลือ', 'ฉุกเฉิน'];

// 1. Build the Main Emergency Assistance Flex Message Card
function buildEmergencyFlexMessage() {
  return {
    type: 'flex',
    altText: '🚨 ศูนย์รับแจ้งเหตุฉุกเฉิน อุ่นใจ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚨 ศูนย์รับแจ้งเหตุฉุกเฉิน อุ่นใจ',
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: '#EF4444',
        paddingAll: 'md',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'หากคุณต้องการความช่วยเหลือด่วน โปรดเลือกทำรายการด้านล่างนี้ทันที',
            wrap: true,
            size: 'sm',
            color: '#4B5563',
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
              label: '📍 แจ้งเหตุฉุกเฉิน (SOS)',
              uri: 'line://nv/location',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: '📝 แจ้งความช่วยเหลือ',
              uri: REPORT_URL,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#f68133ff',
            action: {
              type: 'uri',
              label: '🌐 OonJai',
              uri: `${BASE_URL}/`,
            },
          },
        ],
      },
    },
  };
}

// 2. Build Case Registered Confirmation Flex Message Card (Replaces old text "รับเรื่องแล้ว...")
function buildCaseRegisteredFlexMessage(caseId?: string, titleText: string = 'บันทึกการแจ้งเหตุเรียบร้อยแล้ว') {
  const footerContents: any[] = [
    {
      type: 'button',
      style: 'primary',
      color: '#2563EB',
      action: {
        type: 'uri',
        label: '📍 แชร์พิกัดตำแหน่ง (GPS)',
        uri: 'line://nv/location',
      },
    },
    {
      type: 'button',
      style: 'secondary',
      action: {
        type: 'uri',
        label: '📝 กรอกฟอร์มคัดกรองเพิ่มเติม',
        uri: REPORT_URL,
      },
    },
  ];

  if (caseId) {
    footerContents.push({
      type: 'button',
      style: 'secondary',
      color: '#059669',
      action: {
        type: 'uri',
        label: '📌 ติดตามสถานะการช่วยเหลือ',
        uri: `${BASE_URL}/tracking/${caseId}`,
      },
    });
  }

  footerContents.push({
    type: 'button',
    style: 'secondary',
    color: '#FF6600',
    action: {
      type: 'uri',
      label: '🌐 OonJai',
      uri: `${BASE_URL}/`,
    },
  });

  return {
    type: 'flex',
    altText: `✅ ${titleText}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `✅ ${titleText}`,
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
            text: 'ระบบรับเรื่องเข้าสู่ฐานข้อมูลกู้ภัยเรียบร้อยแล้ว',
            weight: 'bold',
            size: 'sm',
            color: '#111827',
            wrap: true,
          },
          {
            type: 'text',
            text: 'โปรดกดปุ่ม "📍 แชร์พิกัดตำแหน่ง (GPS)" ด้านล่างเพื่อให้เจ้าหน้าที่เข้าช่วยเหลือได้ตรงจุด',
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
        contents: footerContents,
      },
    },
  };
}

// 3. Build Location Success Flex Message Card
function buildLocationSuccessFlexMessage(caseId: string) {
  return {
    type: 'flex',
    altText: '📍 บันทึกพิกัดตำแหน่งสำเร็จ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📍 บันทึกพิกัดตำแหน่งสำเร็จ',
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
            text: 'ได้รับพิกัดตำแหน่งของคุณเรียบร้อยแล้ว!',
            weight: 'bold',
            size: 'sm',
            color: '#111827',
          },
          {
            type: 'text',
            text: 'เจ้าหน้าที่และทีมกู้ภัยได้รับตำแหน่งที่แน่ชัดของคุณเรียบร้อยแล้ว กำลังดำเนินการประสานงานครับ',
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
              label: '📌 ติดตามสถานะการช่วยเหลือ',
              uri: `${BASE_URL}/tracking/${caseId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#FF6600',
            action: {
              type: 'uri',
              label: '🌐 OonJai',
              uri: `${BASE_URL}/`,
            },
          },
        ],
      },
    },
  };
}

// Quick Reply items for situation selection
function buildSituationQuickReply() {
  return {
    type: 'text',
    text: 'กรุณาเลือกสถานการณ์ที่คุณต้องการความช่วยเหลือ:',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🌊 น้ำท่วม/อพยพ',
            text: 'ขอความช่วยเหลือ: น้ำท่วม/อพยพ',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🍱 ขอเสบียง/น้ำดื่ม',
            text: 'ขอความช่วยเหลือ: ขอเสบียง/น้ำดื่ม',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '🏥 ผู้ป่วยฉุกเฉิน',
            text: 'ขอความช่วยเหลือ: ผู้ป่วยฉุกเฉิน',
          },
        },
      ],
    },
  };
}

// Helper: send reply to LINE (supports both text and flex messages)
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('--------------------------------------------------');
    console.log('1. [LINE Webhook] Received payload:', JSON.stringify(body, null, 2));

    // Fetch LINE settings from Supabase (for access token)
    let accessToken = '';
    try {
      console.log('2. [DB] Fetching LINE Settings from system_settings...');
      const { data: settingsData, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'line_channel_access_token');

      if (!error && settingsData && settingsData.length > 0) {
        accessToken = settingsData[0]?.setting_value || '';
        console.log('2. [DB] Successfully fetched LINE Settings');
      } else {
        console.error('2. [DB] Failed or empty setting for LINE Settings:', error);
      }
    } catch (dbError) {
      console.error('2. [DB] Error fetching system settings from Supabase:', dbError);
    }

    // Loop through the events sent by LINE
    if (body.events && Array.isArray(body.events)) {
      for (const event of body.events) {
        console.log(`3. [Event] Processing event type: ${event.type}, message type: ${event.message?.type}`);
        
        if (event.type === 'message' && event.message && event.replyToken && accessToken) {
          const reporterUserId = event.source?.userId || 'Unknown';

          // ==================== TEXT MESSAGE ====================
          if (event.message.type === 'text') {
            const text: string = (event.message.text || '').trim();
            const textLower = text.toLowerCase();
            console.log(`4. [Text] User text: "${text}"`);

            // --- Check if it's an emergency trigger keyword -> Flex Card (no DB insert) ---
            const isEmergencyTrigger = EMERGENCY_TRIGGER_KEYWORDS.some(
              keyword => textLower.includes(keyword.toLowerCase())
            );

            if (isEmergencyTrigger) {
              console.log('4. [Text] Emergency trigger detected. Sending Flex Message Card.');
              await sendLineReply(
                event.replyToken,
                [buildEmergencyFlexMessage()],
                accessToken
              );
              continue;
            }

            // --- Check if user selected "ระบุสถานการณ์" -> Quick Reply ---
            if (textLower === 'ระบุสถานการณ์') {
              console.log('4. [Text] Situation flow triggered. Sending Quick Reply.');
              await sendLineReply(
                event.replyToken,
                [buildSituationQuickReply()],
                accessToken
              );
              continue;
            }

            // --- Check if it's a Quick Reply selection ("ขอความช่วยเหลือ:...") ---
            if (text.startsWith('ขอความช่วยเหลือ:')) {
              const situationType = text.replace('ขอความช่วยเหลือ:', '').trim();
              console.log(`4. [Text] Quick Reply selection: "${situationType}"`);

              let caseType = 'SOS ด่วน';
              let severity = 3;
              if (situationType.includes('น้ำท่วม') || situationType.includes('อพยพ')) {
                caseType = 'อพยพ/เคลื่อนย้ายออกนอกพื้นที่';
                severity = 4;
              } else if (situationType.includes('เสบียง') || situationType.includes('น้ำดื่ม')) {
                caseType = 'ต้องการน้ำ/อาหาร/ยา';
                severity = 3;
              } else if (situationType.includes('ผู้ป่วย') || situationType.includes('ฉุกเฉิน')) {
                caseType = 'ฉุกเฉิน/ป่วยต้องการหมออาสา';
                severity = 5;
              }

              let activeCaseId: string | undefined = undefined;

              // Try to update the most recent pending case for this user
              const { data: existingCase } = await supabase
                .from('cases')
                .select('id')
                .eq('reporter_name', reporterUserId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (existingCase) {
                activeCaseId = String(existingCase.id);
                const { error: updateError } = await supabase
                  .from('cases')
                  .update({
                    type: caseType,
                    severity,
                    details: `สถานการณ์: ${situationType}`,
                  })
                  .eq('id', existingCase.id);

                if (updateError) {
                  console.error('[DB ERROR] Failed to update situation for case:', updateError);
                } else {
                  console.log(`[DB SUCCESS] Updated situation for case ID: ${existingCase.id}`);
                }
              } else {
                // No existing case — insert a new one
                const { data: insertedData, error: insertError } = await supabase
                  .from('cases')
                  .insert([{
                    name: 'SOS User (LINE)',
                    reporter_name: reporterUserId,
                    phone: '-',
                    type: caseType,
                    severity,
                    people_count: 1,
                    water_level: '-',
                    bedridden: 0,
                    elderly: 0,
                    details: `สถานการณ์: ${situationType} (ยังไม่ได้แชร์พิกัด)`,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                  }])
                  .select();

                if (insertError) {
                  console.error('[DB ERROR] Failed to insert situation case:', insertError);
                } else if (insertedData && insertedData[0]) {
                  activeCaseId = String(insertedData[0].id);
                  console.log('[DB SUCCESS] Inserted new situation case.');
                }
              }

              // Send Flex Message Card confirmation
              await sendLineReply(
                event.replyToken,
                [buildCaseRegisteredFlexMessage(activeCaseId, `รับแจ้ง "${situationType}" เรียบร้อยแล้ว`)],
                accessToken
              );
              continue;
            }

            // --- Regular long text: AI extraction & insert -> Flex Message Reply ---
            if (text.length > 5) {
              const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
              let registeredCaseId: string | undefined = undefined;
              let isSuccess = false;

              if (geminiApiKey) {
                let extractedData = { type: 'SOS ด่วน', details: text, people_count: 1, bedridden: 0, elderly: 0, phone: '-', severity: 1 };
                try {
                  console.log('5. [Gemini] Sending text to Gemini...');
                  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                  const systemPrompt = `You are a disaster relief assistant. Extract data from the text into strictly JSON format with exactly these keys: "type" (string), "details" (string), "people_count" (integer), "bedridden" (integer, 0 if none), "elderly" (integer, 0 if none), "phone" (string), "severity" (integer 1-5). Respond ONLY with JSON.`;
                  
                  const result = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [systemPrompt, text]
                  });

                  let rawText = result.text || '{}';
                  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                  console.log('6. [Gemini] Raw AI Response after clean:', rawText);
                  
                  try {
                    const parsedData = JSON.parse(rawText);
                    extractedData = { ...extractedData, ...parsedData };
                  } catch (parseErr) {
                    console.error('6. [JSON ERROR] Failed to parse text AI response:', parseErr);
                  }
                } catch (aiError) {
                  console.error('5. [Gemini ERROR] Error during text processing:', aiError);
                }

                const bedriddenCount = Number(extractedData.bedridden) || 0;
                const elderlyCount = Number(extractedData.elderly) || 0;
                const peopleCount = Number(extractedData.people_count) || 1;
                let severity = Number(extractedData.severity) || 1;
                
                if (bedriddenCount > 0) severity = 5;
                else if (elderlyCount > 0) severity = Math.max(severity, 4);
                else if (peopleCount > 5) severity = Math.max(severity, 3);
                
                console.log(`7. [DB] Preparing to insert text case. Severity: ${severity}`);
                const insertData = {
                  name: 'ไม่ระบุชื่อ (แจ้งผ่านข้อความ LINE)',
                  reporter_name: reporterUserId,
                  phone: extractedData.phone || '-',
                  type: extractedData.type || 'SOS ด่วน',
                  severity,
                  people_count: peopleCount,
                  water_level: '-',
                  bedridden: bedriddenCount > 0 ? 1 : 0,
                  elderly: elderlyCount > 0 ? 1 : 0,
                  details: extractedData.details || text,
                  status: 'pending',
                  created_at: new Date().toISOString()
                };

                const { data, error: insertError } = await supabase.from('cases').insert([insertData]).select();
                if (insertError) {
                  console.error('8. [DB ERROR] Failed to insert text case into Supabase:', insertError);
                } else if (data && data[0]) {
                  registeredCaseId = String(data[0].id);
                  isSuccess = true;
                  console.log('8. [DB SUCCESS] Successfully inserted text case. ID:', registeredCaseId);
                }
              }

              // Reply with Flex Message Card (NOT plain text!)
              await sendLineReply(
                event.replyToken,
                [isSuccess ? buildCaseRegisteredFlexMessage(registeredCaseId) : buildEmergencyFlexMessage()],
                accessToken
              );
              continue;
            }

            // --- Fallback for short non-trigger text -> Flex Message Card ---
            console.log('4. [Text] Message too short. Sending Flex Message Card.');
            await sendLineReply(
              event.replyToken,
              [buildEmergencyFlexMessage()],
              accessToken
            );
            continue;
          }

          // ==================== IMAGE MESSAGE ====================
          else if (event.message.type === 'image') {
            console.log(`4. [Image] Received image message ID: ${event.message.id}`);
            const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
            const lineFetchToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            let registeredCaseId: string | undefined = undefined;
            let isSuccess = false;
            
            if (geminiApiKey && lineFetchToken) {
              try {
                console.log('5. [LINE] Downloading Image from api-data.line.me...');
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
                    console.log('6. [Storage ERROR] Skipping Supabase storage upload error.', e);
                  }

                  let extractedData = { type: 'SOS ด่วน', details: 'ส่งรูปภาพแจ้งเหตุ', people_count: 1, bedridden: 0, elderly: 0, phone: '-', severity: 1, situation_summary: '', recommended_action: '' };
                  
                  try {
                    // Fetch dynamic AI Settings
                    let triageWeights = { waterLevelHigh: 5, bedridden: 4, elderly: 2, peopleCountMany: 5, severityFactor: 2 };
                    try {
                      const { data: rows } = await supabase.from('ai_settings').select('*').eq('id', 1).limit(1);
                      if (rows && rows.length > 0) triageWeights = { ...triageWeights, ...rows[0] };
                    } catch (e) {}

                    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                    const systemPrompt = `You are an expert Disaster Triage AI. Analyze the image and return strictly valid JSON with these keys:
"type" (string), "details" (string, short description of flood/disaster situation), "people_count" (integer), "bedridden" (integer, 0 or 1), "elderly" (integer, 0 or 1), "phone" (string), "severity" (integer 1-5 calculated from flood depth and vulnerable people), "situation_summary" (string in Thai), "recommended_action" (string in Thai). Return ONLY JSON.`;
                    
                    const result = await ai.models.generateContent({
                      model: 'gemini-flash-latest',
                      contents: [
                        systemPrompt,
                        { inlineData: { data: base64Data, mimeType } }
                      ]
                    });

                    let rawText = result.text || '{}';
                    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    
                    try {
                      const parsedData = JSON.parse(rawText);
                      extractedData = { ...extractedData, ...parsedData };
                    } catch (parseErr) {
                      console.error('8. [JSON ERROR] Failed to parse image AI response:', parseErr);
                    }
                  } catch (aiError) {
                    console.error('7. [Gemini ERROR] Error during image AI processing:', aiError);
                  }

                  const bedriddenCount = Number(extractedData.bedridden) || 0;
                  const elderlyCount = Number(extractedData.elderly) || 0;
                  const peopleCount = Number(extractedData.people_count) || 1;
                  let severity = Number(extractedData.severity) || 1;

                  if (bedriddenCount > 0) severity = 5;
                  else if (elderlyCount > 0) severity = Math.max(severity, 4);
                  else if (peopleCount > 5) severity = Math.max(severity, 3);

                  let finalDetails = extractedData.details || 'ส่งรูปภาพแจ้งเหตุ';
                  if (extractedData.situation_summary) {
                    finalDetails = `${finalDetails}\n[AI สรุป: ${extractedData.situation_summary} | คำแนะนำ: ${extractedData.recommended_action || 'N/A'}]`;
                  }
                  if (imageUrl) {
                    finalDetails = `${finalDetails}\n[Image URL: ${imageUrl}]`;
                  }

                  const insertData = {
                    name: 'ไม่ระบุชื่อ (แจ้งผ่านรูปภาพ LINE)',
                    reporter_name: reporterUserId,
                    phone: extractedData.phone || '-',
                    type: extractedData.type || 'SOS ด่วน',
                    severity,
                    people_count: peopleCount,
                    water_level: '-',
                    bedridden: bedriddenCount > 0 ? 1 : 0,
                    elderly: elderlyCount > 0 ? 1 : 0,
                    details: finalDetails,
                    image_url: imageUrl || null,
                    status: 'pending',
                    created_at: new Date().toISOString()
                  };

                  const { data, error: insertError } = await supabase.from('cases').insert([insertData]).select();
                  if (insertError) {
                    console.error('10. [DB ERROR] Failed to insert image case into Supabase:', insertError);
                  } else if (data && data[0]) {
                    registeredCaseId = String(data[0].id);
                    isSuccess = true;
                    console.log('10. [DB SUCCESS] Successfully inserted image case. ID:', registeredCaseId);
                  }
                }
              } catch (generalError) {
                console.error('5. [General ERROR] Error processing image message:', generalError);
              }
            }

            // Reply with Flex Message Card (NOT plain text!)
            await sendLineReply(
              event.replyToken,
              [isSuccess ? buildCaseRegisteredFlexMessage(registeredCaseId, 'บันทึกรูปภาพแจ้งเหตุเรียบร้อยแล้ว') : buildEmergencyFlexMessage()],
              accessToken
            );
            continue;
          }

          // ==================== LOCATION MESSAGE ====================
          else if (event.message.type === 'location') {
            const { latitude, longitude, address } = event.message;
            console.log(`4. [Location] Processing location from LINE: ${latitude}, ${longitude}, address: ${address || 'N/A'}`);

            try {
              // 1. Try to find the latest pending case for this user to update
              const { data: latestCase } = await supabase
                .from('cases')
                .select('id')
                .eq('reporter_name', reporterUserId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (latestCase) {
                const caseId = String(latestCase.id);
                // Update existing pending case with location
                const { error: updateError } = await supabase
                  .from('cases')
                  .update({
                    latitude,
                    longitude,
                    details: `พิกัดจาก LINE: ${address || ''}`,
                  })
                  .eq('id', latestCase.id);

                if (updateError) {
                  console.error('[DB ERROR] Failed to update location for existing case:', updateError);
                } else {
                  console.log(`[DB SUCCESS] Updated location for case ID: ${caseId}`);
                }

                // Reply with Location Success Flex Card (NOT plain text!)
                await sendLineReply(
                  event.replyToken,
                  [buildLocationSuccessFlexMessage(caseId)],
                  accessToken
                );
              } else {
                // No existing case — insert a brand new one with location
                const { data: newCase, error: insertError } = await supabase
                  .from('cases')
                  .insert([{
                    name: 'SOS User (LINE)',
                    reporter_name: reporterUserId,
                    phone: '-',
                    type: 'SOS ด่วน',
                    severity: 5,
                    people_count: 1,
                    water_level: '-',
                    bedridden: 0,
                    elderly: 0,
                    latitude,
                    longitude,
                    details: `พิกัดจาก LINE: ${address || ''}`,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                  }])
                  .select()
                  .single();

                if (insertError || !newCase) {
                  console.error('[DB ERROR] Failed to insert location case:', insertError);
                  await sendLineReply(
                    event.replyToken,
                    [buildEmergencyFlexMessage()],
                    accessToken
                  );
                } else {
                  const caseId = String(newCase.id);
                  console.log('[DB SUCCESS] Inserted new location case. ID:', caseId);

                  // Reply with Location Success Flex Card (NOT plain text!)
                  await sendLineReply(
                    event.replyToken,
                    [buildLocationSuccessFlexMessage(caseId)],
                    accessToken
                  );
                }
              }
            } catch (error) {
              console.error('[DB ERROR] Failed to process location event:', error);
              await sendLineReply(
                event.replyToken,
                [buildEmergencyFlexMessage()],
                accessToken
              );
            }
            continue;
          }
        }
      }
    }

    console.log('================ END PROCESSING ================');
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('CRITICAL Webhook processing error:', error);
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  }
}
