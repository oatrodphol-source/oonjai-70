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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    const body = await req.json();

    let caseId = rawId;
    if (rawId.startsWith('CAS-')) {
      caseId = rawId.replace('CAS-', '');
    }

    const { status, volunteerName, volunteerPhone, volunteerUnit, destination } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (volunteerName) updateData.assigned_volunteer_name = volunteerName;
    if (volunteerPhone) updateData.assigned_volunteer_phone = volunteerPhone;
    if (volunteerUnit) updateData.assigned_volunteer_unit = volunteerUnit;
    if (destination) updateData.destination = destination;

    const { data: updatedCase, error } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', Number(caseId))
      .select()
      .single();

    if (error) throw error;

    // Send LINE Push Notification if case belongs to a LINE user
    if (updatedCase && updatedCase.reporter_name && updatedCase.reporter_name.startsWith('U')) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oonjai-70-6yo4.vercel.app');
        await fetch(`${baseUrl}/api/line/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: updatedCase.id,
            status: updatedCase.status,
            volunteerName: updatedCase.assigned_volunteer_name,
            volunteerPhone: updatedCase.assigned_volunteer_phone,
            volunteerUnit: updatedCase.assigned_volunteer_unit
          })
        });
      } catch (pushErr) {
        console.error('Error triggering LINE push:', pushErr);
      }
    }

    return NextResponse.json(updatedCase, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
