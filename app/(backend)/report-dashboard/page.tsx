'use client';
import React, { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function ReportDashboardPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleExportCSV = () => {
    try {
      const headers = [
        "รหัสอ้างอิง", 
        "วัน-เวลาที่แจ้งเหตุ", 
        "ประเภทความช่วยเหลือ", 
        "ระดับความรุนแรง", 
        "สถานะ", 
        "ละติจูด", 
        "ลองจิจูด", 
        "ชื่อผู้แจ้ง", 
        "เบอร์ติดต่อ", 
        "ผู้เข้าช่วยเหลือ", 
        "หน่วยกู้ภัย"
      ];
      
      const csvContent = [
        headers.join(','),
        ...cases.map(c => {
          const caseId = c.case_number ? `CAS-${String(c.case_number).padStart(3, '0')}` : `CAS-${c.id.substring(0, 5)}`;
          const timestamp = c.createdAt ? new Date(c.createdAt).toLocaleString('th-TH') : 
                            (c.created_at ? new Date(c.created_at).toLocaleString('th-TH') : '');
          
          const rescueUnit = (c.volunteer_rescue_unit && c.volunteer_rescue_unit !== "0") ? c.volunteer_rescue_unit : 
                             ((c.rescuer_unit && c.rescuer_unit !== "0") ? c.rescuer_unit : '-');
          
          const volunteerName = (c.assigned_volunteer_name && c.assigned_volunteer_name !== "0") ? c.assigned_volunteer_name : 
                                ((c.rescuer_name && c.rescuer_name !== "0") ? c.rescuer_name : '-');
          
          const phone = (c.phone && c.phone !== "0") ? c.phone : 
                        ((c.contactPhone && c.contactPhone !== "0") ? c.contactPhone : '-');
          
          const name = (c.reporter_name && c.reporter_name !== "0") ? c.reporter_name : 
                       ((c.name && c.name !== "0") ? c.name : 
                       ((c.contactName && c.contactName !== "0") ? c.contactName : 'ไม่ระบุ'));

          const severityText = getTriageLabel(Number(c.severity) || 1);
          
          return [
            caseId,
            `"${timestamp.replace(/,/g, '')}"`,
            `"${c.type || 'ไม่ระบุ'}"`,
            `"${severityText}"`,
            `"${c.status || 'รอการช่วยเหลือ'}"`,
            c.latitude || '',
            c.longitude || '',
            `"${name}"`,
            `"${phone}"`,
            `"${volunteerName}"`,
            `"${rescueUnit}"`
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `OonJai_Master_Report_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน');
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-8 pb-32 print:w-full print:max-w-none print:py-0 print:space-y-6">
        
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

        {/* Bottom Action */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full justify-center mt-8">
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto px-6 py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 print:hidden"
          >
            📥 ดาวน์โหลดรายงานสรุปผล (CSV)
          </button>
          <button 
            onClick={() => window.print()} 
            className="w-full sm:w-auto px-6 py-3.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-bold rounded-xl shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 print:hidden"
          > 
            🖨️ พิมพ์รายงานสรุปผล (PDF) 
          </button>
        </div>

      </div>
    </>
  );
}
