import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phoneFilter = url.searchParams.get('phone');
    const idFilter = url.searchParams.get('id');
    
    let query = supabase.from('cases').select('*').order('created_at', { ascending: false });

    if (phoneFilter) {
      query = query.eq('phone', phoneFilter);
    } else if (idFilter) {
      query = query.eq('id', idFilter);
    }
    
    const { data: cases, error } = await query;
    
    if (error) {
      throw error;
    }
    
    const formattedCases = cases.map((row: any) => ({
      id: row.case_number ? `CAS-${String(row.case_number).padStart(3, '0')}` : `CAS-${String(row.id).substring(0, 5)}`,
      rawId: row.id,
      name: row.name,
      type: row.type,
      severity: row.severity,
      time: row.created_at 
        ? new Date(row.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : '-',
      status: mapStatus(row.status),
      phone: row.phone,
      peopleCount: row.people_count || 1,
      waterLevel: row.water_level || '-',
      bedridden: Boolean(row.bedridden_count || row.bedridden),
      elderly: Boolean(row.elderly_count || row.elderly),
      note: row.details || '-',
      latitude: row.latitude,
      longitude: row.longitude
    }));

    return NextResponse.json(formattedCases, { status: 200 });
  } catch (error: any) {
    console.error("🔥 SUPABASE READ ERROR:", error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function mapStatus(dbStatus: string) {
  switch(dbStatus) {
    case 'pending':
    case 'wait': return 'รอการช่วยเหลือ';
    case 'accepted': return 'รับเรื่องแล้ว';
    case 'in_progress': return 'กำลังช่วยเหลือ';
    case 'completed': return 'เสร็จสิ้น';
    case 'cancelled': return 'ยกเลิก';
    default: return dbStatus;
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let name = '-';
    let phone = '-';
    let type = 'SOS ด่วน';
    let peopleCount = 1;
    let bedriddenVal = 0;
    let elderlyVal = 0;
    let waterLevel = '-';
    let details = '';
    let latitude = 0;
    let longitude = 0;
    let providedSeverity: number | undefined = undefined;
    let imageFile: File | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      name = body.name || '-';
      phone = body.phone || '-';
      type = body.type || 'SOS ด่วน';
      peopleCount = Number(body.peopleCount || body.people_count || 1);
      bedriddenVal = (body.bedridden === true || body.bedridden === 1 || body.bedridden === '1') ? 1 : 0;
      elderlyVal = (body.elderly === true || body.elderly === 1 || body.elderly === '1') ? 1 : 0;
      waterLevel = body.waterLevel || body.water_level || '-';
      details = body.details || '';
      latitude = Number(body.latitude || 0);
      longitude = Number(body.longitude || 0);
      if (body.severity) providedSeverity = Number(body.severity);
    } else {
      const formData = await req.formData();
      name = formData.get('name') as string || '-';
      phone = formData.get('phone') as string || '-';
      type = formData.get('type') as string || 'SOS ด่วน';
      peopleCount = parseInt(formData.get('peopleCount') as string || '1', 10);
      bedriddenVal = (formData.get('bedridden') === 'true' || formData.get('bedridden') === '1') ? 1 : 0;
      elderlyVal = (formData.get('elderly') === 'true' || formData.get('elderly') === '1') ? 1 : 0;
      waterLevel = formData.get('waterLevel') as string || '-';
      details = formData.get('details') as string || '';
      latitude = parseFloat(formData.get('latitude') as string || '0');
      longitude = parseFloat(formData.get('longitude') as string || '0');
      const rawSeverity = formData.get('severity') as string;
      if (rawSeverity) providedSeverity = parseInt(rawSeverity, 10);
      imageFile = formData.get('image') as File | null;
    }

    // Calculate initial severity based on criteria
    let severity = 1;
    let appendedNote = "";

    if (bedriddenVal === 1 || waterLevel === 'ท่วมมิดหลังคา') {
      severity = 5;
      appendedNote = "[ผู้ป่วยติดเตียง/วิกฤตอันตรายถึงชีวิต]";
    } else if (elderlyVal === 1 && waterLevel === 'ระดับอก/ท่วมในบ้าน') {
      severity = 4;
      appendedNote = "[กลุ่มเปราะบาง/เสี่ยงสูงต้องการอพยพด่วน]";
    } else if (waterLevel === 'ระดับอก/ท่วมในบ้าน' || waterLevel === 'ระดับเอว') {
      severity = 3;
      appendedNote = "[น้ำเข้าบ้าน/ต้องการความช่วยเหลือ]";
    } else if (waterLevel === 'ระดับเข่า') {
      severity = 2;
      appendedNote = "[น้ำท่วมถนน/สัญจรลำบาก]";
    }
    
    let finalSeverity = providedSeverity !== undefined ? providedSeverity : severity;
    let finalDetails = appendedNote ? `${details} ${appendedNote}`.trim() : details;
    const status = 'pending';

    // Handle Image file
    let uploadedImageUrl = null;
    let aiData: any = null;

    if (imageFile && imageFile.size > 0) {
      try {
        const mimeType = imageFile.type || 'image/jpeg';
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const ext = mimeType.split('/')[1] || 'jpeg';
        const fileName = `cases/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        // 1. Upload to Supabase in parallel
        const uploadPromise = (async () => {
          try {
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL || '',
              process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              { auth: { autoRefreshToken: false, persistSession: false } }
            );

            const { data: uploadData, error: uploadError } = await supabaseAdmin
              .storage
              .from('images')
              .upload(fileName, buffer, { contentType: mimeType, upsert: true });
              
            if (!uploadError && uploadData) {
              return supabaseAdmin.storage.from('images').getPublicUrl(fileName).data.publicUrl;
            } else {
              console.error("Storage upload error:", uploadError);
              return null;
            }
          } catch (err) {
            console.error("Error in upload promise:", err);
            return null;
          }
        })();

        // 2. Send Base64 to Gemini in parallel
        const aiPromise = (async () => {
          try {
            const aiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
            if (!aiKey) return null;
            
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: aiKey });
            const prompt = `Analyze this disaster image and provide strictly JSON output with exactly these keys: "situation_summary" (string), "recommended_action" (string), and "risk_level" (number 1-5). Return only JSON.`;
            
            const result = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              contents: [
                prompt,
                { inlineData: { data: base64Data, mimeType } }
              ]
            });
            
            let responseText = result.text || '{}';
            responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(responseText);
          } catch (aiErr) {
            console.error("🔥 GEMINI AI ERROR (Ignored for Fail-Safe):", aiErr);
            return null;
          }
        })();

        // Wait for both to complete
        const [uploadedUrl, aiResult] = await Promise.all([uploadPromise, aiPromise]);
        uploadedImageUrl = uploadedUrl;
        aiData = aiResult;
      } catch (err) {
        console.error("Error processing image file:", err);
        // Fail-safe: continue without image/AI
      }
    }

    // 3. Merge AI Data safely
    if (aiData) {
      if (providedSeverity === undefined && severity === 1 && aiData.risk_level) {
         finalSeverity = Math.max(finalSeverity, Number(aiData.risk_level) || 1);
      }
      const aiSummary = `[AI Analysis: ${aiData.situation_summary || 'N/A'} | Action: ${aiData.recommended_action || 'N/A'}]`;
      finalDetails = finalDetails ? `${finalDetails}\n${aiSummary}` : aiSummary;
    }

    // Prepare final insert object
    const newCase = {
      name,
      phone,
      type,
      severity: finalSeverity,
      people_count: peopleCount,
      bedridden: bedriddenVal,
      elderly: elderlyVal,
      water_level: waterLevel,
      latitude: latitude || 0,
      longitude: longitude || 0,
      status,
      details: finalDetails || null,
      image_url: uploadedImageUrl || null,
      created_at: new Date().toISOString()
    };

    // Insert into cases table
    const { data, error } = await supabase
      .from('cases')
      .insert(newCase)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const caseNumberStr = data.case_number ? String(data.case_number).padStart(3, '0') : String(data.id).padStart(3, '0');
    console.log("Successfully saved case ID to Supabase:", data.id, "Case Number:", caseNumberStr);

    return NextResponse.json({ success: true, id: data.id, case_number: caseNumberStr, phone: data.phone });
  } catch (error: any) {
    console.error("🔥 SUPABASE WRITE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
