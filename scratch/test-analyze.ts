import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const modelsToTest = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image'];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          'คุณคือระบบ AI วิเคราะห์ภาพถ่ายฉุกเฉิน ตอบเป็น JSON: {"risk_level": 3, "ai_score": 50, "situation_summary": "วิเคราะห์สำเร็จ"}',
          { inlineData: { data: dummyBase64, mimeType: 'image/png' } }
        ]
      });
      console.log(`✅ SUCCESS with ${model}:`, response.text);
      break;
    } catch (e: any) {
      console.error(`❌ FAILED with ${model}:`, e.message || e);
    }
  }
}

main();
