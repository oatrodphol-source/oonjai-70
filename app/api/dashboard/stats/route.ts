import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Total Stats
    const totalQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('wait', 'pending') THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status IN ('in_progress', 'accepted') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM cases
    `;
    const totalResult = await query(totalQuery) as any[];
    const stats = totalResult[0] || { total: 0, waiting: 0, in_progress: 0, completed: 0 };

    // 2. Pie Chart Data (Rescue teams or status distribution)
    // For now, let's distribute by severity to show something if we don't have teams mapped
    const pieQuery = `
      SELECT type as name, COUNT(*) as value
      FROM cases
      GROUP BY type
      ORDER BY value DESC
      LIMIT 5
    `;
    const pieData = await query(pieQuery) as any[];

    // 3. Severity Bar Data
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM cases
      GROUP BY severity
      ORDER BY severity DESC
    `;
    const severityData = await query(severityQuery) as any[];
    
    // 4. Recent Cases
    const recentQuery = `
      SELECT id, name, type, severity, createdAt as time, status
      FROM cases
      ORDER BY createdAt DESC
      LIMIT 5
    `;
    const recentCases = await query(recentQuery) as any[];

    return NextResponse.json({
      stats: {
        total: Number(stats.total) || 0,
        waiting: Number(stats.waiting) || 0,
        inProgress: Number(stats.in_progress) || 0,
        completed: Number(stats.completed) || 0,
      },
      pieData: pieData.length > 0 ? pieData : [{ name: 'ไม่มีข้อมูล', value: 1 }],
      severityData: severityData.map(d => ({
        level: `ระดับ ${d.severity}`,
        count: Number(d.count)
      })),
      recentCases: recentCases.map(row => ({
        id: `CAS-${String(row.id).padStart(3, '0')}`,
        name: row.name,
        type: row.type,
        severity: row.severity,
        time: new Date(row.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        status: mapStatus(row.status),
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapStatus(dbStatus: string) {
  switch(dbStatus) {
    case 'wait': 
    case 'pending': return 'รอการช่วยเหลือ';
    case 'accepted': return 'รับเรื่องแล้ว';
    case 'in_progress': return 'กำลังช่วยเหลือ';
    case 'completed': return 'เสร็จสิ้น';
    case 'cancelled': return 'ยกเลิก';
    default: return dbStatus;
  }
}
