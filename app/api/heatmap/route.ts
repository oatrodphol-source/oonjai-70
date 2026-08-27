import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const sql = `
      SELECT id, type, severity, latitude, longitude, status, details 
      FROM cases 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
        AND latitude != 0 AND longitude != 0 
        AND (status IS NULL OR status NOT IN ('completed', 'cancelled'))
    `;
    const cases = await query(sql) as any[];
    const validCases = Array.isArray(cases) ? cases : [];

    // Format data for frontend map
    const heatmapData = validCases.map(c => ({
      id: c.id,
      type: c.type,
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      severity: c.severity || 1,
      status: c.status,
      details: c.details
    }));

    return NextResponse.json(heatmapData, { status: 200 });
  } catch (error) {
    console.error('Fetch heatmap error:', error);
    // Return empty array instead of throwing to prevent frontend crashes
    return NextResponse.json([], { status: 200 });
  }
}
