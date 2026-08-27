import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const sql = `
      SELECT * FROM user_activity_log
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await query(sql, [parseInt(limit), parseInt(offset)]) as any[];

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM user_activity_log') as any[];
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Fetch activity logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, action, ip_address, status = 'success' } = body;

    const result = await query(
      'INSERT INTO user_activity_log (user_id, action, ip_address, status) VALUES (?, ?, ?, ?)',
      [user_id, action, ip_address, status]
    );

    return NextResponse.json(
      { id: (result as any).insertId, message: 'Activity logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Log activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
