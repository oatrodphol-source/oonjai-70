import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    if (!rawId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    let caseId = rawId;
    if (rawId.startsWith('CAS-')) {
      caseId = rawId.replace('CAS-', '');
    }

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', Number(caseId))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ id: data.id, ...data }, { status: 200 });
  } catch (error) {
    console.error("API GET Case Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}
