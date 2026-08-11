import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    // Fetch snapshot of active cases from Supabase
    const { data: casesData } = await supabase
      .from('cases')
      .select('id, type, severity, status, details, water_level, bedridden, elderly, address, location, subdistrict')
      .in('status', ['pending', 'in_progress']);

    if (!casesData || casesData.length === 0) {
      return NextResponse.json({
        insight: 'ขณะนี้ยังไม่พบเคสขอความช่วยเหลือที่รอดำเนินการในระบบ สถานการณ์โดยรวมอยู่ในภาวะปกติ'
      });
    }

    const pendingCases = casesData.filter(c => c.status === 'pending');
    const inProgressCases = casesData.filter(c => c.status === 'in_progress');
    const level5Cases = casesData.filter(c => Number(c.severity) === 5);
    const level4Cases = casesData.filter(c => Number(c.severity) === 4);
    const bedriddenCases = casesData.filter(c => Number(c.bedridden) === 1 || c.details?.includes('ติดเตียง'));

    const locationCounts: Record<string, number> = {};
    casesData.forEach(c => {
      const loc = c.subdistrict || c.address || c.location || 'ไม่ระบุพื้นที่';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc, count]) => `${loc} (${count} เคส)`)
      .join(', ');

    if (!geminiApiKey) {
      const highRiskArea = topLocations ? `พบความหนาแน่นของเหตุในบริเวณ ${topLocations}` : 'กระจายตัวอยู่ในหลายพื้นที่';
      const summaryText = level5Cases.length > 0
        ? `ขณะนี้พบเคสวิกฤต (ระดับ 5) จำนวน ${level5Cases.length} เคส และกลุ่มเปราะบางติดเตียง ${bedriddenCases.length} เคส ${highRiskArea} โปรดเร่งจัดเตรียมทีมกู้ภัยและอุปกรณ์อพยพเข้าพื้นที่ด่วนเป็นลำดับแรก`
        : `ขณะนี้มีเคสรอการช่วยเหลือ ${pendingCases.length} เคส และกำลังดำเนินการ ${inProgressCases.length} เคส สถานการณ์อยู่ในระดับเฝ้าระวัง โปรดติดตามข้อมูลอย่างใกล้ชิด`;

      return NextResponse.json({ insight: summaryText });
    }

    // Call Gemini API for real-time dynamic tactical analysis
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const prompt = `You are a disaster tactical commander AI. Analyze the following real-time disaster situation data:
- Total active cases: ${casesData.length} (Pending: ${pendingCases.length}, In Progress: ${inProgressCases.length})
- Critical Level 5 cases: ${level5Cases.length}
- Severe Level 4 cases: ${level4Cases.length}
- Bedridden/vulnerable cases: ${bedriddenCases.length}
- Top incident hotspot locations: ${topLocations || 'Distributed across area'}

Generate a short, formal, professional 1-2 sentence tactical recommendation in Thai for field rescue volunteers. Focus on priorities, logistics, and resource allocation. Do NOT use any emojis, robot characters, or hashtags. Be direct, authoritative, and helpful.`;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [prompt]
    });

    let insightText = (result.text || '').trim();
    // Strip out cluttering emojis if any
    insightText = insightText.replace(/[\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF\u2600-\u26FF\u2700-\u27BF🤖🚑🎉🚨🔥]/g, '').trim();

    if (!insightText) {
      insightText = `พบเคสรอการช่วยเหลือ ${pendingCases.length} เคส (ระดับวิกฤต 5 จำนวน ${level5Cases.length} เคส) โปรดจัดลำดับทีมกู้ภัยเข้าช่วยเหลือผู้ป่วยติดเตียงและกลุ่มเปราะบางเป็นลำดับแรก`;
    }

    return NextResponse.json({ insight: insightText });
  } catch (error) {
    console.error('Error generating AI insight:', error);
    return NextResponse.json({
      insight: 'การวิเคราะห์สถานการณ์ภาคสนาม: โปรดตรวจสอบเคสวิกฤตระดับ 5 และจัดเตรียมอุปกรณ์อพยพเข้าช่วยเหลือกลุ่มเปราะบางในพื้นที่เป็นลำดับแรก'
    });
  }
}
