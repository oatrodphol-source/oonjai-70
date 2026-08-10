import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // Fetch dynamic Smart Triage settings & weights from Supabase
    let triageWeights = {
      waterLevelHigh: 5,
      waterLevelMedium: 3,
      peopleCountMany: 5,
      peopleCountFew: 2,
      bedridden: 4,
      elderly: 2,
      severityFactor: 2,
      ai_system_prompt: '',
      is_ai_enabled: true
    };

    try {
      const { data: rows } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('id', 1)
        .limit(1);

      if (rows && rows.length > 0) {
        triageWeights = { ...triageWeights, ...rows[0] };
      }
    } catch (dbError) {
      console.warn('Could not fetch ai_settings from database, using defaults:', dbError);
    }

    // Convert file to Base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');
    
    // Determine the mime type from the file
    const mimeType = file.type || 'image/jpeg';

    const systemInstruction = `คุณคือระบบ AI ผู้เชี่ยวชาญด้านการวิเคราะห์ภาพถ่ายและการจัดลำดับความรุนแรงของภัยพิบัติ (Disaster Risk Analyzer) หน้าที่ของคุณคือวิเคราะห์รูปภาพเหตุการณ์ ร่วมกับคำสั่ง/ข้อความอธิบายที่ผู้ใช้ส่งเข้ามาอย่างละเอียด เพื่อประเมินสถานการณ์และจัดลำดับความเร่งด่วนตามเกณฑ์ที่กำหนดอย่างเคร่งครัด

### 🧠 Smart Triage Algorithm Scoring Formula
คำนวณคะแนนตามน้ำหนักปัจจัยที่ตั้งค่าไว้ในระบบปัจจุบันดังนี้:
- Score = (Water Level Score) + (People Score) + (Bedridden Score) + (Elderly Score) + (Severity Score)
- น้ำหนักปัจจัยระดับน้ำสูง (ท่วมมิดหัว/เกินอก): +${triageWeights.waterLevelHigh} คะแนน
- น้ำหนักปัจจัยระดับน้ำปานกลาง (ระดับเอว/ครึ่งตัว): +${triageWeights.waterLevelMedium} คะแนน
- น้ำหนักปัจจัยมีผู้ป่วยติดเตียง: +${triageWeights.bedridden} คะแนน
- น้ำหนักปัจจัยมีเด็ก/ผู้สูงอายุ: +${triageWeights.elderly} คะแนน
- น้ำหนักปัจจัยจำนวนคนมากกว่า 5 คน: +${triageWeights.peopleCountMany} คะแนน
- น้ำหนักปัจจัยจำนวนคน 1-4 คน: +${triageWeights.peopleCountFew} คะแนน
- ตัวคูณปัจจัยความรุนแรง (Severity Factor): x${triageWeights.severityFactor}

${triageWeights.ai_system_prompt ? `### 📝 คำสั่งพิเศษเพิ่มเติมจากผู้ดูแลระบบ (Custom System Prompt):\n${triageWeights.ai_system_prompt}\n` : ''}

### 🚨 เกณฑ์การจัดลำดับความเร่งด่วน (5 ระดับ)

ให้ประเมินคะแนน AI (0-100) และระดับความเร่งด่วน โดยพิจารณาจากบริบทในภาพ คีย์เวิร์ดสำคัญ และคำนวณตาม Smart Triage Algorithm ด้านบนดังนี้:

1. [ระดับ 1] เฝ้าระวัง (คะแนน 0-20 | สี Heatmap: เขียว | เวลาเข้าถึงพื้นที่: ภายใน 24 ชั่วโมง)
   - บริบท: แจ้งเพื่อรายงานสถานการณ์ทั่วไป
   - คีย์เวิร์ด: แจ้งสถานการณ์, ระดับน้ำพึ่งเริ่มมา, แจ้งเตือนพื้นที่เฝ้าระวัง, สอบถามข้อมูล

