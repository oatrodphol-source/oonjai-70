'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { HeatmapView } from '@/components/backend/HeatmapView';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HeatmapPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [time, setTime] = useState('all');
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*');
        if (error) throw error;

        const fetchedCases: any[] = [];
        (data || []).forEach(docData => {
          if (docData.latitude && docData.longitude) {
            fetchedCases.push({
              id: docData.case_number ? `CAS-${String(docData.case_number).padStart(3, '0')}` : `CAS-${String(docData.id).substring(0, 5)}`,
              severity: Number(docData.severity) || 1,
              type: docData.type || 'ไม่ระบุ',
              latitude: docData.latitude,
              longitude: docData.longitude,
              status: docData.status || 'pending',
              details: docData.details || '',
              timestamp: docData.created_at ? new Date(docData.created_at).getTime() : Date.now(),
              rawDate: docData.created_at || new Date().toISOString(),
              assigned_volunteer: docData.assigned_volunteer_name || docData.rescuer_name || '-'
            });
          }
        });
        setCases(fetchedCases);
        setLoadingCases(false);
      } catch (err) {
        console.error('Error fetching map data:', err);
        setLoadingCases(false);
      }
    };

    fetchCases();

    const channel = supabase
      .channel('custom-heatmap-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);
  const filteredCases = cases.filter(c => {
    // Severity filter
    if (severityFilter !== 'all') {
      if (String(c.severity) !== severityFilter) return false;
    }
    
    // Time filter
    if (time !== 'all') {
      /* now */
      const diffHour = (now - c.timestamp) / (1000 * 60 * 60);
      if (time === '24h' && diffHour > 24) return false;
      if (time === '7d' && diffHour > 24 * 7) return false;
      if (time === 'month' && diffHour > 24 * 30) return false;
    }
    return true;
  });

  const handleExport = () => {
    setExporting(true);
    try {
      const headers = ['รหัสอ้างอิง', 'วัน-เวลาที่แจ้งเหตุ', 'ประเภทความช่วยเหลือ', 'ระดับความรุนแรง', 'สถานะการดำเนินการ', 'ละติจูด', 'ลองจิจูด', 'ผู้เข้าช่วยเหลือ (ถ้ามี)'];
      
      const getSeverityText = (level: number) => {
        switch (level) {
          case 5: return 'พื้นที่เสี่ยงวิกฤต (ระดับ 5)';
          case 4: return 'พื้นที่เสี่ยงรุนแรง (ระดับ 4)';
          case 3: return 'พื้นที่เสี่ยงปานกลาง (ระดับ 3)';
          case 2: return 'พื้นที่เฝ้าระวัง (ระดับ 2)';
          case 1: default: return 'พื้นที่ปลอดภัย/ทั่วไป (ระดับ 1)';
        }
      };

      const csvContent = [
        headers.join(','),
        ...filteredCases.map(c => [
          c.id,
          new Date(c.timestamp).toLocaleString('th-TH').replace(/,/g, ''),
          `"${c.type === 'sos' ? 'SOS ด่วน' : c.type}"`,
          `"${getSeverityText(c.severity)}"`,
          `"${c.status}"`,
          c.latitude,
          c.longitude,
          `"${c.assigned_volunteer}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `OonJai_Flood_Report_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  return (
    <>
      <DashboardHeader title="แผนที่ความร้อน (Heatmap)" />
      <main className="flex flex-col w-full h-[calc(100dvh-140px)] md:h-[calc(100dvh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-900 pb-32 md:pb-10">
        
        {/* Mobile Filter Toggle */}
        <div className="md:hidden bg-white dark:bg-[#111c35] p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-[11] shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="text-lg">🗺️</span> แผนที่ความร้อน
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 border-orange-200 text-orange-600 bg-orange-50"
          >
            ⚙️ ตัวกรอง {severityFilter !== 'all' || time !== 'all' ? '(เปิดใช้งาน)' : ''}
          </Button>
        </div>

        {/* Control Panel (Collapsible on Mobile, Visible on Desktop) */}
        <div className={`${isFilterOpen ? 'flex' : 'hidden'} md:flex bg-white dark:bg-[#111c35] p-3 shadow-sm z-[10] flex-col gap-3 shrink-0 w-full max-w-[100vw] overflow-hidden absolute md:relative top-[60px] md:top-0 left-0 border-b border-gray-100 dark:border-gray-800`}>
        <div className="flex justify-between items-center px-1">
          <h2 className="hidden md:block text-sm font-bold text-slate-800 dark:text-white">ตัวกรองข้อมูล</h2>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 ml-auto md:ml-0"
            onClick={handleExport}
            disabled={exporting || loadingCases}
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span className="text-xs">{exporting ? 'กำลังส่งออก...' : 'ส่งออกรายงาน'}</span>
          </Button>
        </div>
        
        <div className="flex w-full overflow-x-auto snap-x gap-2 hide-scrollbar pb-1">
          {[
            { label: 'ทุกระดับความรุนแรง', value: 'all' },
            { label: 'วิกฤต (5)', value: '5' },
            { label: 'รุนแรง (4)', value: '4' },
            { label: 'ปานกลาง (3)', value: '3' },
            { label: 'เฝ้าระวัง (2)', value: '2' },
            { label: 'ปลอดภัย (1)', value: '1' },
          ].map((opt, i) => (
            <button 
              key={`severity-${i}`}
              onClick={() => setSeverityFilter(opt.value)}
              className={`snap-start shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${severityFilter === opt.value ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-slate-50 dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        <div className="flex w-full overflow-x-auto snap-x gap-2 hide-scrollbar pb-1">
          {[
            { label: 'ทุกเวลา', value: 'all' },
            { label: '24 ชั่วโมง', value: '24h' },
            { label: '7 วัน', value: '7d' },
            { label: 'เดือนนี้', value: 'month' },
          ].map((opt, i) => (
            <button 
              key={`time-${i}`}
              onClick={() => setTime(opt.value)}
              className={`snap-start shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${time === opt.value ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-slate-50 dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0 w-full min-h-0">
        <HeatmapView filteredCases={filteredCases} loading={loadingCases} />
      </div>
      
    </main>
    </>
  );
}
