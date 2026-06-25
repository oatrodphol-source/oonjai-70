'use client';
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Activity, Clock, HeartPulse, Home, CheckCircle2 } from 'lucide-react';

export default function HistoryPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ completedCount: 0, avgDisplay: '-' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('oonjai_user');
    if (!userStr) {
      setLoading(false);
      return;
    }

    let uid = '';
    try {
      const user = JSON.parse(userStr);
      uid = user.uid;
    } catch (e) {
      setLoading(false);
      return;
    }

    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'cases'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const terminalStates = ['ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'เสร็จสิ้น', 'completed'];
      const fetched: any[] = [];
      let totalDiffMs = 0;
      let completedCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.assigned_volunteer_id === uid && terminalStates.includes(data.status)) {
          const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 
                           (data.created_at ? new Date(data.created_at).getTime() : 0);
          const completedAt = data.completedAt ? new Date(data.completedAt).getTime() : 
                              (data.updatedAt ? new Date(data.updatedAt).getTime() : 0);
          
          if (createdAt > 0 && completedAt > createdAt) {
            totalDiffMs += (completedAt - createdAt);
          }
          completedCount++;

          fetched.push({
            id: data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${doc.id.substring(0, 5)}`,
            type: data.type || 'ไม่ระบุ',
            status: data.status,
            timeCreated: createdAt > 0 ? new Date(createdAt).toLocaleString('th-TH') : '-',
            timeCompleted: completedAt > 0 ? new Date(completedAt).toLocaleString('th-TH') : '-',
            timestamp: completedAt,
            latitude: data.latitude || '-',
            longitude: data.longitude || '-',
            description: data.details || data.description || '',
            volunteer_id: data.assigned_volunteer_name || data.assigned_volunteer_id || ''
          });
        }
      });

      fetched.sort((a, b) => b.timestamp - a.timestamp);
      setCases(fetched);

      const avgDiffMs = completedCount > 0 ? totalDiffMs / completedCount : 0;
      const avgMinutes = Math.floor(avgDiffMs / 60000);
      const avgHours = Math.floor(avgMinutes / 60);
      const avgDisplay = avgHours > 0 ? `${avgHours} ชั่วโมง ${avgMinutes % 60} นาที` : `${avgMinutes} นาที`;
      
      setStats({ completedCount, avgDisplay });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'นำส่งโรงพยาบาลแล้ว') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold whitespace-nowrap">
          <HeartPulse className="w-3.5 h-3.5" />
          ส่งโรงพยาบาล
        </span>
      );
    }
    if (status === 'ส่งเข้าศูนย์พักพิงสำเร็จ') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold whitespace-nowrap">
          <Home className="w-3.5 h-3.5" />
          ศูนย์พักพิง
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold whitespace-nowrap">
        <Activity className="w-3.5 h-3.5" />
        {status === 'completed' || status === 'เสร็จสิ้น' ? 'เสร็จสิ้น' : status}
      </span>
    );
  };

  return (
    <>
      <DashboardHeader title="ประวัติการช่วยเหลือของฉัน" />
      <div className="max-w-7xl mx-auto py-6 pb-32 md:pb-10 space-y-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 border-0">
            <h3 className="text-emerald-100 font-medium mb-1">เคสที่ช่วยเหลือสำเร็จ</h3>
            <p className="text-4xl font-bold">{stats.completedCount}</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/20 border-0">
            <h3 className="text-orange-100 font-medium mb-1">เวลาเฉลี่ยในการปิดเคส</h3>
            <p className="text-4xl font-bold">{stats.completedCount > 0 ? stats.avgDisplay : '-'}</p>
          </Card>
        </div>

        {/* History List */}
        <Card className="p-6 border-0 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">รายการประวัติ</h3>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">กำลังโหลดประวัติ...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              ยังไม่มีประวัติการช่วยเหลือที่เสร็จสิ้น
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c, i) => (
                <div key={i} className="bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{c.id}</span>
                        {getStatusBadge(c.status)}
                      </div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.type}</div>
                    </div>
                    
                    <div className="flex flex-col items-start sm:items-end text-xs text-gray-500 gap-1 mt-2 sm:mt-0">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>แจ้งเหตุ: {c.timeCreated}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ปิดเคส: {c.timeCompleted}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline self-start"
                  >
                    {expandedId === c.id ? 'ซ่อนรายละเอียด ▴' : 'ดูรายละเอียด ▾'}
                  </button>
                  
                  {expandedId === c.id && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm border border-slate-100 dark:border-slate-700 space-y-2 animate-in slide-in-from-top-2">
                      <p><span className="font-semibold text-slate-500">รหัสเคส:</span> {c.id}</p>
                      <p><span className="font-semibold text-slate-500">พิกัด:</span> {c.latitude}, {c.longitude}</p>
                      <p><span className="font-semibold text-slate-500">รายละเอียด:</span> {c.description || 'ไม่มีข้อมูลเพิ่มเติม'}</p>
                      <p><span className="font-semibold text-slate-500">ผู้รับผิดชอบ:</span> {c.volunteer_id || 'ไม่ระบุ'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