2. [ระดับ 2] รอได้ระยะสั้น (คะแนน 21-40 | สี Heatmap: ฟ้า | เวลาเข้าถึงพื้นที่: ภายใน 6-12 ชั่วโมง)
   - บริบท: เริ่มมีผลกระทบแต่ยังไม่รุนแรงมาก
   - คีย์เวิร์ด: น้ำขัง, น้ำท่วมถนน, เข้าออกลำบาก, น้ำเริ่มลดแล้ว

3. [ระดับ 3] ต้องช่วยเร็ว (คะแนน 41-60 | สี Heatmap: เหลือง | เวลาเข้าถึงพื้นที่: ภายใน 1-3 ชั่วโมง)
   - บริบท: เริ่มมีความเดือดร้อนด้านปัจจัยสี่ แต่ยังไม่วิกฤตทันที
   - คีย์เวิร์ด: น้ำเข้าบ้าน, น้ำสูงครึ่งเมตร, ต้องการอพยพ, ขออาหาร, ขอถุงยังชีพ, เดินลำบาก, รถเข้าไม่ได้

4. [ระดับ 4] เสี่ยงสูง (คะแนน 61-80 | สี Heatmap: ส้ม | เวลาเข้าถึงพื้นที่: ภายใน 30-60 นาที)
   - บริบท: ต้องการเร่งความช่วยเหลือ สถานการณ์เริ่มอันตราย มีกลุ่มเปราะบาง
   - คีย์เวิร์ด: น้ำสูงครึ่งตัว, น้ำเพิ่มขึ้นเร็ว, บ้านเริ่มพัง, ไฟฟ้ารั่ว, ไม่มีทางออก, ต้องการเรือ, ผู้สูงอายุอยู่ลำพัง, เด็กเล็กหลายคน, ยาหมด

5. [ระดับ 5] อันตรายถึงชีวิต (คะแนน 81-100 | สี Heatmap: แดงเข้ม | เวลาเข้าถึงพื้นที่: ภายใน 15-30 นาที)
   - บริบท: วิกฤตรุนแรง เป็นอันตรายต่อชีวิต ต้องช่วยทันที
   - คีย์เวิร์ด: น้ำเชี่ยว, น้ำพัด, กำลังจะจมน้ำ, ติดอยู่บนหลังคา, ออกไม่ได้, ติดอยู่ชั้นสอง, คนหมดสติ, หายใจไม่ออก, ระดับน้ำเกิน 1 เมตร, ช่วยด่วนมาก, เด็กเล็กติดอยู่, ผู้ป่วยติดเตียง + น้ำสูง, ขอเรือด่วน, ผู้ป่วยวิกฤต

---

### 📥 รูปแบบการตอบกลับ (Output Format)
ให้ตรวจสอบข้อมูลทั้งหมดแล้วตอบกลับเป็น JSON Object ทันที โดยใช้โครงสร้างดังนี้:
{
  "risk_level": 1 ถึง 5 (เลือกตัวเลขระดับที่สอดคล้องที่สุด),
  "ai_score": 0 ถึง 100 (ตัวเลขคะแนนที่ประเมินจาก Smart Triage Scoring),
  "heatmap_color": "เขียว / ฟ้า / เหลือง / ส้ม / แดงเข้ม",
  "response_time": "ระบุเวลาตามเกณฑ์ เช่น ภายใน 1-3 ชั่วโมง หรือ ภายใน 15-30 นาที",
  "situation_summary": "สรุปสถานการณ์สั้นๆ ที่พิจารณาจากรูปและข้อความของผู้ใช้",
  "detected_keywords": ["คีย์เวิร์ดที่ระบบตรวจพบในภาพหรือข้อความ"],
  "recommended_action": "คำแนะนำเบื้องต้นในการเข้าระงับเหตุหรือเตรียมอุปกรณ์"
}

ข้อความจากผู้ใช้เพิ่มเติม: ${prompt}`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || '';
    if (!apiKey) {
      throw new Error("Missing Gemini API Key");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const safeModelName = 'gemini-flash-latest';

    const response = await ai.models.generateContent({
      model: safeModelName,
      contents: [
        systemInstruction,
        'Analyze this disaster image and provide strictly JSON output.',
        { inlineData: { data: base64Data, mimeType: mimeType } }
      ]
    });
    
    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    return NextResponse.json({ result: cleanJson });
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
