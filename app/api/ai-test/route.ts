import { NextResponse } from 'next/server';
import { extractDisasterDataFromText, extractDisasterDataFromImage } from '@/app/services/aiService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      type, // 'text' or 'image'
      content, // text message or base64 image
      systemPrompt, 
      apiKey, 
      aiProvider,
      modelName, 
      visionModelName 
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required to test AI.' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    let result;

    if (type === 'text') {
      result = await extractDisasterDataFromText(
        apiKey,
        systemPrompt || 'You are a disaster relief assistant. Extract data into strictly JSON format with exactly these keys: type, details, people_count, bedridden, elderly, phone.',
        content,
        aiProvider || 'Groq',
        modelName
      );
    } else if (type === 'image') {
      // content should be base64 string
      const base64Data = content.replace(/^data:image\/\w+;base64,/, "");
      result = await extractDisasterDataFromImage(
        apiKey,
        systemPrompt || 'You are an AI assistant for disaster relief. Extract information from the image and respond ONLY in valid JSON format.',
        base64Data,
        aiProvider || 'Groq',
        visionModelName
      );
    } else {
      return NextResponse.json({ error: 'Invalid type. Use text or image.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('Test AI error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process AI test' }, { status: 500 });
  }
}
