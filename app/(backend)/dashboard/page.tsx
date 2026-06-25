'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { StatsCard } from '@/components/backend/StatsCard';
import { PieChart } from '@/components/backend/PieChart';
import { SeverityBar } from '@/components/backend/SeverityBar';
import { VolunteerTaskBoard } from '@/components/backend/VolunteerTaskBoard';
import { Card } from '@/components/ui/Card';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Users, Bot, ArrowRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [role, setRole] = useState<string>('volunteer');
  const [aiInsight, setAiInsight] = useState<string>('กำลังวิเคราะห์ข้อมูล...');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('oonjai_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setRole(user.role || 'volunteer');
      } catch (e) {
        setRole('volunteer');
      }
    }
    
    const casesRef = collection(db, 'cases');
    const q = query(casesRef); // Fetch all

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        let total = 0;
        let waiting = 0;
        let inProgress = 0;
        let completed = 0;
        
        const typeCount: Record<string, number> = {};
        const severityCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const allCases: any[] = [];
        const locationCount: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const caseData = doc.data();
          total++;
          
          const status = caseData.status || '';
          if (['wait', 'รอการช่วยเหลือ', 'pending', 'รอดำเนินการ'].includes(status)) {
            waiting++;
          } else if (['in_progress', 'กำลังช่วยเหลือ', 'กำลังเข้าช่วยเหลือ', 'กำลังดำเนินการ', 'accepted'].includes(status)) {
            inProgress++;
          } else if (['เสร็จสิ้น', 'ส่งเข้าศูนย์พักพิงสำเร็จ', 'มอบถุงยังชีพเสร็จสิ้น', 'นำส่งโรงพยาบาลแล้ว', 'completed'].includes(status)) {
            completed++;
          }

          const type = caseData.type || 'ไม่ระบุ';
          typeCount[type] = (typeCount[type] || 0) + 1;

          const severity = Number(caseData.severity) || 1;
          if (severity >= 1 && severity <= 5) {
            severityCount[severity] = (severityCount[severity] || 0) + 1;
          }

          if (severity === 5) {
            const loc = caseData.address || caseData.location || caseData.subdistrict || 'พื้นที่ไม่ระบุ';
            locationCount[loc] = (locationCount[loc] || 0) + 1;
          }

          allCases.push({
            id: caseData.case_number ? `CAS-${String(caseData.case_number).padStart(3, '0')}` : `CAS-${doc.id.substring(0, 5)}`,
            name: caseData.name || caseData.contactName || 'ไม่ระบุชื่อ',
            type: type,
            severity: severity,
            time: caseData.createdAt ? new Date(caseData.createdAt).toLocaleString('th-TH') : (caseData.created_at ? new Date(caseData.created_at).toLocaleString('th-TH') : '-'),
            status: status === 'wait' || status === 'pending' ? 'รอการช่วยเหลือ' : status,
            timestamp: caseData.createdAt ? new Date(caseData.createdAt).getTime() : (caseData.created_at ? new Date(caseData.created_at).getTime() : 0)
          });
        });

        const pieData = Object.keys(typeCount).map(key => ({
          name: key,
          value: typeCount[key]
        }));

        const severityData = [
          { name: 'ระดับ 1', count: severityCount[1] },
          { name: 'ระดับ 2', count: severityCount[2] },
          { name: 'ระดับ 3', count: severityCount[3] },
          { name: 'ระดับ 4', count: severityCount[4] },
          { name: 'ระดับ 5', count: severityCount[5] },
        ];

        allCases.sort((a, b) => b.timestamp - a.timestamp);
        const recentCases = allCases.slice(0, 5);

        let maxLoc = '';
        let maxCount = 0;
        Object.entries(locationCount).forEach(([loc, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxLoc = loc;
          }
        });

        if (maxCount > 0) {
          setAiInsight(`🤖 AI Analysis: ขณะนี้พบเคสวิกฤต (ระดับ 5) หนาแน่นที่สุดในบริเวณ ${maxLoc} (${maxCount} เคส) โปรดจัดเตรียมเรือท้องแบนและอุปกรณ์ชำนาญการพิเศษมุ่งหน้าไปยังพื้นที่ดังกล่าวเป็นลำดับแรก`);
        } else {
          setAiInsight(`🤖 AI Analysis: ขณะนี้ยังไม่พบการกระจุกตัวของเคสวิกฤต (ระดับ 5) ในพื้นที่ใดเป็นพิเศษ สถานการณ์โดยรวมอยู่ในระดับที่ควบคุมได้`);
        }

        setData({
          stats: { total, waiting, inProgress, completed },
          pieData: pieData.length > 0 ? pieData : [{ name: 'ไม่มีข้อมูล', value: 1 }],
          severityData,
          recentCases
        });
        setError(false);
      } catch (err) {
        console.error('Error processing dashboard stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Failed to fetch dashboard stats', err);
      setError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <>
        <DashboardHeader title="กำลังโหลดข้อมูล..." />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <DashboardHeader title="เกิดข้อผิดพลาด" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">ไม่สามารถดึงข้อมูลสถิติได้</h3>
          <p className="text-gray-500 mt-2">กรุณาลองใหม่อีกครั้งในภายหลัง</p>
        </div>
      </>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <>
      <DashboardHeader title="แดชบอร์ดภาพรวม" />
      
      <div className="space-y-6 max-w-7xl mx-auto py-6 pb-32 md:pb-10">
        {/* Volunteer AI Insight Card */}
        {!isAdmin && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-black/20 rounded-full shadow-sm text-orange-600 flex-shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI ช่วยวิเคราะห์สถานการณ์</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {aiInsight}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row (Shared) */}
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

        {/* Admin Only Charts and Recent Cases */}
        {isAdmin && (
          <>
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

            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">เคสฉุกเฉินล่าสุด</h3>
                <Link href="/cases" className="text-[#ff6600] text-sm font-medium hover:underline flex items-center gap-1">
                  ดูทั้งหมด <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="space-y-4">
                {data.recentCases.length > 0 ? data.recentCases.map((row: any, i: number) => (
                  <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-shadow gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{row.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityBadgeStyle(row.severity || 1)}`}>
                          ระดับ {row.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">{row.type}</div>
                      <div className="text-xs text-gray-500">ผู้แจ้ง: {row.name}</div>
                    </div>
                    
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.status === 'รอการช่วยเหลือ' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        {row.status}
                      </span>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {row.time}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    ไม่มีเคสใหม่
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* Volunteer Task Board */}
        {!isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              🔥 เคสเร่งด่วนสูงสุด (Top 3)
            </h2>
            <VolunteerTaskBoard severityFilter="5" limit={3} />
            <div className="mt-6 flex justify-end">
              <Link href="/cases" className="text-[#ff6600] font-medium hover:underline flex items-center gap-1">
                ดูเคสทั้งหมด <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 bg-white dark:bg-[#111c35] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">📝 ประวัติการทำงานล่าสุด (Audit Log)</h3>
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Live</span>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            
            {auditLogs.length > 0 ? auditLogs.map((log) => (
              <div key={log.id} className="flex gap-3 items-start border-b border-slate-50 dark:border-slate-800/50 pb-3 last:border-0">
                <div className="text-xs text-slate-400 mt-0.5 w-12 shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : ''}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-blue-600">{log.user}:</span> {log.action}
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">ไม่มีประวัติการทำงาน</div>}
          </div>
        </div>
      </div>
    </>
  );
}
