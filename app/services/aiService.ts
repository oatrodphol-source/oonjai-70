'use client';
import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

export interface ExtractedDisasterData {
  type: string;
  details: string;
  people_count: number;
  bedridden: number;
  elderly: number;
  phone: string;
  [key: string]: any; // Allow dynamic fields from custom prompts
}

const DEFAULT_FALLBACK: ExtractedDisasterData = {
  type: "",
  details: "",
  people_count: 0,
  bedridden: 0,
  elderly: 0,
  phone: ""
};  

export async function extractDisasterDataFromText(
  apiKey: string,
  systemPrompt: string,
  text: string,
  aiProvider: string = 'Groq',
  customModelName?: string
): Promise<ExtractedDisasterData> {
  const modelName = customModelName || getDefaultModel(aiProvider, false);
  return extractWithRetry(apiKey, aiProvider, modelName, systemPrompt, text, null);
}

export async function extractDisasterDataFromImage(
  apiKey: string,
  systemPrompt: string,
  base64Image: string,
  aiProvider: string = 'Groq',
  customVisionModelName?: string
): Promise<ExtractedDisasterData> {
  const modelName = customVisionModelName || getDefaultModel(aiProvider, true);
  return extractWithRetry(apiKey, aiProvider, modelName, systemPrompt, null, base64Image);
}

function getDefaultModel(provider: string, isVision: boolean): string {
  if (provider === 'OpenAI') return isVision ? 'gpt-4o' : 'gpt-4o-mini';
  if (provider === 'Google Gemini') return isVision ? 'gemini-3.6-flash' : 'gemini-3.6-flash';
  if (provider === 'Anthropic Claude') return 'claude-3-5-sonnet-20240620';
  // Default to Groq
  return isVision ? (process.env.GROQ_VISION_MODEL_NAME || 'llama-3.2-11b-vision-preview') 
                  : (process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile');
}

async function extractWithRetry(
  apiKey: string,
  provider: string,
  modelName: string,
  systemPrompt: string,
  text: string | null,
  base64Image: string | null = null,
  retries: number = 1
): Promise<ExtractedDisasterData> {
  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`[aiService] Attempt ${i + 1}: Calling ${provider} API with model ${modelName}...`);
      let responseText = '';

      if (provider === 'OpenAI') {
        responseText = await callOpenAI(apiKey, modelName, systemPrompt, text, base64Image);
      } else if (provider === 'Google Gemini') {
        responseText = await callGemini(apiKey, modelName, systemPrompt, text, base64Image);
      } else if (provider === 'Anthropic Claude') {
        responseText = await callAnthropic(apiKey, modelName, systemPrompt, text, base64Image);
      } else {
        responseText = await callGroq(apiKey, modelName, systemPrompt, text, base64Image);
      }
      
      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(cleanText);
      
      return {
        ...extractedData,
        type: extractedData.type || "",
        details: extractedData.details || (text ? text : "ส่งรูปภาพแจ้งเหตุ"),
        people_count: Number(extractedData.people_count) || 0,
        bedridden: Number(extractedData.bedridden) || 0,
        elderly: Number(extractedData.elderly) || 0,
        phone: extractedData.phone || ""
      };
    } catch (error) {
      console.error(`[aiService ERROR] Attempt ${i + 1} failed:`, error);
      if (i === retries) {
        console.error('[aiService ERROR] All retries failed. Returning fallback JSON.');
        return { ...DEFAULT_FALLBACK, details: text || "ส่งรูปภาพแจ้งเหตุ" };
      }
    }
  }

  return { ...DEFAULT_FALLBACK, details: text || "ส่งรูปภาพแจ้งเหตุ" };
}

// === Provider Implementations ===

async function callGroq(apiKey: string, modelName: string, systemPrompt: string, text: string | null, base64Image: string | null): Promise<string> {
  const groq = new Groq({ apiKey });
  let userContent: any;
  if (base64Image) {
    userContent = [
      { type: 'text', text: 'Analyze this disaster image and provide strictly JSON output.' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
    ];
  } else {
    userContent = text || '';
  }

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    model: modelName,
    temperature: 0,
    response_format: { type: "json_object" }
  });

  return chatCompletion.choices[0]?.message?.content || '{}';
}

async function callOpenAI(apiKey: string, modelName: string, systemPrompt: string, text: string | null, base64Image: string | null): Promise<string> {
  let userContent: any;
  if (base64Image) {
    userContent = [
      { type: 'text', text: 'Analyze this disaster image and provide strictly JSON output.' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
    ];
  } else {
    userContent = text || '';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}

async function callGemini(apiKey: string, modelName: string, systemPrompt: string, text: string | null, base64Image: string | null): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const modelsToTry = [modelName, 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'].filter((v, idx, self) => self.indexOf(v) === idx);

  for (const mName of modelsToTry) {
    try {
      let result;
      if (base64Image) {
        result = await ai.models.generateContent({
          model: mName,
          contents: [
            systemPrompt,
            'Analyze this disaster image and provide strictly JSON output.',
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
          ]
        });
      } else {
        result = await ai.models.generateContent({
          model: mName,
          contents: [
            systemPrompt,
            text || 'Extract disaster details into JSON format.'
          ]
        });
      }
      if (result.text) {
        return result.text;
      }
    } catch (err: any) {
      console.warn(`[aiService callGemini] Model ${mName} failed:`, err.message || err);
    }
  }

  throw new Error('All Gemini models failed');
}

async function callAnthropic(apiKey: string, modelName: string, systemPrompt: string, text: string | null, base64Image: string | null): Promise<string> {
  let userContent: any;
  if (base64Image) {
    userContent = [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
      { type: 'text', text: 'Analyze this disaster image and provide strictly JSON output.' }
    ];
  } else {
    userContent = text || '';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ],
      temperature: 0,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '{}';
}