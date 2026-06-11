import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM ai_settings WHERE id = 1 LIMIT 1') as any[];
    
    if (rows.length === 0) {
      // Return default if not exists
      return NextResponse.json({
        waterLevelHigh: 5,
        waterLevelMedium: 3,
        peopleCountMany: 5,
        peopleCountFew: 2,
        bedridden: 4,
        elderly: 2,
        severityFactor: 2
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
      severityFactor
    } = body;

    const sql = `
      UPDATE ai_settings 
      SET 
        waterLevelHigh = ?,
        waterLevelMedium = ?,
        peopleCountMany = ?,
        peopleCountFew = ?,
        bedridden = ?,
        elderly = ?,
        severityFactor = ?
      WHERE id = 1
    `;

    await query(sql, [
      waterLevelHigh || 5,
      waterLevelMedium || 3,
      peopleCountMany || 5,
      peopleCountFew || 2,
      bedridden || 4,
      elderly || 2,
      severityFactor || 2
    ]);

    return NextResponse.json({ success: true, message: 'Settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Update AI Triage settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
