'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { StatsCard } from '@/components/backend/StatsCard';
import { PieChart } from '@/components/backend/PieChart';
import { VolunteerTaskBoard } from '@/components/backend/VolunteerTaskBoard';
import { Card } from '@/components/ui/Card';
import { getSeverityBadgeStyle } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Users, Bot, ArrowRight, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [latestFilter, setLatestFilter] = useState('all');
  const [quickViewCase, setQuickViewCase] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState({
    total: 0, pending: 0, inProgress: 0, completed: 0,
    severity: { s5: 0, s4: 0, s3: 0, s2: 0, s1: 0 },
    latestCases: [] as any[],
    delayedCases: [] as any[],
    pieData: [{ name: 'ไม่มีข้อมูล', value: 1 }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [role, setRole] = useState<string>('volunteer');
  const [aiInsight, setAiInsight] = useState<string>('กำลังวิเคราะห์ข้อมูล...');
  const [volStatus, setVolStatus] = useState({ total: 0, busy: 0, available: 0 });

  useEffect(() => {
    const fetchVolunteers = async () => {
      let availableCount = 0;
      let totalCount = 0;
      let busyCount = 0;

      // 1. Fetch from volunteers
      const { data: volunteersData } = await supabase.from('volunteers').select('id, is_online');
      if (volunteersData) {
        totalCount = volunteersData.length;
        availableCount = volunteersData.filter((v: any) => v.is_online === true).length;
      }

      // 2. Fetch busy from cases (Unique volunteer_id)
      const { data: casesData } = await supabase
        .from('cases')
        .select('volunteer_id')
        .eq('status', 'in_progress')
        .not('volunteer_id', 'is', null);

      if (casesData) {
        const uniqueVolunteers = new Set();
        casesData.forEach((c: any) => {
          uniqueVolunteers.add(c.volunteer_id);
        });
        busyCount = uniqueVolunteers.size;
      }

      setVolStatus({
        total: totalCount,
        available: availableCount,
        busy: busyCount
      });
    };

    const userStr = localStorage.getItem('oonjai_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setRole(user.role || 'volunteer');
      } catch (e) {
        setRole('volunteer');
      }
    }
    
    const fetchCases = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
          let t=0, p=0, i=0, c=0;
          let s5=0, s4=0, s3=0, s2=0, s1=0;
          const latest: any[] = [];
          const allPending: any[] = [];
          const typeCount: Record<string, number> = {};
          const locationCount: Record<string, number> = {};
          
          data.forEach((d: any) => {
            t++;
            
            const stat = String(d.status || '').toLowerCase();
            
            // Extract attributes needed across multiple blocks
            const sev = String(d.severity || d.level || 1).match(/\d+/);
            const sevNum = sev ? parseInt(sev[0], 10) : 1;
            const type = d.type || 'ไม่ระบุ';
            
            // Status counts
            if (stat === 'pending') {
              p++;
              allPending.push({
                id: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
                name: d.name || 'ไม่ระบุชื่อ',
                type: type,
                severity: sevNum,
                time: d.created_at ? new Date(d.created_at).toLocaleString('th-TH') : '-',
                created_at: new Date(d.created_at).getTime(),
                status: stat,
                phone: d.phone || '-'
              });
            }
            else if (stat === 'in_progress') i++;
            else if (stat === 'resolved') c++;
            
            // Severity counts
            if (sevNum === 5) s5++;
            else if (sevNum === 4) s4++;
            else if (sevNum === 3) s3++;
            else if (sevNum === 2) s2++;
            else s1++;

            // Type counts for PieChart
            typeCount[type] = (typeCount[type] || 0) + 1;

            // Location count for AI insight
            if (sevNum === 5) {
              const loc = d.address || d.location || d.subdistrict || 'พื้นที่ไม่ระบุ';
              locationCount[loc] = (locationCount[loc] || 0) + 1;
            }

            // Collect top 20 latest for filtering (exclude resolved)
            if (latest.length < 20 && stat !== 'resolved') {
              latest.push({
                id: d.case_number ? `CAS-${String(d.case_number).padStart(3, '0')}` : `CAS-${String(d.id).substring(0, 5)}`,
                dbId: d.id,
                name: d.name || 'ไม่ระบุชื่อ',
                type: type,
                severity: sevNum,
                time: d.created_at ? new Date(d.created_at).toLocaleString('th-TH') : '-',
                status: stat || 'pending',
                phone: d.phone || 'ไม่ระบุ',
                location: d.location || d.address || d.subdistrict || 'ไม่ระบุพื้นที่',
                details: d.details || '-'
              });
            }
          });

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
          
          const pieData = Object.keys(typeCount).map(key => ({
            name: key,
            value: typeCount[key]
          }));

          allPending.sort((a, b) => {
            if (b.severity !== a.severity) return b.severity - a.severity; // Severity DESC (5 to 1)
            return a.created_at - b.created_at; // Wait time ASC (Oldest first)
          });
          const delayed = allPending.slice(0, 4);

          setDashboardData({
            total: t, pending: p, inProgress: i, completed: c,
            severity: { s5, s4, s3, s2, s1 },
            latestCases: latest,
            delayedCases: delayed,
            pieData: pieData.length > 0 ? pieData : [{ name: 'ไม่มีข้อมูล', value: 1 }]
          });

          setError(false);
        }
      } catch (err) {
        console.error('Error processing dashboard stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVolunteers();
    fetchCases();

    const channel = supabase.channel('dashboard-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        fetchCases();
        fetchVolunteers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, () => {
        fetchVolunteers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  if (error) {
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
      <DashboardHeader title={isAdmin ? "แดชบอร์ดภาพรวม" : "แดชบอร์ดอาสาสมัคร"} />
      
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard 
            title="เคสทั้งหมด" 
            value={dashboardData.total.toString()} 
            icon={Users} 
            colorClass="text-blue-500 bg-blue-100 dark:bg-blue-900/30" 
          />
          <StatsCard 
            title="รอการช่วยเหลือ" 
            value={dashboardData.pending.toString()} 
            icon={Clock} 
            colorClass="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" 
          />
          <StatsCard 
            title="กำลังดำเนินการ" 
            value={dashboardData.inProgress.toString()} 
            icon={AlertCircle} 
            colorClass="text-purple-500 bg-purple-100 dark:bg-purple-900/30" 
          />
          <StatsCard 
            title="ช่วยเหลือเสร็จสิ้น" 
            value={dashboardData.completed.toString()} 
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
                <PieChart data={dashboardData.pieData} />
              </Card>
              
              <Card>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">จำนวนเคสแยกตามความรุนแรง</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16">ระดับ 5</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${dashboardData.total > 0 ? (dashboardData.severity.s5 / dashboardData.total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-bold">{dashboardData.severity.s5}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16">ระดับ 4</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${dashboardData.total > 0 ? (dashboardData.severity.s4 / dashboardData.total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-bold">{dashboardData.severity.s4}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16">ระดับ 3</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-yellow-500 h-full rounded-full transition-all duration-500" style={{ width: `${dashboardData.total > 0 ? (dashboardData.severity.s3 / dashboardData.total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-bold">{dashboardData.severity.s3}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16">ระดับ 2</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${dashboardData.total > 0 ? (dashboardData.severity.s2 / dashboardData.total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-bold">{dashboardData.severity.s2}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-16">ระดับ 1</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${dashboardData.total > 0 ? (dashboardData.severity.s1 / dashboardData.total) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-8 text-right font-bold">{dashboardData.severity.s1}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Layout for Recent Cases and Active Volunteers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              
              {/* Main Content: Recent Cases */}
              <div className="lg:col-span-2">
                <Card className="h-full flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">เคสฉุกเฉินล่าสุด</h3>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setLatestFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${latestFilter === 'all' ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>ทั้งหมด</button>
                      <button onClick={() => setLatestFilter('s5')} className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${latestFilter === 's5' ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-500/20' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400'}`}>เฉพาะระดับ 5</button>
                      <button onClick={() => setLatestFilter('pending')} className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${latestFilter === 'pending' ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm shadow-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800/50 dark:text-yellow-400'}`}>รอดำเนินการ</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    {(() => {
                      const filtered = dashboardData.latestCases.filter((c: any) => {
                        if (latestFilter === 's5') return c.severity === 5;
                        if (latestFilter === 'pending') return c.status === 'pending';
                        return true;
                      }).slice(0, 5);

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            ไม่มีเคสที่ตรงกับเงื่อนไข
                          </div>
                        );
                      }

                      return filtered.map((row: any, i: number) => (
                        <div key={i} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-900/50 transition-all gap-3 cursor-pointer" onClick={() => setQuickViewCase(row)}>
                          <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{row.id}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadgeStyle(row.severity || 1)}`}>
                                  ระดับ {row.severity}
                                </span>
                                {row.nearbyCount > 0 && (
                                  <span title={`มี ${row.nearbyCount} เคสใกล้เคียงรัศมี 500 ม.`} className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                    ⚠️ ใกล้เคียง
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">{row.type}</div>
                          </div>
                          
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-50 dark:border-gray-800">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                              {row.status === 'pending' ? 'รอการช่วยเหลือ' : 'กำลังดำเนินการ'}
                            </span>
                            <div className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                              <span>ดูรายละเอียด</span> <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                    <Link href="/cases" className="text-gray-500 hover:text-[#ff6600] dark:text-gray-400 text-sm font-medium transition-colors inline-flex items-center gap-1">
                      ดูเคสทั้งหมดในระบบ <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </Card>
              </div>
              
              {/* Side Content: Active Volunteers */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">กำลังพลอาสาสมัคร (Live)</h3>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">พร้อมปฏิบัติงาน</span>
                      </div>
                      <span className="font-bold text-xl text-slate-900 dark:text-white">{volStatus.available}</span>
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">กำลังช่วยเคสฉุกเฉิน</span>
                      </div>
                      <span className="font-bold text-xl text-slate-900 dark:text-white">{volStatus.busy}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500 font-medium text-sm">กองกำลังทั้งหมดในระบบ</span>
                    <span className="font-extrabold text-2xl text-blue-600 dark:text-blue-400">{volStatus.total}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Delayed Cases Layer */}
            {dashboardData.delayedCases && dashboardData.delayedCases.length > 0 && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-red-200 shadow-lg shadow-red-500/10 bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-slate-900 dark:border-red-900/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400">เคสตกค้างรอนานสุด (ต้องการความช่วยเหลือด่วน)</h3>
                        <p className="text-sm text-red-500 dark:text-red-300">จัดอันดับตามระดับความรุนแรงและระยะเวลาที่ส่งคำร้อง</p>
                      </div>
                    </div>
                    <Link href="/cases" className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                      จัดการเคสทั้งหมด <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dashboardData.delayedCases.map((row: any, i: number) => {
                      const waitMins = Math.max(0, Math.floor((new Date().getTime() - row.created_at) / 60000));
                      const waitText = waitMins >= 60 ? `${Math.floor(waitMins/60)} ชม. ${waitMins%60} นาที` : `${waitMins} นาที`;
                      return (
                        <div key={i} className="flex flex-col p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                          <div className="flex justify-between items-start mb-2 pl-1">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 dark:text-white text-lg leading-none">{row.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${getSeverityBadgeStyle(row.severity || 1)}`}>
                                ระดับ {row.severity}
                              </span>
                            </div>
                            <div className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                              <Clock className="w-3 h-3" /> {waitText}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2 pl-1 line-clamp-2 min-h-[40px]">{row.type}</div>
                          <div className="flex justify-between items-end mt-auto pt-2 text-xs text-gray-500 pl-1 border-t border-gray-50 dark:border-gray-800">
                            <span className="truncate max-w-[120px]">ผู้แจ้ง: {row.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Volunteer Task Board */}
        {!isAdmin && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              🔥 เคสเร่งด่วนสูงสุด (Top 3)
            </h2>
            <VolunteerTaskBoard severityFilter="5" limit={3} excludeResolved={true} />
            <div className="mt-6 flex justify-end">
              <Link href="/cases" className="text-[#ff6600] font-medium hover:underline flex items-center gap-1">
                ดูเคสทั้งหมด <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Quick View Modal */}
      {quickViewCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setQuickViewCase(null)}>
          <div className="bg-white dark:bg-[#151b2c] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${quickViewCase.severity === 5 ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800'} flex justify-between items-center`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-gray-900 dark:text-white">{quickViewCase.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityBadgeStyle(quickViewCase.severity || 1)}`}>
                  ระดับ {quickViewCase.severity}
                </span>
              </div>
              <button onClick={() => setQuickViewCase(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ประเภทเหตุฉุกเฉิน</h4>
                <p className="font-semibold text-gray-900 dark:text-white text-base">{quickViewCase.type}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">เบอร์ติดต่อ</h4>
                  <p className="font-bold text-blue-600 dark:text-blue-400">{quickViewCase.phone}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">สถานะปัจจุบัน</h4>
                  <p className={`font-bold ${quickViewCase.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {quickViewCase.status === 'pending' ? 'รอการช่วยเหลือ' : 'กำลังดำเนินการ'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">สถานที่เกิดเหตุ</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{quickViewCase.location}</p>
              </div>

              {quickViewCase.details && quickViewCase.details !== '-' && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">รายละเอียดเพิ่มเติม</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{quickViewCase.details}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-800/30 flex gap-3">
              <Link href={`/cases`} className="flex-1 text-center py-2.5 px-4 bg-[#ff6600] hover:bg-[#e65c00] text-white rounded-xl font-bold transition-colors shadow-sm shadow-orange-500/20" onClick={() => setQuickViewCase(null)}>
                จัดการเคสนี้แบบเต็ม
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
