import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('id', 1)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!rows || rows.length === 0) {
      // Return default if not exists
      return NextResponse.json({
        waterLevelHigh: 5,
        waterLevelMedium: 3,
        peopleCountMany: 5,
        peopleCountFew: 2,
        bedridden: 4,
        elderly: 2,
        severityFactor: 2,
        ai_provider: 'OpenAI',
        ai_api_key: '',
        ai_system_prompt: '',
        ai_model_name: '',
        ai_vision_model_name: '',
        is_ai_enabled: true
      }, { status: 200 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Fetch AI Triage settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      waterLevelHigh,
      waterLevelMedium,
      peopleCountMany,
      peopleCountFew,
      bedridden,
      elderly,
      severityFactor,
      ai_provider,
      ai_api_key,
      ai_system_prompt,
      ai_model_name,
      ai_vision_model_name,
      is_ai_enabled
    } = body;

    const { error } = await supabase
      .from('ai_settings')
      .upsert({
        id: 1,
        waterLevelHigh: waterLevelHigh || 5,
        waterLevelMedium: waterLevelMedium || 3,
        peopleCountMany: peopleCountMany || 5,
        peopleCountFew: peopleCountFew || 2,
        bedridden: bedridden || 4,
        elderly: elderly || 2,
        severityFactor: severityFactor || 2,
        ai_provider: ai_provider || 'OpenAI',
        ai_api_key: ai_api_key !== undefined ? ai_api_key : '',
        ai_system_prompt: ai_system_prompt !== undefined ? ai_system_prompt : '',
        ai_model_name: ai_model_name !== undefined ? ai_model_name : '',
        ai_vision_model_name: ai_vision_model_name !== undefined ? ai_vision_model_name : '',
        is_ai_enabled: is_ai_enabled !== undefined ? is_ai_enabled : true
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update AI Triage settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
