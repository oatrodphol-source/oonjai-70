'use client';

import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, Clock, MapPin, Building2, ShieldPlus, Search, ShieldCheck, UserCheck, LayoutList, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { isPendingCase, isCompletedCase, isShelterDestination, isHospitalDestination } from '@/lib/caseUtils';

export default function InfoPage() {
  const [stats, setStats] = useState<{
    pendingCount: number;
    completedCount: number;
    shelterCount: number;
    hospitalCount: number;
  }>({
    pendingCount: 0,
    completedCount: 0,
    shelterCount: 0,
    hospitalCount: 0,
  });

  const [evacuees, setEvacuees] = useState<any[]>([]);
  const [safeList, setSafeList] = useState<any[]>([]);
  const [rawCases, setRawCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'compact' | 'cards'>('compact');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, destinationFilter, sourceFilter]);

  const completedStatuses = ["resolved", "completed"];

  const resolvedCases = evacuees.filter(c => {
    const currentStatus = c.status || "";
    const hasCompletedStatus = completedStatuses.some(s => currentStatus.includes(s));
    const hasVolunteer = Boolean(c.volunteer_id);
    return hasCompletedStatus && hasVolunteer;
  });

  // Combining evacuees (system cases) and safeList (manual reports)
  const allSafePeople = [
    ...resolvedCases.map(c => ({
      type: 'case',
      id: c.id,
      name: c.name,
      destination: c.destination || 'พื้นที่ปลอดภัยแล้ว',
      timestamp: c.timestamp,
      helper: c.volunteer_name === 'แจ้งด้วยตนเอง' ? 'แจ้งด้วยตนเอง' : `${c.volunteer_name || 'ไม่ระบุชื่อ'} (${c.assigned_volunteer_unit || 'ไม่ระบุหน่วยงาน'})`
    })),
    ...safeList.map(s => ({
      type: 'external',
      id: s.id,
      name: s.name,
      destination: s.destination || 'พื้นที่ปลอดภัย',
      timestamp: s.timestamp ? new Date(s.timestamp).getTime() : 0,
      helper: s.agency || 'แจ้งด้วยตนเอง'
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  const filteredSafePeople = allSafePeople.filter((person) => {
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'self' && (!person.helper?.includes('แจ้งด้วยตนเอง') && (person as any).volunteer_id !== 'self-reported')) return false;
      if (sourceFilter === 'case' && (person.type !== 'case' || person.helper?.includes('แจ้งด้วยตนเอง') || (person as any).volunteer_id === 'self-reported')) return false;
      if (sourceFilter === 'external' && person.type !== 'external') return false;
    }
    if (destinationFilter === 'hospital' && !person.destination?.includes('โรงพยาบาล') && !person.destination?.includes('แพทย์')) return false;
    if (destinationFilter === 'shelter' && !person.destination?.includes('ศูนย์พักพิง')) return false;
    if (destinationFilter === 'supplies' && !person.destination?.includes('ถุงยังชีพ')) return false;

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      const matchName = person.name.toLowerCase().includes(searchLower);
      const matchId = String(person.id).toLowerCase().includes(searchLower);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredSafePeople.length / itemsPerPage);
  const paginatedSafePeople = filteredSafePeople.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const fetchSafeReports = async () => {
      try {
        const { data, error } = await supabase
          .from('safe_reports')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(30);
        if (error) throw error;
        setSafeList((data || []).map(d => ({ ...d, id: String(d.id) })));
      } catch (err) {
        console.warn('⚠️ ข้ามการโหลดรายงาน (ดึงข้อมูลไม่สำเร็จ):', err);
      }
    };
    fetchSafeReports();
    const channel = supabase.channel('realtime-info-safe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_reports' }, async () => {
        const { data } = await supabase.from('safe_reports').select('*').order('timestamp', { ascending: false }).limit(30);
        if (data) {
          setSafeList(data.map(d => ({ ...d, id: String(d.id) })));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const { data: snapshot, error } = await supabase.from('cases').select('*');
        if (error) throw error;
        setRawCases(snapshot || []);
        setLoading(false);
      } catch (err) {
        console.warn('⚠️ ข้ามการโหลดสถิติ (ดึงข้อมูลไม่สำเร็จ):', err);
        setLoading(false);
      }
    };
    fetchCases();
    const channel = supabase.channel('realtime-info-cases')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, async () => {
        const { data } = await supabase.from('cases').select('*');
        if (data) {
          setRawCases(data);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let pendingCount = 0;
    let completedCount = 0;
    let shelterCount = 0;
    let hospitalCount = 0;

    const evacueesList: any[] = [];

    rawCases.forEach(data => {
      const docId = String(data.id);
      const status = data.status || '';

      if (isPendingCase(status)) pendingCount++;
      if (isCompletedCase(status)) completedCount++;

      if (isCompletedCase(status) && (data.destination || '').trim() !== '') {
        const dest = data.destination || '';
        if (isShelterDestination(dest)) shelterCount++;
        if (isHospitalDestination(dest)) hospitalCount++;

        let displayName = (data.name && !data.name.startsWith("U")) ? data.name : ((data.reporter_name && !data.reporter_name.startsWith("U")) ? data.reporter_name : "ผู้ใช้ LINE");
        const referenceId = data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docId.substring(0, 5)}`;

        if (displayName.includes("SOS User") || displayName === "ผู้ประสบภัย" || displayName === "ผู้ใช้ LINE") {
          const phone = data.phone || "";
          if (phone.length >= 4 && phone !== '-') {
            displayName = `ผู้ประสบภัย (เบอร์: 0XX-XXX-${phone.slice(-4)})`;
          } else if (data.name && !data.name.startsWith("U")) {
            displayName = data.name;
          } else {
            displayName = `ผู้ใช้ LINE (${referenceId})`;
          }
        }

        evacueesList.push({
          id: referenceId,
          name: displayName,
          status: status,
          destination: data.destination || null,
          volunteer_id: data.volunteer_id || data.volunteer_name || data.rescuer_name || null,
          volunteer_name: data.volunteer_name || null,
          assigned_volunteer_unit: data.assigned_volunteer_unit || null,
          timestamp: data.updated_at ? new Date(data.updated_at).getTime() : (data.created_at ? new Date(data.created_at).getTime() : Date.now()),
        });
      }
    });

    evacueesList.sort((a, b) => b.timestamp - a.timestamp);

    setStats({
      pendingCount,
      completedCount,
      shelterCount,
      hospitalCount
    });
    setEvacuees(evacueesList);
  }, [rawCases]);

  const emergencyNumbers = [
    { name: 'เจ็บป่วยฉุกเฉิน', number: '1669', color: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400' },
    { name: 'ปภ. (บรรเทาสาธารณภัย)', number: '1784', color: 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400' },
    { name: 'กฟภ. (แจ้งไฟฟ้าขัดข้อง)', number: '1129', color: 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400' },
    { name: 'เหตุด่วนเหตุร้าย', number: '191', color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' },
    { name: 'ตำรวจทางหลวง', number: '1193', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' },
    { name: 'กรมทางหลวงชนบท', number: '1146', color: 'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400' },
  ];

  // Helper function to render explicit destination badges with clear icons & colors
  const renderDestinationBadge = (dest?: string) => {
    const text = dest || 'พื้นที่ปลอดภัย';
    const isHospital = text.includes('โรงพยาบาล') || text.includes('แพทย์');
    const isShelter = text.includes('ศูนย์พักพิง');

    if (isHospital) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap">
          <ShieldPlus className="w-3.5 h-3.5" />
          <span>โรงพยาบาล / หน่วยแพทย์</span>
        </span>
      );
    } else if (isShelter) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap">
          <Building2 className="w-3.5 h-3.5" />
          <span>ศูนย์พักพิง</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{text}</span>
        </span>
      );
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-4xl overflow-x-hidden px-3 sm:px-6 pb-28 pt-20 sm:pt-24 mx-auto space-y-5">

      {/* Header Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-wide">
          ภาพรวมสถานการณ์
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          ข้อมูลการช่วยเหลือเรียลไทม์จากศูนย์กู้ภัยอุ่นใจ
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full">
        <div className="bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <Clock className="w-6 h-6 text-orange-500 mb-1 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{stats.pendingCount}</h3>
          <p className="text-xs font-extrabold text-orange-800 dark:text-orange-400 mt-0.5">รอการช่วยเหลือ</p>
        </div>

        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.completedCount}</h3>
          <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 mt-0.5">ช่วยเหลือสำเร็จ</p>
        </div>

        <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <Building2 className="w-6 h-6 text-blue-500 mb-1 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{stats.shelterCount}</h3>
          <p className="text-xs font-extrabold text-blue-800 dark:text-blue-400 mt-0.5">ศูนย์พักพิง</p>
        </div>

        <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
          <ShieldPlus className="w-6 h-6 text-red-500 mb-1 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{stats.hospitalCount}</h3>
          <p className="text-xs font-extrabold text-red-800 dark:text-red-400 mt-0.5">โรงพยาบาล/แพทย์</p>
        </div>
      </div>

      {/* Safe Persons Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            รายชื่อผู้ปลอดภัย ({filteredSafePeople.length})
          </h3>

          {/* View Mode Toggle Button */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-[#0b1325] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="มุมมองตารางกระชับ (ลดการเลื่อน)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตาราง</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-[#0b1325] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">การ์ด</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col gap-3 mb-4 bg-white dark:bg-[#0b1325] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800/80 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรือ รหัสอ้างอิง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-xs sm:text-sm outline-none focus:border-[#ff6600] border border-gray-200 dark:border-gray-700 font-medium transition-colors"
              />
            </div>
            <div className="w-full sm:w-60 shrink-0">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-xs sm:text-sm outline-none focus:border-[#ff6600] border border-gray-200 dark:border-gray-700 font-semibold transition-colors"
              >
                <option value="all">แหล่งที่มา: ทั้งหมด</option>
                <option value="case">ล่าสุดจากทีมอาสา</option>
                <option value="external">ข้อมูลจากภายนอก</option>
                <option value="self">แจ้งด้วยตนเอง</option>
              </select>
            </div>
          </div>

          {/* Quick Destination Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setDestinationFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border cursor-pointer ${
                destinationFilter === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              ทั้งหมด ({filteredSafePeople.length})
            </button>

            <button
              onClick={() => setDestinationFilter('hospital')}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                destinationFilter === 'hospital'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <ShieldPlus className="w-3.5 h-3.5 text-red-500" />
              โรงพยาบาล
            </button>

            <button
              onClick={() => setDestinationFilter('shelter')}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                destinationFilter === 'shelter'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              ศูนย์พักพิง
            </button>

            <button
              onClick={() => setDestinationFilter('supplies')}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1 ${
                destinationFilter === 'supplies'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              รับถุงยังชีพ
            </button>
          </div>
        </div>

        {/* View Mode 1: Compact Table List (Reduces Scrolling on Mobile!) */}
        {paginatedSafePeople.length > 0 ? (
          viewMode === 'compact' ? (
            <div className="bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {paginatedSafePeople.map((person, idx) => {
                  const personKey = `${person.type}-${person.id}-${idx}`;
                  const isExpanded = expandedId === personKey;

                  return (
                    <div 
                      key={personKey}
                      className="p-3 sm:px-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : personKey)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <UserCheck className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                {person.name}
                              </h4>
                              {person.type === 'external' && (
                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-black shrink-0">
                                  ภายนอก
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {new Date(person.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>

                        {/* Explicit Destination Badge */}
                        <div className="shrink-0">
                          {renderDestinationBadge(person.destination)}
                        </div>

                        <button className="text-gray-400 p-1 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expandable Helper Detail */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-gray-50/80 dark:bg-gray-800/40 p-2.5 rounded-xl">
                          <span className="font-semibold text-gray-500 dark:text-gray-400">
                            หน่วยงานผู้ช่วยเหลือ: <strong className="text-gray-900 dark:text-white">{person.helper}</strong>
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            รหัสรายการ: #{person.id}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* View Mode 2: Card Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedSafePeople.map((person, idx) => (
                <div key={`${person.type}-${person.id}-${idx}`} className="bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                        {person.name}
                      </h4>
                      {person.type === 'external' && (
                        <span className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-black shrink-0">
                          ภายนอก
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">
                      {new Date(person.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {renderDestinationBadge(person.destination)}
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                    ช่วยเหลือโดย: <strong className="text-gray-800 dark:text-gray-200">{person.helper}</strong>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-[#0b1325] rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center shadow-sm">
            <ShieldPlus className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-1">
              ไม่พบรายชื่อที่ตรงกับเงื่อนไข
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองดูอีกครั้ง
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#0b1325] text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              ก่อนหน้า
            </button>

            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2">
              หน้า {currentPage} จาก {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#0b1325] text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>

      {/* Emergency Phone Numbers Grid */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white mb-3">
          เบอร์โทรสายด่วนฉุกเฉิน
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {emergencyNumbers.map((item, index) => (
            <a
              key={index}
              href={`tel:${item.number}`}
              className="flex items-center gap-2.5 p-3 bg-white dark:bg-[#0b1325] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-[#ff6600] active:scale-95 transition-all cursor-pointer"
            >
              <div className={`w-8 h-8 ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold truncate">{item.name}</p>
                <p className="font-black text-xs sm:text-sm text-gray-900 dark:text-white">{item.number}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
