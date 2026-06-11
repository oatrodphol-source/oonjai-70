'use client';
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { StatsCard } from '@/components/backend/StatsCard';
import { PieChart } from '@/components/backend/PieChart';
import { SeverityBar } from '@/components/backend/SeverityBar';
import { Card } from '@/components/ui/Card';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <>
        <DashboardHeader title="แดชบอร์ดภาพรวม" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="แดชบอร์ดภาพรวม" />
      
      <div className="space-y-6 max-w-7xl mx-auto py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="เคสทั้งหมด" 
            value={data.stats.total.toString()} 
            icon={Users} 
            colorClass="text-blue-500 bg-blue-100 dark:bg-blue-900/30" 
          />
          <StatsCard 
            title="รอการช่วยเหลือ" 
            value={data.stats.waiting.toString()} 
            icon={Clock} 
            colorClass="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" 
          />
          <StatsCard 
            title="กำลังดำเนินการ" 
            value={data.stats.inProgress.toString()} 
            icon={AlertCircle} 
            colorClass="text-purple-500 bg-purple-100 dark:bg-purple-900/30" 
          />
          <StatsCard 
            title="ช่วยเหลือเสร็จสิ้น" 
            value={data.stats.completed.toString()} 
            icon={CheckCircle2} 
            colorClass="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30" 
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">สัดส่วนประเภทเหตุฉุกเฉิน</h3>
            <PieChart data={data.pieData} />
          </Card>
          
          <Card>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">จำนวนเคสแยกตามความรุนแรง</h3>
            <SeverityBar data={data.severityData} />
          </Card>
        </div>

        {/* Recent Cases */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">เคสฉุกเฉินล่าสุด</h3>
            <button className="text-[#ff6600] text-sm font-medium hover:underline">ดูทั้งหมด</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 font-medium">รหัสเคส</th>
                  <th className="pb-3 font-medium">ผู้แจ้ง</th>
                  <th className="pb-3 font-medium">ประเภทเหตุ</th>
                  <th className="pb-3 font-medium">ระดับ</th>
                  <th className="pb-3 font-medium">เวลา</th>
                  <th className="pb-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.recentCases.length > 0 ? data.recentCases.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 font-medium text-gray-900 dark:text-white">{row.id}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-300">{row.name}</td>
                    <td className="py-4 text-gray-600 dark:text-gray-300">{row.type}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.severity >= 4 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                        ระดับ {row.severity}
                      </span>
                    </td>
                    <td className="py-4 text-gray-500 text-sm">{row.time}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'รอการช่วยเหลือ' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">ไม่มีเคสใหม่</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
