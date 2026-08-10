'use client';
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';
export default function ReportDashboardPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('cases');
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [role, setRole] = useState<string>('volunteer');
  
  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', cc: '', subject: 'รายงานสรุปเคสภัยพิบัติประจำวัน', message: '', attachment: 'pdf' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stored = localStorage.getItem('oonjai_user');
        if (stored) {
          const user = JSON.parse(stored);
          setRole(user.role || 'volunteer');
        }

        const { data: snapshot, error } = await supabase.from('cases').select('*');
        if (error) throw error;

        const fetchedCases = (snapshot || []).map(d => ({ ...d, id: String(d.id) }));
        setCases(fetchedCases);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('custom-report-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const COMPLETED_STATUSES = [
    "ปลอดภัยแล้ว", 
    "ส่งเข้าศูนย์พักพิงสำเร็จ", 
    "มอบถุงยังชีพเสร็จสิ้น", 
    "นำส่งโรงพยาบาลแล้ว", 
    "เสร็จสิ้น", 
    "ยุติการช่วยเหลือ",
    "completed"
  ];

  const today = new Date().toISOString().split('T')[0];
  const todayCases = cases.filter(c => {
    const d = c.created_at;
    return d && d.startsWith(today);
  });
  const todayTotal = todayCases.length;
  const todayCompleted = todayCases.filter(c => COMPLETED_STATUSES.includes(c.status)).length;
  const todayActive = todayTotal - todayCompleted;

  const getTriageColor = (level: number) => {
    switch(level) {
      case 5: return 'bg-red-500';
      case 4: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-blue-500';
      case 1: default: return 'bg-green-500';
    }
  };

  const getTriageLabel = (level: number) => {
    switch(level) {
      case 5: return 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)';
      case 4: return 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)';
      case 3: return 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)';
      case 2: return 'พื้นที่เฝ้าระวัง (ระดับ 2)';
      case 1: default: return 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)';
    }
  };

  // Dynamic Filtering for KPIs
  const filteredCases = React.useMemo(() => {
    return cases.filter(c => {
      if (!startDate && !endDate) return true;
      const dateField = c.created_at || c.timestamp || '';
      if (!dateField) return false;
      
      const itemDateStr = dateField.split('T')[0];
      const itemDate = new Date(itemDateStr).getTime();
      
      const sDate = startDate ? new Date(startDate).getTime() : 0;
      const eDate = endDate ? new Date(endDate).getTime() : Infinity;
      
      return itemDate >= sDate && itemDate <= eDate;
    });
  }, [cases, startDate, endDate]);

  const reportStats = React.useMemo(() => {
    let t=0, c=0, i=0, l5=0, l4=0, l3=0, l2=0, l1=0;
    filteredCases.forEach(d => {
      t++;
      const status = d.status || '';
      if(COMPLETED_STATUSES.includes(status)) c++;
      else if(['in_progress'].includes(status)) i++;
      
      if (String(d.severity) === '5') l5++;
      else if (String(d.severity) === '4') l4++;
      else if (String(d.severity) === '3') l3++;
      else if (String(d.severity) === '2') l2++;
      else if (String(d.severity) === '1' || !d.severity) l1++;
    });
    const rate = t > 0 ? ((c / t) * 100).toFixed(1) : '0.0';
    return { total: t, completed: c, inProgress: i, successRate: rate, l5, l4, l3, l2, l1 };
  }, [filteredCases]);

  const handleSendEmail = () => {
    if (!emailData.to) {
      alert('กรุณาระบุอีเมลผู้รับ');
      return;
    }
    setIsSendingEmail(true);
    // Simulate API call
    setTimeout(() => {
      setIsSendingEmail(false);
      setIsEmailModalOpen(false);
      alert('ส่งรายงานผ่านอีเมลเรียบร้อยแล้ว!');
      setEmailData({ to: '', cc: '', subject: 'รายงานสรุปเคสภัยพิบัติประจำวัน', message: '', attachment: 'pdf' });
    }, 1500);
  };

  const handleExportCSV = async () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert('กรุณาเลือกวันที่ให้ครบทั้งสองช่อง (เริ่มต้น - สิ้นสุด) หรือไม่ต้องเลือกเลยเพื่อดึงข้อมูลทั้งหมด');
      return;
    }

    setIsExporting(true);
    try {
      const targetCollection = 
        exportType === 'users' ? 'volunteers' : 
        exportType === 'logs' ? 'activity_logs' : 
        exportType === 'safe' ? 'safe_reports' : 
        'cases';
      const dateField = (exportType === 'logs' || exportType === 'safe') ? 'timestamp' : 'created_at';

      let req = supabase.from(targetCollection).select('*');

      if (startDate && endDate) {
        const startIso = new Date(`${startDate}T00:00:00`).toISOString();
        const endIso = new Date(`${endDate}T23:59:59`).toISOString();
        req = req.gte(dateField, startIso).lte(dateField, endIso);
      }

      const { data: rawData, error } = await req;
      
      if (error || !rawData || rawData.length === 0) {
        alert('ไม่มีข้อมูลในช่วงเวลาที่เลือก');
        setIsExporting(false);
        return;
      }

      const data = rawData.map(doc => ({ ...doc, id: String(doc.id) }));
      
      const headers = Array.from(new Set(data.flatMap(Object.keys)));
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
          let cellData = row[fieldName] === null || row[fieldName] === undefined ? '' : String(row[fieldName]);
          cellData = cellData.replace(/"/g, '""');
          return `"${cellData}"`;
        }).join(','))
      ].join('\n');

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const dateSuffix = startDate ? `_${startDate}_to_${endDate}` : '_AllTime';
      link.setAttribute('download', `OonJai_${exportType}${dateSuffix}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader title="รายงานและส่งออก" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="รายงานและส่งออก" />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-8 pb-32 md:pb-10 print:w-full print:max-w-none print:py-0 print:space-y-6">
        
        {/* Global Date Filter */}
        <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            ตัวกรองข้อมูลรายงาน
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="flex-1 md:w-40 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              title="ตั้งแต่วันที่"
            />
            <span className="text-slate-500">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="flex-1 md:w-40 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              title="ถึงวันที่"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium underline"
              >
                ล้างค่า
              </button>
            )}
          </div>
        </div>

        {/* Daily Summary Section */}
        <Card className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30 rounded-2xl shadow-sm print:shadow-none print:border-gray-300 mb-8">
          <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-2">
            📅 สรุปยอดประจำวัน (วันนี้)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-center items-center">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">แจ้งเหตุวันนี้</span>
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{todayTotal}</span>
            </div>
            <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-center items-center">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">รอดำเนินการวันนี้</span>
              <span className="text-3xl font-black text-orange-500">{todayActive}</span>
            </div>
            <div className="bg-white dark:bg-[#151b2c] p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-center items-center">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">ช่วยเหลือสำเร็จวันนี้</span>
              <span className="text-3xl font-black text-emerald-500">{todayCompleted}</span>
            </div>
          </div>
        </Card>

        {/* KPI Section */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">สถิติภาพรวมทั้งหมด</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-white dark:bg-[#151b2c] border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:border-gray-300">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">เคสทั้งหมด</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{reportStats.total}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 shadow-sm rounded-2xl print:shadow-none print:border-emerald-300">
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">ช่วยเหลือสำเร็จ</h3>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{reportStats.completed}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50 shadow-sm rounded-2xl print:shadow-none print:border-orange-300">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">กำลังดำเนินการ</h3>
            <p className="text-3xl font-black text-orange-600 dark:text-orange-500">{reportStats.inProgress}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-sm rounded-2xl print:shadow-none print:border-blue-300">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">อัตราความสำเร็จ</h3>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-500">{reportStats.successRate}%</p>
          </Card>
        </div>

        {/* Triage Bar Chart */}
        <Card className="p-6 bg-white dark:bg-[#151b2c] border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm print:shadow-none print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">สัดส่วนระดับความเสี่ยง (AI Triage Breakdown)</h2>
          <div className="space-y-5">
            {[5, 4, 3, 2, 1].map(level => {
              const key = `l${level}` as keyof typeof reportStats;
              const count = reportStats[key] as number;
              const percentage = reportStats.total > 0 ? (count / reportStats.total) * 100 : 0;
              return (
                <div key={level} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{getTriageLabel(level)}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{count} เคส <span className="text-gray-400 font-normal ml-1">({percentage.toFixed(1)}%)</span></span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getTriageColor(level)}`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Data Export Hub Section */}
        <div className="mt-8 mb-24 md:mb-10 bg-white dark:bg-[#111c35] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>🖨️</span> เครื่องมือส่งออกข้อมูล (Data Export Hub)
            </h3>
            <p className="text-sm text-slate-500 mt-1">ดาวน์โหลดข้อมูลดิบเพื่อนำไปทำรายงานหรือวิเคราะห์ต่อ</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกประเภทข้อมูลที่ต้องการส่งออก (Export)</label>
              {role === 'admin' ? (
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="1. รายงานเชิงปฏิบัติการ (Operational)">
                    <option value="cases">รายการเคสทั้งหมด (Cases)</option>
                    <option value="safe">รายชื่อผู้ปลอดภัย (Safe Reports)</option>
                  </optgroup>
                  <optgroup label="2. รายงานเพื่อการตรวจสอบ (Audit & Compliance)">
                    <option value="users">รายชื่อผู้ใช้งานและอาสาสมัคร (Users)</option>
                    <option value="logs">ประวัติการทำงานระบบ (Activity Logs)</option>
                  </optgroup>
                </select>
              ) : (
                <div className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
                  รายการเคสทั้งหมด (Cases)
                </div>
              )}
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:bg-green-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {isExporting ? 'กำลังโหลด...' : 'Export Excel (CSV)'}
            </button>
            
            <button 
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Export PDF / พิมพ์
            </button>

            <button 
              onClick={() => setIsEmailModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              ส่งออกผ่านอีเมล
            </button>
          </div>
        </div>

      </div>

      {/* Email Export Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1a233a] rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                ส่งรายงานผ่านอีเมล
              </h2>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">ถึง (To) <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  value={emailData.to}
                  onChange={e => setEmailData({...emailData, to: e.target.value})}
                  placeholder="director@agency.go.th"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">สำเนา (CC)</label>
                <input 
                  type="text" 
                  value={emailData.cc}
                  onChange={e => setEmailData({...emailData, cc: e.target.value})}
                  placeholder="อีเมลผู้เกี่ยวข้องอื่นๆ (คั่นด้วยลูกน้ำ)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">หัวข้อเรื่อง (Subject)</label>
                <input 
                  type="text" 
                  value={emailData.subject}
                  onChange={e => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">รูปแบบไฟล์แนบ</label>
                <select 
                  value={emailData.attachment}
                  onChange={e => setEmailData({...emailData, attachment: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF (รายงานสรุปรูปภาพ)</option>
                  <option value="csv">CSV (ข้อมูลตาราง Excel)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  * ข้อมูลที่ถูกแนบจะอ้างอิงจากตัวกรองวันที่ 
                  {startDate && endDate ? ` (${startDate} ถึง ${endDate})` : ' (ทั้งหมด)'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSendEmail}
                disabled={isSendingEmail || !emailData.to}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-blue-400 flex items-center gap-2"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังส่ง...
                  </>
                ) : 'ส่งรายงาน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
