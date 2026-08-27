import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key ending in:', apiKey ? apiKey.slice(-6) : 'NONE');
  const ai = new GoogleGenAI({ apiKey });
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const modelsToTest = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`\nTesting Gemini model: "${model}"...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          'คุณคือระบบ AI วิเคราะห์ภาพถ่ายฉุกเฉิน ตอบเป็น JSON: {"risk_level": 3, "ai_score": 50, "situation_summary": "วิเคราะห์สำเร็จ"}',
          { inlineData: { data: dummyBase64, mimeType: 'image/png' } }
        ]
      });
      console.log(`✅ SUCCESS with model [${model}]:`, response.text?.trim().substring(0, 100));
    } catch (e: any) {
      console.error(`❌ FAILED with model [${model}]:`, e.message || e);
    }
  }
}

main();
