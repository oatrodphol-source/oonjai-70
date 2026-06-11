import React from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { query } from '@/lib/db';
import { getUser } from '@/lib/auth';

export default async function HistoryPage() {
  const user = await getUser();
  // Default to 1 or something for testing if no user
  const rescuerId = user?.id || 1; 

  const sql = `
    SELECT c.* 
    FROM cases c
    JOIN statusupdate su ON c.id = su.incidentId
    WHERE su.rescuerId = ? AND c.status IN ('completed', 'cancelled')
    GROUP BY c.id
    ORDER BY c.updatedAt DESC
  `;
  const cases = await query(sql, [rescuerId]) as any[];

  // Calculate average time
  let totalDiffMs = 0;
  let completedCount = 0;
  cases.forEach(c => {
    if (c.status === 'completed') {
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.updatedAt).getTime();
      totalDiffMs += (end - start);
      completedCount++;
    }
  });
  
  const avgDiffMs = completedCount > 0 ? totalDiffMs / completedCount : 0;
  const avgMinutes = Math.floor(avgDiffMs / 60000);
  const avgHours = Math.floor(avgMinutes / 60);
  const avgDisplay = avgHours > 0 ? `${avgHours} ชั่วโมง ${avgMinutes % 60} นาที` : `${avgMinutes} นาที`;

  return (
    <>
      <DashboardHeader title="ประวัติการช่วยเหลือของฉัน" />
      <div className="max-w-7xl mx-auto py-6 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border-0">
            <h3 className="text-emerald-100 font-medium mb-1">เคสที่ช่วยเหลือสำเร็จ</h3>
            <p className="text-4xl font-bold">{completedCount}</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/20 border-0">
            <h3 className="text-orange-100 font-medium mb-1">เวลาเฉลี่ยในการปิดเคส</h3>
            <p className="text-4xl font-bold">{completedCount > 0 ? avgDisplay : '-'}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">รายการประวัติ</h3>
          {cases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ยังไม่มีประวัติการช่วยเหลือ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500">
                    <th className="py-3 px-4 font-semibold">รหัสเคส</th>
                    <th className="py-3 px-4 font-semibold">ประเภท</th>
                    <th className="py-3 px-4 font-semibold">สถานะ</th>
                    <th className="py-3 px-4 font-semibold">เวลาแจ้งเหตุ</th>
                    <th className="py-3 px-4 font-semibold">เวลาปิดเคส</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#151b2c] transition-colors">
                      <td className="py-3 px-4 font-medium">CAS-{String(c.id).padStart(3, '0')}</td>
                      <td className="py-3 px-4">{c.type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {c.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(c.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(c.updatedAt).toLocaleString('th-TH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
