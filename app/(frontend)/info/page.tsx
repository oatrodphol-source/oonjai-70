'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Phone, CheckCircle2, Clock, MapPin, Building2, ShieldPlus, Package } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/lib/supabase';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, destinationFilter, sourceFilter]);

  const completedStatuses = ["resolved", "completed"];
  
  const resolvedCases = evacuees.filter(c => {
      // 1. Check if status string implies completion
      const currentStatus = c.status || "";
      const hasCompletedStatus = completedStatuses.some(s => currentStatus.includes(s));
      
      // 2. MUST have an assigned volunteer (Reject ghost cases)
      const hasVolunteer = Boolean(c.volunteer_id); 
      
      return hasCompletedStatus && hasVolunteer;
  });

  // Combining evacuees (system cases) and safeList (manual reports)
  const allSafePeople = [
    ...resolvedCases.map(c => ({
      type: 'case',
      id: c.id,
      name: c.name,
      destination: c.destination || 'ปลอดภัยแล้ว',
      timestamp: c.timestamp,
      helper: c.volunteer_name === 'แจ้งด้วยตนเอง' ? 'แจ้งด้วยตนเอง' : `${c.volunteer_name || 'ไม่ระบุชื่อ'} (${c.assigned_volunteer_unit || 'ไม่ระบุหน่วยงาน'})`
    })),
    ...safeList.map(s => ({
      type: 'external',
      id: s.id,
      name: s.name,
      destination: s.destination || 'พื้นที่ปลอดภัย',
      timestamp: s.timestamp ? new Date(s.timestamp).getTime() : 0,
      helper: s.agency || 'แจ้งด้วยตนเอง' // Fallback to 'แจ้งด้วยตนเอง' for safe_reports
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
          .limit(20);
        if (error) throw error;
        setSafeList((data || []).map(d => ({ ...d, id: String(d.id) })));
      } catch (err) {
        console.warn('⚠️ ข้ามการโหลดรายงาน (ดึงข้อมูลไม่สำเร็จ):', err);
      }
    };
    fetchSafeReports();
    const channel = supabase.channel('realtime-info-safe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safe_reports' }, async (payload) => {
        console.log('🔄 ข้อมูลผู้ปลอดภัยมีการเปลี่ยนแปลง:', payload.eventType);
        // ดึงข้อมูลใหม่จาก DB ทันที (Refetch)
        const { data } = await supabase.from('safe_reports').select('*').order('timestamp', { ascending: false }).limit(20);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, async (payload) => {
        console.log('🔄 ข้อมูลสถิติเคสมีการเปลี่ยนแปลง:', payload.eventType);
        // ดึงข้อมูลใหม่จาก DB ทันที (Refetch)
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

      // waiting
      if (['pending', 'in_progress', 'wait'].includes(status)) {
        pendingCount++;
      } 
      
      // success
      if (['resolved', 'completed'].includes(status)) {
        completedCount++;
      }

      // evacuation and hospital board
      if (['resolved', 'completed'].includes(status) && (data.destination || '').trim() !== '') {
        const dest = data.destination || '';
        if (dest.includes('ศูนย์พักพิง')) shelterCount++;
        if (dest.includes('โรงพยาบาล') || dest.includes('แพทย์')) hospitalCount++;
        
        let displayName = data.reporter_name || data.name || "ผู้ประสบภัย";
        const referenceId = data.case_number ? `CAS-${String(data.case_number).padStart(3, '0')}` : `CAS-${docId.substring(0, 5)}`;
        
        if (displayName.includes("SOS User") || displayName === "ผู้ประสบภัย" || (!data.reporter_name && !data.name)) {
            const phone = data.phone || "";
            if (phone.length >= 4) {
                displayName = `ผู้ประสบภัย (เบอร์: 0XX-XXX-${phone.slice(-4)})`;
            } else {
                displayName = `ผู้ประสบภัย (รหัส: ${referenceId})`;
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
    { name: 'เจ็บป่วยฉุกเฉิน', number: '1669', color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
    { name: 'ปภ. (บรรเทาสาธารณภัย)', number: '1784', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
    { name: 'กฟภ. (แจ้งไฟฟ้าขัดข้อง)', number: '1129', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
    { name: 'เหตุด่วนเหตุร้าย', number: '191', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
    { name: 'ตำรวจทางหลวง', number: '1193', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' },
    { name: 'กรมทางหลวงชนบท', number: '1146', color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 pb-32 pt-24 sm:px-6 mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">ภาพรวมสถานการณ์</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ข้อมูลแบบเรียลไทม์จากศูนย์อุ่นใจ</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
        <div className="w-full min-w-0 h-full bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <Clock className="w-8 h-8 text-orange-500 mb-2 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-500">{stats.pendingCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-orange-800 dark:text-orange-400 mt-1">รอการช่วยเหลือ</p>
        </div>
        
        <div className="w-full min-w-0 h-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 hidden sm:block" />
          <h3 className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-500">{stats.completedCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-green-800 dark:text-green-400 mt-1">ช่วยเหลือสำเร็จ</p>
        </div>

        {/* Shelter */}
        <div className="w-full min-w-0 h-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <span className="text-3xl mb-1 hidden sm:block">🏠</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-500">{stats.shelterCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-blue-800 dark:text-blue-400 mt-1">ศูนย์พักพิง</p>
        </div>

        {/* Hospital */}
        <div className="w-full min-w-0 h-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm overflow-hidden min-h-[100px] sm:min-h-[120px]">
          <span className="text-3xl mb-1 hidden sm:block">🏥</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-500">{stats.hospitalCount}</h3>
          <p className="whitespace-normal break-words text-center text-xs sm:text-sm w-full leading-tight font-semibold text-red-800 dark:text-red-400 mt-1">โรงพยาบาล/หน่วยแพทย์</p>
        </div>
      </div>

      {/* Safe Persons Board */}
      <div className="pt-2">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          🛡️ ข้อมูลรายชื่อผู้ปลอดภัย
        </h3>
        
        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-6 bg-white dark:bg-[#151b2c] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสอ้างอิง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-green-500 outline-none dark:text-white dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 transition-all font-medium"
              />
            </div>
            <div className="w-full sm:w-72 shrink-0">
              <select 
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-green-500 outline-none dark:text-white border border-gray-200 dark:border-gray-700 font-medium transition-all"
              >
                <option value="all">แหล่งที่มา: ทั้งหมด</option>
                <option value="case">แหล่งที่มา: รายชื่อล่าสุด (จากอาสา)</option>
                <option value="external">แหล่งที่มา: รายชื่อภายนอก</option>
                <option value="self">แหล่งที่มา: แจ้งด้วยตนเอง</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setDestinationFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                destinationFilter === 'all' 
                  ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              📋 ทั้งหมด
            </button>
            <button
              onClick={() => setDestinationFilter('hospital')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                destinationFilter === 'hospital' 
                  ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              🏥 โรงพยาบาล
            </button>
            <button
              onClick={() => setDestinationFilter('shelter')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                destinationFilter === 'shelter' 
                  ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              🏡 ศูนย์พักพิง
            </button>
            <button
              onClick={() => setDestinationFilter('supplies')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                destinationFilter === 'supplies' 
                  ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800/50 dark:text-orange-400' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              📦 รับถุงยังชีพ
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        {paginatedSafePeople.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSafePeople.map((person, idx) => (
                <div key={`${person.type}-${person.id}-${idx}`} className="bg-white dark:bg-[#151b2c] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600 mt-1">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{person.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(person.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    {person.type === 'external' && (
                      <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap flex-shrink-0">
                        ข้อมูลภายนอก
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-sm space-y-2 mt-auto border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm leading-tight">
                        <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">จุดหมาย:</span> 
                        {person.destination}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldPlus className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm leading-tight">
                        <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">ช่วยเหลือโดย:</span> 
                        {person.helper}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 pb-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#151b2c] text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  ก่อนหน้า
                </button>
                
                <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 flex-shrink-0 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                            currentPage === page 
                              ? 'bg-green-600 text-white border border-green-600' 
                              : 'bg-white dark:bg-[#151b2c] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2 text-gray-400 flex items-center">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-[#151b2c] text-gray-700 dark:text-gray-300 shadow-sm"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151b2c] rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
            <ShieldPlus className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {searchTerm || destinationFilter !== 'all' ? 'ไม่พบรายชื่อที่ตรงกับเงื่อนไข' : 'ยังไม่มีข้อมูลผู้ปลอดภัย'}
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm || destinationFilter !== 'all' ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองดูอีกครั้ง' : 'ข้อมูลจะปรากฏขึ้นเมื่อมีการบันทึกการช่วยเหลือเสร็จสิ้น'}
            </p>
          </div>
        )}
      </div>

      {/* Emergency Numbers Grid */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">เบอร์โทรฉุกเฉิน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {emergencyNumbers.map((item, index) => (
            <a 
              key={index}
              href={`tel:${item.number}`}
              className="flex items-center gap-3 p-4 bg-white dark:bg-[#151b2c] border border-gray-50 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md active:scale-95 active:bg-gray-50 dark:active:bg-gray-800 transition-all cursor-pointer"
            >
              <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.name}</p>
                <p className="font-black text-gray-900 dark:text-white">{item.number}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
