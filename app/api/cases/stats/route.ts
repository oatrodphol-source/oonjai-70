import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: cases, error } = await supabase.from('cases').select('*');
    
    if (error) {
      throw error;
    }

    let pendingCount = 0;
    let completedCount = 0;
    let shelterCount = 0;
    let hospitalCount = 0;

    cases.forEach((data) => {
      const status = data.status;
      const destination = data.destination;

      if (['pending', 'wait', 'accepted', 'in_progress'].includes(status)) {
        pendingCount++;
      } else if (status === 'completed') {
        completedCount++;
        if (destination === 'ศูนย์พักพิง') {
          shelterCount++;
        } else if (destination === 'โรงพยาบาล') {
          hospitalCount++;
        }
      }
    });

    // Mock high-risk districts since we don't have a district column
    const highRiskDistricts = [
      { name: "เขตลาดกระบัง", severityCount: 45 },
      { name: "เขตดอนเมือง", severityCount: 38 },
      { name: "เขตบางเขน", severityCount: 31 }
    ];

    return NextResponse.json({
      pendingCount,
      completedCount,
      shelterCount,
      hospitalCount,
      highRiskDistricts
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch cases stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
