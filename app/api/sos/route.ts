import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { lat, lng } = payload;

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude (lat) and longitude (lng) are required' },
        { status: 400 }
      );
    }

    const newCase = {
      name: 'SOS User (Auto)',
      phone: '-',
      type: 'SOS ด่วน',
      severity: 5,
      people_count: 1,
      water_level: '-',
      bedridden_count: 0,
      elderly_count: 0,
      latitude: lat,
      longitude: lng,
      details: "พิกัด: " + lat + ", " + lng,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cases')
      .insert(newCase)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const caseNumberStr = data.case_number ? String(data.case_number).padStart(3, '0') : String(data.id).padStart(3, '0');

    console.log("🔥 Quick SOS saved to Supabase with ID:", data.id);

    return NextResponse.json({ 
      success: true, 
      id: data.id, 
      case_number: caseNumberStr,
      phone: data.phone 
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 SOS SUPABASE WRITE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

