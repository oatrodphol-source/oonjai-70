'use client';
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';

export default function ReportDashboardPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('cases');
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cases'), (snapshot) => {
      const fetchedCases: any[] = [];
      snapshot.forEach(docSnap => {
        fetchedCases.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCases(fetchedCases);
      setLoading(false);
    });
    return () => unsub();
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

  const totalCases = cases.length;
  const completedCases = cases.filter(c => COMPLETED_STATUSES.includes(c.status)).length;
  const activeCases = totalCases - completedCases;
  const successRate = totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(1) : "0.0";

  const today = new Date().toISOString().split('T')[0];
  const todayCases = cases.filter(c => {
    const d = c.created_at || c.createdAt;
    return d && d.startsWith(today);
  });
  const todayTotal = todayCases.length;
  const todayCompleted = todayCases.filter(c => COMPLETED_STATUSES.includes(c.status)).length;
  const todayActive = todayTotal - todayCompleted;

  const triageCounts = {
    5: cases.filter(c => Number(c.severity) === 5).length,
    4: cases.filter(c => Number(c.severity) === 4).length,
    3: cases.filter(c => Number(c.severity) === 3).length,
    2: cases.filter(c => Number(c.severity) === 2).length,
    1: cases.filter(c => Number(c.severity) === 1 || !c.severity).length,
  };

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

      let q = query(collection(db, targetCollection));

      if (startDate && endDate) {
        const startIso = new Date(`${startDate}T00:00:00`).toISOString();
        const endIso = new Date(`${endDate}T23:59:59`).toISOString();
        q = query(collection(db, targetCollection), where(dateField, '>=', startIso), where(dateField, '<=', endIso));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('ไม่มีข้อมูลในช่วงเวลาที่เลือก');
        setIsExporting(false);
        return;
      }

      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalCases}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 shadow-sm rounded-2xl print:shadow-none print:border-emerald-300">
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">ช่วยเหลือสำเร็จ</h3>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{completedCases}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50 shadow-sm rounded-2xl print:shadow-none print:border-orange-300">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">กำลังดำเนินการ</h3>
            <p className="text-3xl font-black text-orange-600 dark:text-orange-500">{activeCases}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center items-center text-center bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-sm rounded-2xl print:shadow-none print:border-blue-300">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">อัตราความสำเร็จ</h3>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-500">{successRate}%</p>
          </Card>
        </div>

        {/* Triage Bar Chart */}
        <Card className="p-6 bg-white dark:bg-[#151b2c] border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm print:shadow-none print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">สัดส่วนระดับความเสี่ยง (AI Triage Breakdown)</h2>
          <div className="space-y-5">
            {[5, 4, 3, 2, 1].map(level => {
              const count = triageCounts[level as keyof typeof triageCounts];
              const percentage = totalCases > 0 ? (count / totalCases) * 100 : 0;
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
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกประเภทข้อมูล</label>
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
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ตั้งแต่วันที่</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ถึงวันที่</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
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
          </div>
        </div>

      </div>
    </>
  );
}
