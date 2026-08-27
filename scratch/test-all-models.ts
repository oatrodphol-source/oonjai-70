import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const modelsToTest = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.7-flash'
  ];

  console.log('--- TESTING UPDATED GEMINI MODELS ---');
  for (const model of modelsToTest) {
    try {
      console.log(`Testing Gemini model: ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          'คุณคือระบบ AI วิเคราะห์ภาพถ่ายฉุกเฉิน ตอบเป็น JSON: {"risk_level": 3, "ai_score": 50, "situation_summary": "วิเคราะห์สำเร็จ"}',
          { inlineData: { data: dummyBase64, mimeType: 'image/png' } }
        ]
      });
      console.log(`✅ SUCCESS with Gemini ${model}:`, response.text?.trim().substring(0, 100));
      return;
    } catch (e: any) {
      console.error(`❌ FAILED with ${model}:`, e.message || e);
    }
  }

  if (groqApiKey) {
    console.log('\n--- TESTING GROQ VISION FALLBACK ---');
    try {
      const groq = new Groq({ apiKey: groqApiKey });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'คุณคือระบบ AI วิเคราะห์ภาพถ่ายฉุกเฉิน ตอบเป็น JSON: {"risk_level": 3, "ai_score": 50, "situation_summary": "วิเคราะห์สำเร็จ"}' },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${dummyBase64}` }
              }
            ]
          }
        ]
      });
      console.log(`✅ SUCCESS with Groq Vision:`, completion.choices[0]?.message?.content);
    } catch (groqErr: any) {
      console.error('❌ FAILED with Groq Vision:', groqErr.message || groqErr);
    }
  }
}

main();
