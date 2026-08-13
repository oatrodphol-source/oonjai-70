'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/backend/DashboardHeader';
import { HeatmapView } from '@/components/backend/HeatmapView';
import { Button } from '@/components/ui/Button';
import { Download, Loader2, X, Filter, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isPendingCase, isActiveCase } from '@/lib/caseUtils';

export default function HeatmapPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [time, setTime] = useState('all');
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Active Only vs Total History toggle
  const [activeOnly, setActiveOnly] = useState(true);

  // Tactical quick filter: 'all' | 'critical' | 'vulnerable' | 'unassigned'
  const [quickFilter, setQuickFilter] = useState<'all' | 'critical' | 'vulnerable' | 'unassigned'>('all');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data, error } = await supabase.from('cases').select('*');
        if (error) throw error;

        const fetchedCases: any[] = [];
        (data || []).forEach(docData => {
          if (docData.latitude && docData.longitude) {
            const rawStatus = docData.status || 'pending';
            const isActive = isActiveCase(rawStatus);

            fetchedCases.push({
              id: docData.case_number ? `CAS-${String(docData.case_number).padStart(3, '0')}` : `CAS-${String(docData.id).substring(0, 5)}`,
              severity: Number(docData.severity) || 1,
              type: docData.type || 'ไม่ระบุ',
              latitude: Number(docData.latitude),
              longitude: Number(docData.longitude),
              status: rawStatus,
              isActive: isActive,
              name: docData.name || docData.reporter_name || 'ผู้แจ้งเหตุ',
              phone: docData.phone || docData.contact_phone || docData.tel || '-',
              details: docData.details || '',
              bedridden: Number(docData.bedridden) === 1 || docData.bedridden === true || docData.details?.includes('ติดเตียง'),
              elderly: Number(docData.elderly) === 1 || docData.elderly === true || docData.details?.includes('สูงอายุ') || docData.details?.includes('เด็ก'),
              peopleCount: Number(docData.peopleCount) || Number(docData.people_count) || 1,
              water_level: docData.water_level || docData.waterLevel || '',
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

  // Compute live active vs total stats from Supabase
  const stats = useMemo(() => {
    const baseCases = activeOnly ? cases.filter(c => c.isActive) : cases;

    const activeCount = cases.filter(c => c.isActive).length;
    const totalCount = cases.length;

    const sosCriticalCount = baseCases.filter(c => Number(c.severity) === 5).length;
    const vulnerableCount = baseCases.filter(c => c.bedridden || c.elderly).length;
    const unassignedCount = baseCases.filter(c => isPendingCase(c.status)).length;

    return { activeCount, totalCount, sosCriticalCount, vulnerableCount, unassignedCount };
  }, [cases, activeOnly]);

  const now = Date.now();

  // Exact live case counts for every filter button in the Modal
  const filterCounts = useMemo(() => {
    const baseCases = activeOnly ? cases.filter(c => c.isActive) : cases;

    return {
      all: baseCases.length,
      level5: baseCases.filter(c => Number(c.severity) === 5).length,
      level4: baseCases.filter(c => Number(c.severity) === 4).length,
      level3: baseCases.filter(c => Number(c.severity) === 3).length,
      level2: baseCases.filter(c => Number(c.severity) === 2).length,
      level1: baseCases.filter(c => Number(c.severity) === 1).length,
      vulnerable: baseCases.filter(c => c.bedridden || c.elderly).length,
      unassigned: baseCases.filter(c => isPendingCase(c.status)).length,
      time24h: baseCases.filter(c => (now - c.timestamp) <= 24 * 60 * 60 * 1000).length,
      time7d: baseCases.filter(c => (now - c.timestamp) <= 7 * 24 * 60 * 60 * 1000).length,
      timeMonth: baseCases.filter(c => (now - c.timestamp) <= 30 * 24 * 60 * 60 * 1000).length,
    };
  }, [cases, activeOnly, now]);

  const filteredCases = cases.filter(c => {
    // Active only toggle
    if (activeOnly && !c.isActive) return false;

    // Tactical quick filter
    if (quickFilter === 'critical' && Number(c.severity) !== 5) return false;
    if (quickFilter === 'vulnerable' && !c.bedridden && !c.elderly) return false;
    if (quickFilter === 'unassigned' && c.status !== 'pending' && c.status !== 'รอดำเนินการ') return false;

    // Severity filter
    if (severityFilter !== 'all') {
      if (String(c.severity) !== severityFilter) return false;
    }
    
    // Time filter
    if (time !== 'all') {
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
      const headers = ['รหัสอ้างอิง', 'ผู้แจ้งเหตุ', 'เบอร์โทร', 'วัน-เวลาที่แจ้งเหตุ', 'ประเภทความช่วยเหลือ', 'ระดับความรุนแรง', 'สถานะการดำเนินการ', 'ละติจูด', 'ลองจิจูด', 'ผู้เข้าช่วยเหลือ'];
      
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
          `"${c.name}"`,
          `"${c.phone}"`,
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
      <DashboardHeader title="แผนที่ความร้อน" />
      <main className="flex flex-col w-full h-[calc(100dvh-140px)] md:h-[calc(100dvh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-900 pb-32 md:pb-10">
        
        {/* Top Tactical Command Header Bar */}
        <div className="bg-white dark:bg-[#111c35] px-3 py-2 border-b border-gray-200 dark:border-gray-800 z-[12] shadow-sm flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Active vs Total Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveOnly(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeOnly ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
              >
                🔴 รอกู้ภัย ({stats.activeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${!activeOnly ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
              >
                📜 สะสมทั้งหมด ({stats.totalCount})
              </button>
            </div>

            {/* Export Report & Filter Modal Toggle */}
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${severityFilter !== 'all' || time !== 'all' || quickFilter !== 'all' ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-400/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>ตัวกรอง</span>
                {(severityFilter !== 'all' || time !== 'all' || quickFilter !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                )}
              </button>

              <button 
                type="button"
                onClick={handleExport}
                disabled={exporting || loadingCases}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Rescuer Filter Pills */}
          <div className="grid grid-cols-3 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setQuickFilter(quickFilter === 'critical' ? 'all' : 'critical')}
              className={`px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border transition-all truncate ${quickFilter === 'critical' ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400/50' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'}`}
            >
              <span>🔴 วิกฤตหนัก</span>
              <span className="bg-red-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">{stats.sosCriticalCount}</span>
              {quickFilter === 'critical' && <span className="text-[10px]">✖</span>}
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter(quickFilter === 'vulnerable' ? 'all' : 'vulnerable')}
              className={`px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border transition-all truncate ${quickFilter === 'vulnerable' ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/50' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'}`}
            >
              <span>🛏️ เปราะบาง</span>
              <span className="bg-purple-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">{stats.vulnerableCount}</span>
              {quickFilter === 'vulnerable' && <span className="text-[10px]">✖</span>}
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter(quickFilter === 'unassigned' ? 'all' : 'unassigned')}
              className={`px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 border transition-all truncate ${quickFilter === 'unassigned' ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/50' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'}`}
            >
              <span>⏳ รอทีมกู้ภัย</span>
              <span className="bg-amber-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">{stats.unassignedCount}</span>
              {quickFilter === 'unassigned' && <span className="text-[10px]">✖</span>}
            </button>
          </div>
        </div>

        {/* Mobile Filter Popup / Bottom Sheet Modal */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="fixed inset-0" 
              onClick={() => setIsFilterOpen(false)} 
            />
            <div className="bg-white dark:bg-[#111c35] w-full max-w-lg rounded-t-3xl p-5 shadow-2xl border-t border-gray-100 dark:border-gray-800 z-[10001] animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚙️</span> ตัวกรองข้อมูลแผนที่ความร้อน (Heatmap)
                </h3>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Mode Filter */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  1. สถานะเคส (จากฐานข้อมูล Supabase)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveOnly(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${activeOnly ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                  >
                    🔴 เฉพาะเคสรอกู้ภัย ({stats.activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOnly(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${!activeOnly ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                  >
                    📜 สะสมทั้งหมด ({stats.totalCount})
                  </button>
                </div>
              </div>

              {/* Severity Level Filter with Exact Color Badges & Counts */}
              <div className="space-y-2 mb-5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  2. ระดับความรุนแรง / ความเสี่ยง (ตรงตามสีหมุดแผนที่)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'ทุกระดับความรุนแรง', value: 'all', count: filterCounts.all, activeClass: 'bg-slate-800 text-white border-slate-800' },
                    { label: '🔴 วิกฤตหนัก (5)', value: '5', count: filterCounts.level5, activeClass: 'bg-red-600 text-white border-red-600' },
                    { label: '🟠 เสี่ยงรุนแรง (4)', value: '4', count: filterCounts.level4, activeClass: 'bg-orange-600 text-white border-orange-600' },
                    { label: '🟡 ปานกลาง (3)', value: '3', count: filterCounts.level3, activeClass: 'bg-yellow-500 text-slate-950 border-yellow-500 font-black' },
                    { label: '🔵 เฝ้าระวัง (2)', value: '2', count: filterCounts.level2, activeClass: 'bg-blue-600 text-white border-blue-600' },
                    { label: '🟢 ปลอดภัย (1)', value: '1', count: filterCounts.level1, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                  ].map((opt, i) => (
                    <button 
                      key={`severity-${i}`}
                      type="button"
                      onClick={() => setSeverityFilter(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${severityFilter === opt.value ? `${opt.activeClass} shadow-md ring-2 ring-slate-400/40` : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${severityFilter === opt.value ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range Filter with Case Counts */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                  3. ช่วงเวลาที่รับเรื่อง
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'ทุกเวลา', value: 'all', count: filterCounts.all },
                    { label: '24 ชั่วโมงล่าสุด', value: '24h', count: filterCounts.time24h },
                    { label: '7 วันล่าสุด', value: '7d', count: filterCounts.time7d },
                    { label: 'เดือนนี้', value: 'month', count: filterCounts.timeMonth },
                  ].map((opt, i) => (
                    <button 
                      key={`time-${i}`}
                      type="button"
                      onClick={() => setTime(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${time === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${time === opt.value ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply / Reset Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5"
                  onClick={() => {
                    setSeverityFilter('all');
                    setTime('all');
                    setQuickFilter('all');
                    setActiveOnly(true);
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างตัวกรอง</span>
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 py-3 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
                  onClick={() => setIsFilterOpen(false)}
                >
                  ตกลงแสดงผล ({filteredCases.length} เคส)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap View Area */}
        <div className="flex-1 w-full h-full relative z-0">
          <HeatmapView filteredCases={filteredCases} loading={loadingCases} />
        </div>
      </main>
    </>
  );
}
