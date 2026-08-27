const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function testSpeed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: rows } = await supabase.from('ai_settings').select('*').eq('id', 1);
  const rawKeyString = (rows && rows[0] && rows[0].ai_api_key) || process.env.GEMINI_API_KEY || '';
  const apiKeys = rawKeyString.split(/[\s,\n]+/).map(k => k.trim()).filter(Boolean);

  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const modelsToTest = ['gemini-3.6-flash', 'gemini-2.5-flash'];

  for (const currentKey of apiKeys) {
    const ai = new GoogleGenAI({ apiKey: currentKey });
    console.log(`\n--- TESTING KEY ...${currentKey.slice(-4)} ---`);

    for (const mName of modelsToTest) {
      const start = Date.now();
      try {
        console.log(`Testing model: ${mName}...`);
        const response = await ai.models.generateContent({
          model: mName,
          contents: [
            'คุณคือระบบ AI วิเคราะห์ภาพถ่ายภัยพิบัติฉุกเฉิน ตอบเป็น JSON สั้นๆ: {"risk_level": 3, "ai_score": 50, "situation_summary": "ทดสอบสำเร็จ"}',
            { inlineData: { data: dummyBase64, mimeType: 'image/png' } }
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 250
          }
        });
        const duration = Date.now() - start;
        console.log(`⚡ SUCCESS in ${duration}ms with [${mName}]:`, response.text?.trim());
        return;
      } catch (err) {
        console.error(`FAILED with [${mName}]:`, err.message || err);
      }
    }
  }
}

testSpeed();
