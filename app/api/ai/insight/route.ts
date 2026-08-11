import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { isPendingCase, isInProgressCase, isActiveCase } from '@/lib/caseUtils';

export async function POST() {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    // Fetch ALL cases to filter active ones accurately in memory
    const { data: allCases, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !allCases || allCases.length === 0) {
      return NextResponse.json({
        insight: 'ขณะนี้ระบบอยู่ในสถานะเฝ้าระวังแบบเรียลไทม์ ยังไม่พบการแจ้งเหตุขอความช่วยเหลือเข้ามาในระบบ'
      });
    }

    // Filter active cases (pending & in_progress)
    const activeCases = allCases.filter(c => isActiveCase(c.status));

    if (activeCases.length === 0) {
      return NextResponse.json({
        insight: 'ขณะนี้ยังไม่พบเคสที่รอดำเนินการเพิ่มเติมในระบบ สถานการณ์กู้ภัยโดยรวมเข้าสู่ภาวะปกติ'
      });
    }

    // Accurately categorize active cases
    const pendingCases = activeCases.filter(c => isPendingCase(c.status));
    const inProgressCases = activeCases.filter(c => isInProgressCase(c.status));

    const level5Cases = activeCases.filter(c => {
      const sev = String(c.severity || c.level || 1).match(/\d+/);
      return sev ? parseInt(sev[0], 10) === 5 : false;
    });

    const level4Cases = activeCases.filter(c => {
      const sev = String(c.severity || c.level || 1).match(/\d+/);
      return sev ? parseInt(sev[0], 10) === 4 : false;
    });

    const bedriddenCases = activeCases.filter(c => Number(c.bedridden) === 1 || String(c.details || '').includes('ติดเตียง'));

    const locationCounts: Record<string, number> = {};
    activeCases.forEach(c => {
      const loc = c.subdistrict || c.address || c.location || 'พื้นที่ไม่ระบุ';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc, count]) => `${loc} (${count} เคส)`)
      .join(', ');

    const pendingCount = pendingCases.length > 0 ? pendingCases.length : activeCases.length - inProgressCases.length;
    const inProgCount = inProgressCases.length;
    const s5Count = level5Cases.length;
    const bedriddenCount = bedriddenCases.length;

    // Precise, truthful summary sentence generator
    let accurateInsight = '';

    if (s5Count > 0) {
      accurateInsight = `ขณะนี้พบเคสเร่งด่วนวิกฤต (ระดับ 5) จำนวน ${s5Count} เคส${bedriddenCount > 0 ? ` (มีผู้ป่วยติดเตียง ${bedriddenCount} คน)` : ''} และมีเคสรอการช่วยเหลือรวม ${pendingCount} เคส ${topLocations ? `หนาแน่นในบริเวณ ${topLocations}` : ''} โปรดจัดเตรียมเรือท้องแบนและอุปกรณ์อพยพเร่งระดมเข้าช่วยเหลือด่วนที่สุด`;
    } else if (pendingCount > 0) {
      accurateInsight = `ขณะนี้มีเคสรอการช่วยเหลือรวม ${pendingCount} เคส${inProgCount > 0 ? ` (กำลังเร่งเข้าช่วยเหลืออยู่ ${inProgCount} เคส)` : ''} ${topLocations ? `ส่วนใหญ่อยู่ในบริเวณ ${topLocations}` : ''} โปรดจัดลำดับคิวและอุปกรณ์กู้ภัยเข้าปฏิบัติตามแผนงานประจำวันอย่างต่อเนื่อง`;
    } else {
      accurateInsight = `ขณะนี้กำลังเร่งช่วยเหลือเคสภาคสนามอยู่ ${inProgCount} เคส สถานการณ์ภาพรวมเริ่มคลี่คลายเรียบร้อยแล้ว`;
    }

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const prompt = `You are a disaster tactical commander AI. Analyze the following REAL-TIME ACTIVE CASES in field:
- Pending cases waiting for rescue: ${pendingCount}
- In-progress cases currently being rescued: ${inProgCount}
- Critical Level 5 cases: ${s5Count}
- Severe Level 4 cases: ${level4Cases.length}
- Bedridden patients: ${bedriddenCount}
- Hotspot location areas: ${topLocations || 'Distributed'}

Output EXACTLY ONE 1-2 sentence short tactical recommendation in Thai for volunteers. Mention the exact number of pending cases (${pendingCount}) or critical level 5 cases (${s5Count}) so volunteers get 100% accurate info. Do NOT use any emojis, robot characters, or hashtags. Be direct, professional, and helpful.`;

        const result = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [prompt]
        });

        let aiText = (result.text || '').trim().replace(/[\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF\u2600-\u26FF\u2700-\u27BF🤖🚑🎉🚨🔥]/g, '').trim();
        if (aiText) {
          accurateInsight = aiText;
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, using precise summary:', geminiErr);
      }
    }

    return NextResponse.json({ insight: accurateInsight });
  } catch (error) {
    console.error('Error generating AI insight:', error);
    return NextResponse.json({
      insight: 'โปรดตรวจสอบรายการเคสวิกฤตระดับ 5 และจัดเตรียมทีมกู้ภัยและเรือท้องแบนเข้าช่วยเหลือผู้ประสบภัยในพื้นที่เป็นลำดับแรก'
    });
  }
}
